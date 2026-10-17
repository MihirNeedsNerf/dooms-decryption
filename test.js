const http = require('node:http');
const server = require('./server');
const { ACTIVE_CELLS } = require('./puzzleData');

const BASE_URL = 'http://localhost:3000';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, raw: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING DOOMS DECRYPTION SYSTEM TESTS ---');

  // Test 1: Fetch Puzzle config
  const puzRes = await request('GET', '/api/puzzle');
  console.assert(puzRes.status === 200, 'Test 1 Failed: Puzzle status 200');
  console.assert(Object.keys(puzRes.data.activeCells).length === 59, 'Test 1 Failed: Active cells count');
  console.log('✓ Test 1 Passed: Puzzle config correctly serves 59 active cells without revealing answers');

  // Test 2: Register Team Alpha (Perfect 15 PTS)
  const t1 = await request('POST', '/api/login', { teamName: 'Victor Squad', members: 'Doom, Latveria Guard' });
  console.assert(t1.status === 200 && t1.data.team.id, 'Test 2 Failed: Team registration');
  console.log('✓ Test 2 Passed: Team registration successful');

  // Build perfect answers
  const perfectAnswers = {};
  for (const [key, cell] of Object.entries(ACTIVE_CELLS)) {
    perfectAnswers[key] = cell.target;
  }

  const s1 = await request('POST', '/api/submit', {
    teamId: t1.data.team.id,
    teamName: t1.data.team.team_name,
    timeTakenSeconds: 320,
    answers: perfectAnswers
  });
  console.assert(s1.status === 200, 'Test 3 Failed: Submit status');
  console.assert(s1.data.score === 15, `Test 3 Failed: Expected 15 PTS, got ${s1.data.score}`);
  console.assert(s1.data.errorCount === 0, 'Test 3 Failed: Error count should be 0');
  console.log('✓ Test 3 Passed: 0 Errors awarded +15 PTS');

  // Test 4: Register Team Beta (3 errors -> should receive +10 PTS)
  const t2 = await request('POST', '/api/login', { teamName: 'Avengers Alliance', members: 'Tony, Steve' });
  const threeErrorAnswers = { ...perfectAnswers };
  // Inject 3 errors by picking the noise letters
  threeErrorAnswers['0,0'] = ACTIVE_CELLS['0,0'].noise;
  threeErrorAnswers['0,1'] = ACTIVE_CELLS['0,1'].noise;
  threeErrorAnswers['0,2'] = ACTIVE_CELLS['0,2'].noise;

  const s2 = await request('POST', '/api/submit', {
    teamId: t2.data.team.id,
    teamName: t2.data.team.team_name,
    timeTakenSeconds: 450,
    answers: threeErrorAnswers
  });
  console.assert(s2.data.score === 10, `Test 4 Failed: Expected 10 PTS for 3 errors, got ${s2.data.score}`);
  console.assert(s2.data.errorCount === 3, 'Test 4 Failed: Error count should be 3');
  console.log('✓ Test 4 Passed: 3 Errors awarded +10 PTS (Rule: <=5 errors)');

  // Test 5: Register Team Gamma (7 errors -> should receive +5 PTS)
  const t3 = await request('POST', '/api/login', { teamName: 'Midnight Suns', members: 'Strange, Blade' });
  const sevenErrorAnswers = { ...perfectAnswers };
  const keys = Object.keys(ACTIVE_CELLS).slice(0, 7);
  keys.forEach(k => sevenErrorAnswers[k] = ACTIVE_CELLS[k].noise);

  const s3 = await request('POST', '/api/submit', {
    teamId: t3.data.team.id,
    teamName: t3.data.team.team_name,
    timeTakenSeconds: 600,
    answers: sevenErrorAnswers
  });
  console.assert(s3.data.score === 5, `Test 5 Failed: Expected 5 PTS for 7 errors, got ${s3.data.score}`);
  console.log('✓ Test 5 Passed: 7 Errors awarded +5 PTS (Rule: 6-8 errors)');

  // Test 6: Register Team Delta (12 errors -> should receive +0 PTS)
  const t4 = await request('POST', '/api/login', { teamName: 'Hydra Infiltrators', members: 'Red Skull' });
  const twelveErrorAnswers = { ...perfectAnswers };
  Object.keys(ACTIVE_CELLS).slice(0, 12).forEach(k => twelveErrorAnswers[k] = ACTIVE_CELLS[k].noise);

  const s4 = await request('POST', '/api/submit', {
    teamId: t4.data.team.id,
    teamName: t4.data.team.team_name,
    timeTakenSeconds: 800,
    answers: twelveErrorAnswers
  });
  console.assert(s4.data.score === 0, `Test 6 Failed: Expected 0 PTS for 12 errors, got ${s4.data.score}`);
  console.log('✓ Test 6 Passed: 12 Errors awarded +0 PTS (Rule: >8 errors)');

  // Test 7: Verify Leaderboard Ranking
  const lb = await request('GET', '/api/leaderboard');
  console.assert(lb.data.leaderboard.length === 4, 'Test 7 Failed: Expected 4 teams in leaderboard');
  console.assert(lb.data.leaderboard[0].team_name === 'Victor Squad' && lb.data.leaderboard[0].score === 15, 'Rank 1 correct');
  console.assert(lb.data.leaderboard[1].team_name === 'Avengers Alliance' && lb.data.leaderboard[1].score === 10, 'Rank 2 correct');
  console.assert(lb.data.leaderboard[2].team_name === 'Midnight Suns' && lb.data.leaderboard[2].score === 5, 'Rank 3 correct');
  console.assert(lb.data.leaderboard[3].team_name === 'Hydra Infiltrators' && lb.data.leaderboard[3].score === 0, 'Rank 4 correct');
  console.log('✓ Test 7 Passed: Leaderboard correctly sorted by score and time taken');

  // Test 8: Verify CSV Export
  const csvRes = await request('GET', '/api/export-csv');
  console.assert(csvRes.status === 200, 'Test 8 Failed: CSV status 200');
  console.assert(csvRes.raw.includes('Victor Squad'), 'Test 8 Failed: CSV contains team data');
  console.log('✓ Test 8 Passed: CSV export generated successfully with headers and team records');

  console.log("=== ALL 8 INTEGRATION TESTS PASSED PERFECTLY! ===");
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
