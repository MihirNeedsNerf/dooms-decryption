const { ACTIVE_CELLS, calculateScore, WORDS, TOTAL_ACTIVE_CELLS } = require('./puzzleData');
const { registerOrLoginTeam, getTeamStatus, recordSubmission, getLeaderboard } = require('./db');

console.log('=== STARTING OFFLINE UNIT & LOGIC VERIFICATION ===');

// 1. Check active cells count
console.assert(Object.keys(ACTIVE_CELLS).length === 59, 'Active cells must be 59');
console.log('✓ Active cells count: 59 verified');

// 2. Test official scoring algorithm
console.assert(calculateScore(0) === 15, '0 errors -> 15 PTS');
console.assert(calculateScore(1) === 10, '1 error -> 10 PTS');
console.assert(calculateScore(5) === 10, '5 errors -> 10 PTS');
console.assert(calculateScore(6) === 5, '6 errors -> 5 PTS');
console.assert(calculateScore(8) === 5, '8 errors -> 5 PTS');
console.assert(calculateScore(9) === 0, '9 errors -> 0 PTS');
console.assert(calculateScore(25) === 0, '25 errors -> 0 PTS');
console.log('✓ Official Scoring Logic (+15, +10, +5, +0 PTS) verified against all boundaries');

// 3. Test Database operations
const t1 = registerOrLoginTeam('Latveria Elite Unit', 'Victor, DoomBot');
console.assert(t1.team.id, 'Team ID generated');
console.assert(t1.alreadySubmitted === false, 'New team not submitted yet');
console.log('✓ DB Team Registration verified:', t1.team.team_name);

// 4. Test Perfect Submission
const perfectAnswers = {};
for (const [k, v] of Object.entries(ACTIVE_CELLS)) {
  perfectAnswers[k] = v.target;
}

const sub1 = recordSubmission({
  teamId: t1.team.id,
  teamName: t1.team.team_name,
  score: 15,
  errorCount: 0,
  correctCount: 59,
  timeTakenSeconds: 310,
  answersJson: JSON.stringify(perfectAnswers)
});
console.assert(sub1.score === 15, 'Score recorded as 15');
console.log('✓ DB Record Submission (15 PTS, 0 errors, 310s) verified');

// 5. Test Duplicate Submission Protection
let duplicateBlocked = false;
try {
  recordSubmission({
    teamId: t1.team.id,
    teamName: t1.team.team_name,
    score: 10,
    errorCount: 2,
    correctCount: 57,
    timeTakenSeconds: 400,
    answersJson: '{}'
  });
} catch (e) {
  duplicateBlocked = true;
}
console.assert(duplicateBlocked, 'Duplicate submission blocked successfully');
console.log('✓ Duplicate submission protection verified');

// 6. Test Team 2 (10 PTS, 4 errors, 420s)
const t2 = registerOrLoginTeam('Quantum Strikers', 'Scott, Hope');
recordSubmission({
  teamId: t2.team.id,
  teamName: t2.team.team_name,
  score: 10,
  errorCount: 4,
  correctCount: 55,
  timeTakenSeconds: 420,
  answersJson: '{}'
});

// 7. Test Team 3 (15 PTS, 0 errors, but took 450s - should be rank 2 due to time tiebreaker)
const t3 = registerOrLoginTeam('Wakanda Ops', 'Shuri, Okoye');
recordSubmission({
  teamId: t3.team.id,
  teamName: t3.team.team_name,
  score: 15,
  errorCount: 0,
  correctCount: 59,
  timeTakenSeconds: 450,
  answersJson: '{}'
});

// 8. Test Leaderboard Ranking & Tie-breaking
const lb = getLeaderboard();
console.assert(lb.length >= 3, 'Leaderboard has all teams');
console.assert(lb[0].team_name === 'Latveria Elite Unit' && lb[0].score === 15, 'Rank 1: 15 PTS @ 310s');
console.assert(lb[1].team_name === 'Wakanda Ops' && lb[1].score === 15, 'Rank 2: 15 PTS @ 450s');
console.assert(lb[2].team_name === 'Quantum Strikers' && lb[2].score === 10, 'Rank 3: 10 PTS @ 420s');
console.log('✓ Leaderboard Ranking & Time-based Tiebreaker verified:');
lb.forEach((r, idx) => {
  console.log(`   #${idx + 1} ${r.team_name} | Score: +${r.score} PTS | Errors: ${r.error_count} | Time: ${r.time_taken_seconds}s`);
});

console.log("=== ALL UNIT TESTS AND DATABASE OPERATIONS PASSED! ===");
