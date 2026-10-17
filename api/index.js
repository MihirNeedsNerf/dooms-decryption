const url = require('node:url');
const { WORDS, ACTIVE_CELLS, calculateScore, TOTAL_ACTIVE_CELLS, TIME_LIMIT_SECONDS } = require('../puzzleData');
const { registerOrLoginTeam, getTeamStatus, recordSubmission, getLeaderboard } = require('../db');

function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

module.exports = async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  try {
    // POST /api/login
    if (req.method === 'POST' && pathname.endsWith('/login')) {
      const body = await parseBody(req);
      const { teamName, members } = body;
      if (!teamName || !teamName.trim()) {
        return sendJson(res, 400, { success: false, error: 'Team name is required.' });
      }
      const result = registerOrLoginTeam(teamName, members || '');
      return sendJson(res, 200, {
        success: true,
        team: result.team,
        alreadySubmitted: result.alreadySubmitted,
        submission: result.submission
      });
    }

    // GET /api/status
    if (req.method === 'GET' && pathname.endsWith('/status')) {
      const teamId = Number(parsedUrl.query.teamId);
      if (!teamId) {
        return sendJson(res, 400, { success: false, error: 'Valid teamId required' });
      }
      const status = getTeamStatus(teamId);
      if (!status) {
        return sendJson(res, 404, { success: false, error: 'Team not found' });
      }
      return sendJson(res, 200, { success: true, ...status });
    }

    // GET /api/puzzle
    if (req.method === 'GET' && pathname.endsWith('/puzzle')) {
      const clientCells = {};
      for (const [key, val] of Object.entries(ACTIVE_CELLS)) {
        clientCells[key] = { tl: val.tl, br: val.br };
      }
      return sendJson(res, 200, {
        success: true,
        activeCells: clientCells,
        words: WORDS.map(w => ({ id: w.id, length: w.word.length, dir: w.dir, row: w.row, col: w.col })),
        totalActive: TOTAL_ACTIVE_CELLS,
        timeLimitSeconds: TIME_LIMIT_SECONDS
      });
    }

    // POST /api/submit
    if (req.method === 'POST' && pathname.endsWith('/submit')) {
      const body = await parseBody(req);
      const { teamId, teamName, timeTakenSeconds, answers } = body;

      if (!teamId || !answers) {
        return sendJson(res, 400, { success: false, error: 'teamId and answers are required.' });
      }

      const teamStatus = getTeamStatus(teamId);
      if (!teamStatus) {
        return sendJson(res, 404, { success: false, error: 'Team not found.' });
      }
      if (teamStatus.submission) {
        return sendJson(res, 400, {
          success: false,
          error: 'Team has already submitted answers.',
          submission: teamStatus.submission
        });
      }

      let correctCount = 0;
      let errorCount = 0;
      const breakdown = {};

      for (const [key, cell] of Object.entries(ACTIVE_CELLS)) {
        const playerChosen = (answers[key] || '').toUpperCase().trim();
        const isCorrect = (playerChosen === cell.target);

        if (isCorrect) {
          correctCount++;
        } else {
          errorCount++;
        }

        breakdown[key] = {
          chosen: playerChosen || null,
          target: cell.target,
          correct: isCorrect
        };
      }

      const score = calculateScore(errorCount);
      const validTimeTaken = Math.min(Math.max(Number(timeTakenSeconds) || 0, 1), TIME_LIMIT_SECONDS);

      const saved = recordSubmission({
        teamId: Number(teamId),
        teamName: teamStatus.team.team_name,
        score,
        errorCount,
        correctCount,
        timeTakenSeconds: validTimeTaken,
        answersJson: JSON.stringify(answers)
      });

      return sendJson(res, 200, {
        success: true,
        score,
        errorCount,
        correctCount,
        totalActive: TOTAL_ACTIVE_CELLS,
        timeTakenSeconds: validTimeTaken,
        breakdown,
        officialAnswerWords: WORDS.map(w => w.word)
      });
    }

    // GET /api/leaderboard
    if (req.method === 'GET' && pathname.endsWith('/leaderboard')) {
      const rows = getLeaderboard();
      return sendJson(res, 200, { success: true, leaderboard: rows });
    }

    // GET /api/export-csv
    if (req.method === 'GET' && pathname.endsWith('/export-csv')) {
      const rows = getLeaderboard();
      let csv = 'Rank,Team Name,Members,Score,Errors,Correct Cells,Time Taken (MM:SS),Submitted At\n';
      rows.forEach((r, idx) => {
        const mins = Math.floor(r.time_taken_seconds / 60);
        const secs = (r.time_taken_seconds % 60).toString().padStart(2, '0');
        const timeFormatted = `${mins}:${secs}`;
        const membersEscaped = `"${(r.members || '').replace(/"/g, '""')}"`;
        const nameEscaped = `"${(r.team_name || '').replace(/"/g, '""')}"`;
        csv += `${idx + 1},${nameEscaped},${membersEscaped},${r.score},${r.error_count},${r.correct_count},${timeFormatted},${r.submitted_at}
`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="dooms_decryption_leaderboard.csv"');
      res.statusCode = 200;
      return res.end(csv);
    }

    return sendJson(res, 404, { success: false, error: 'Endpoint not found' });
  } catch (err) {
    console.error('API Error:', err);
    return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
};
