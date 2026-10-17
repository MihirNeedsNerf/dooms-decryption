const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Determine writable DB path
const isVercel = !!process.env.VERCEL;
const dbDir = isVercel ? os.tmpdir() : __dirname;
const DB_SQLITE_PATH = path.join(dbDir, 'dooms_decryption.db');
const DB_JSON_PATH = path.join(dbDir, 'dooms_decryption_data.json');

let dbMode = 'sqlite';
let sqliteDb = null;

// Attempt to use built-in node:sqlite
try {
  const { DatabaseSync } = require('node:sqlite');
  sqliteDb = new DatabaseSync(DB_SQLITE_PATH);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_name TEXT UNIQUE NOT NULL,
      members TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      team_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      error_count INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      time_taken_seconds INTEGER NOT NULL,
      answers_json TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(team_id) REFERENCES teams(id)
    );
  `);
  dbMode = 'sqlite';
} catch (err) {
  // Fallback to JSON file storage (guaranteed to work across all Node versions on Vercel)
  dbMode = 'json';
}

// In-Memory / JSON File fallback implementation
function loadJsonStore() {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      return JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf-8'));
    }
  } catch (e) {}
  return { teams: [], submissions: [] };
}

function saveJsonStore(data) {
  try {
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // If filesystem is completely locked, data remains in-memory for the function lifetime
  }
}

let memoryStore = loadJsonStore();

function registerOrLoginTeam(teamName, members = '') {
  const cleanName = teamName.trim();
  if (!cleanName) throw new Error('Team name is required');

  if (dbMode === 'sqlite' && sqliteDb) {
    const existing = sqliteDb.prepare('SELECT * FROM teams WHERE LOWER(team_name) = LOWER(?)').get(cleanName);
    if (existing) {
      const sub = sqliteDb.prepare('SELECT * FROM submissions WHERE team_id = ?').get(existing.id);
      return { team: existing, alreadySubmitted: !!sub, submission: sub || null };
    }
    const stmt = sqliteDb.prepare('INSERT INTO teams (team_name, members) VALUES (?, ?)');
    const res = stmt.run(cleanName, members.trim());
    const newTeam = { id: Number(res.lastInsertRowid), team_name: cleanName, members: members.trim() };
    return { team: newTeam, alreadySubmitted: false, submission: null };
  } else {
    memoryStore = loadJsonStore();
    const existing = memoryStore.teams.find(t => t.team_name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      const sub = memoryStore.submissions.find(s => s.team_id === existing.id);
      return { team: existing, alreadySubmitted: !!sub, submission: sub || null };
    }
    const newTeam = {
      id: memoryStore.teams.length + 1,
      team_name: cleanName,
      members: members.trim(),
      created_at: new Date().toISOString()
    };
    memoryStore.teams.push(newTeam);
    saveJsonStore(memoryStore);
    return { team: newTeam, alreadySubmitted: false, submission: null };
  }
}

function getTeamStatus(teamId) {
  const idNum = Number(teamId);
  if (dbMode === 'sqlite' && sqliteDb) {
    const team = sqliteDb.prepare('SELECT * FROM teams WHERE id = ?').get(idNum);
    if (!team) return null;
    const sub = sqliteDb.prepare('SELECT * FROM submissions WHERE team_id = ?').get(idNum);
    return { team, submission: sub || null };
  } else {
    memoryStore = loadJsonStore();
    const team = memoryStore.teams.find(t => t.id === idNum);
    if (!team) return null;
    const sub = memoryStore.submissions.find(s => s.team_id === idNum);
    return { team, submission: sub || null };
  }
}

function recordSubmission({ teamId, teamName, score, errorCount, correctCount, timeTakenSeconds, answersJson }) {
  const idNum = Number(teamId);
  if (dbMode === 'sqlite' && sqliteDb) {
    const existing = sqliteDb.prepare('SELECT * FROM submissions WHERE team_id = ?').get(idNum);
    if (existing) {
      throw new Error('This team has already submitted their results.');
    }
    const stmt = sqliteDb.prepare(`
      INSERT INTO submissions (team_id, team_name, score, error_count, correct_count, time_taken_seconds, answers_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(idNum, teamName, score, errorCount, correctCount, timeTakenSeconds, answersJson);
    return { id: Number(res.lastInsertRowid), score, errorCount, correctCount, timeTakenSeconds };
  } else {
    memoryStore = loadJsonStore();
    const existing = memoryStore.submissions.find(s => s.team_id === idNum);
    if (existing) {
      throw new Error('This team has already submitted their results.');
    }
    const newSub = {
      id: memoryStore.submissions.length + 1,
      team_id: idNum,
      team_name: teamName,
      score,
      error_count: errorCount,
      correct_count: correctCount,
      time_taken_seconds: timeTakenSeconds,
      answers_json: answersJson,
      submitted_at: new Date().toISOString()
    };
    memoryStore.submissions.push(newSub);
    saveJsonStore(memoryStore);
    return { id: newSub.id, score, errorCount, correctCount, timeTakenSeconds };
  }
}

function getLeaderboard() {
  if (dbMode === 'sqlite' && sqliteDb) {
    return sqliteDb.prepare(`
      SELECT 
        s.id,
        s.team_name,
        t.members,
        s.score,
        s.error_count,
        s.correct_count,
        s.time_taken_seconds,
        s.submitted_at
      FROM submissions s
      JOIN teams t ON s.team_id = t.id
      ORDER BY s.score DESC, s.time_taken_seconds ASC, s.submitted_at ASC
    `).all();
  } else {
    memoryStore = loadJsonStore();
    const rows = memoryStore.submissions.map(s => {
      const t = memoryStore.teams.find(team => team.id === s.team_id) || {};
      return {
        id: s.id,
        team_name: s.team_name,
        members: t.members || '',
        score: s.score,
        error_count: s.error_count,
        correct_count: s.correct_count,
        time_taken_seconds: s.time_taken_seconds,
        submitted_at: s.submitted_at
      };
    });
    // Sort by score DESC, then time_taken_seconds ASC
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.time_taken_seconds !== b.time_taken_seconds) return a.time_taken_seconds - b.time_taken_seconds;
      return new Date(a.submitted_at) - new Date(b.submitted_at);
    });
    return rows;
  }
}

module.exports = {
  dbMode,
  registerOrLoginTeam,
  getTeamStatus,
  recordSubmission,
  getLeaderboard
};
