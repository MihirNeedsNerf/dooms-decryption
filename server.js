const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const { WORDS, ACTIVE_CELLS, calculateScore, TOTAL_ACTIVE_CELLS, TIME_LIMIT_SECONDS } = require('./puzzleData');
const { registerOrLoginTeam, getTeamStatus, recordSubmission, getLeaderboard } = require('./db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/])+/, '');
  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security check: ensure path is within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Access denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  try {
    // API: Team Login / Register
    if (req.method === 'POST' && pathname === '/api/login') {
      const body = await parseJsonBody(req);
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

    // API: Team Status
    if (req.method === 'GET' && pathname === '/api/status') {
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

    // API: Public Puzzle Definition (Without revealing targets to client!)
    if (req.method === 'GET' && pathname === '/api/puzzle') {
      // Return competing pairs without the answer key
      const clientCells = {};
      for (const [key, val] of Object.entries(ACTIVE_CELLS)) {
        clientCells[key] = { tl: val.tl, br: val.br };
      }
      return sendJson(res, 200, {
        success: true,
        activeCells: clientCells,
        
        totalActive: TOTAL_ACTIVE_CELLS,
        timeLimitSeconds: TIME_LIMIT_SECONDS
      });
    }

    // API: Submit Game Results
    if (req.method === 'POST' && pathname === '/api/submit') {
      const body = await parseJsonBody(req);
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

      // Validate answers against ACTIVE_CELLS
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

      // Calculate score based on official event rules:
      // All correct: +15 PTS
      // <= 5 errors: +10 PTS
      // 6 to 8 errors: +5 PTS
      // > 8 errors: +0 PTS
      const score = calculateScore(errorCount);
      const validTimeTaken = Math.min(Math.max(Number(timeTakenSeconds) || 0, 1), TIME_LIMIT_SECONDS);

      // Save to database
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
        timeLimitSeconds: TIME_LIMIT_SECONDS
      });
    }

    // API: Live Leaderboard
    if (req.method === 'GET' && pathname === '/api/leaderboard') {
      const rows = getLeaderboard();
      return sendJson(res, 200, { success: true, leaderboard: rows });
    }

    // API: Export CSV
    if (req.method === 'GET' && pathname === '/api/export-csv') {
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

      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="dooms_decryption_leaderboard.csv"'
      });
      return res.end(csv);
    }

    // Default: Static File Serving
    serveStatic(req, res, pathname);

  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`[Doom's Decryption] Server active at http://localhost:${PORT}`);
});

module.exports = server;
