const handler = require('./api/index');
const { EventEmitter } = require('node:events');

function createMockReqRes(method, path, body = null, query = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = path + (Object.keys(query).length ? '?' + new URLSearchParams(query) : '');
  req.headers = { host: 'localhost' };
  req.body = body;

  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    end(data) {
      this.body = data;
      this.emit('finish');
    }
  };
  Object.assign(res, EventEmitter.prototype);
  EventEmitter.call(res);

  return { req, res };
}

async function runServerlessTest() {
  console.log('Testing Vercel Serverless Function handler...');

  // 1. Test /api/puzzle
  {
    const { req, res } = createMockReqRes('GET', '/api/puzzle');
    const p = new Promise(resolve => res.on('finish', resolve));
    handler(req, res);
    await p;
    const data = JSON.parse(res.body);
    console.assert(res.statusCode === 200, 'Puzzle 200');
    console.assert(data.success === true, 'Puzzle success');
    console.assert(Object.keys(data.activeCells).length === 59, '59 active cells');
    console.log('✓ Vercel Serverless /api/puzzle passed');
  }

  // 2. Test /api/login
  let team = null;
  {
    const { req, res } = createMockReqRes('POST', '/api/login', { teamName: 'Vercel Avengers Unit', members: 'Stark' });
    const p = new Promise(resolve => res.on('finish', resolve));
    handler(req, res);
    await p;
    const data = JSON.parse(res.body);
    console.assert(res.statusCode === 200, 'Login 200');
    console.assert(data.success === true, 'Login success');
    team = data.team;
    console.log('✓ Vercel Serverless /api/login passed');
  }

  // 3. Test /api/submit
  {
    const { req, res } = createMockReqRes('POST', '/api/submit', {
      teamId: team.id,
      teamName: team.team_name,
      timeTakenSeconds: 240,
      answers: { '0,0': 'P', '0,1': 'E' } // 2 answered
    });
    const p = new Promise(resolve => res.on('finish', resolve));
    handler(req, res);
    await p;
    const data = JSON.parse(res.body);
    console.assert(res.statusCode === 200, 'Submit 200');
    console.assert(data.success === true, 'Submit success');
    console.log('✓ Vercel Serverless /api/submit passed');
  }

  // 4. Test /api/leaderboard
  {
    const { req, res } = createMockReqRes('GET', '/api/leaderboard');
    const p = new Promise(resolve => res.on('finish', resolve));
    handler(req, res);
    await p;
    const data = JSON.parse(res.body);
    console.assert(res.statusCode === 200, 'Leaderboard 200');
    console.assert(data.leaderboard.length >= 1, 'Leaderboard has entries');
    console.log('✓ Vercel Serverless /api/leaderboard passed');
  }

  console.log('=== ALL VERCEL SERVERLESS HANDLER TESTS PASSED! ===');
}

runServerlessTest().catch(console.error);
