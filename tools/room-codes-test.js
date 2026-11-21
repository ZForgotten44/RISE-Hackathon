#!/usr/bin/env node
/* tools/room-codes-test.js: every code a room server hands out must be accepted by /join. Starts the real room server,
   creates many rooms of each kind (Online friend for all 8 two-player games, every party game, Same Pond), and checks
   each code against room-codes.js (the rule /join uses), then looks it up the way /join does, typed in lowercase with
   spaces. Also checks the rule's format cases. Run: node tools/room-codes-test.js [roomsPerKind] */
'use strict';
const { spawn } = require('child_process'); const WebSocket = require('ws'); const assert = require('assert'); const path = require('path');
const CODES = require('../room-codes.js');
const N = +process.argv[2] || 120;
const PORT = 8950 + Math.floor(Math.random() * 40);
const srv = spawn(process.execPath, [path.join(__dirname, '../server/room-server.js'), String(PORT)], { env: Object.assign({}, process.env, { POND_STATE_FILE: 'off', PARTY_STATE_FILE: 'off' }), stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function client() {
  const ws = new WebSocket('ws://127.0.0.1:' + PORT), c = { ws, waiters: [] };
  ws.on('message', d => { const m = JSON.parse(d); c.waiters = c.waiters.filter(w => !w(m)); });
  c.ask = (msg, pred) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timed out after ' + msg.t)), 4000);
    c.waiters.push(m => { if (pred(m)) { clearTimeout(t); res(m); return true; } return false; }); ws.send(JSON.stringify(msg)); });
  c.open = new Promise(r => ws.on('open', r)); return c;
}
const FRIEND_GAMES = ['nim', 'domineering', 'pentago', 'notakto', 'toot', 'sim', 'gold', 'ult'];
const BOARD = { nim: { piles: ['1', '3', '5'] }, domineering: { rows: 5, cols: 5 }, gold: { n: 11, pens: [1, 3], gold: 6 } };   // the rest have defaults
const PARTY_GAMES = ['quack', 'explain', 'duckoff', 'wrongpond', 'normal', 'court', 'mafia'];
const spaced = c => c.toLowerCase().split('').join(' ');

(async () => {
  // the format rule on its own
  assert.deepStrictEqual(CODES.kindsOf('FKVL'), ['party', 'pond', 'trap', 'tail'], 'L is a party/pond/Duck Trap/Tail Thief consonant');
  assert.deepStrictEqual(CODES.kindsOf('K7M4PX'), ['friend']);
  assert.strictEqual(CODES.normalize('  fk vl '), 'FKVL'); assert.strictEqual(CODES.normalize('k7m-4px'), 'K7M4PX');
  assert.strictEqual(CODES.normalize('https://zfgames.org/duck-court?room=fkvl'), 'FKVL');
  for (const bad of ['', 'FKV', 'FKVLM', 'AEIO', 'K7M4PO', 'K7M4P1', 'KLMNPQ'.replace('K', 'L')]) assert.deepStrictEqual(CODES.kindsOf(CODES.normalize(bad)), [], 'rejects ' + bad);

  await sleep(600);
  const c = client(); await c.open; let n = 0; const seen = { friend: new Set(), party: new Set(), pond: new Set() };
  for (let i = 0; i < N; i++) {
    const game = FRIEND_GAMES[i % FRIEND_GAMES.length];
    const m = await c.ask(Object.assign({ t: 'create', game, nickname: 'Host' }, BOARD[game]), m => m.t === 'created' || m.t === 'error');
    assert.strictEqual(m.t, 'created', game + ' room was not created: ' + m.message);
    const code = m.state.code; assert(CODES.kindsOf(code).includes('friend'), 'friend code ' + code + ' fails the /join rule');
    const p = await c.ask({ t: 'preview', code: CODES.normalize(spaced(code)) }, m => m.t === 'previewResult' || m.t === 'error');
    assert.strictEqual(p.t, 'previewResult'); assert.strictEqual(p.game, game); seen.friend.add(code); n++;
  }
  for (let i = 0; i < N; i++) {
    const game = PARTY_GAMES[i % PARTY_GAMES.length], h = client(); await h.open;
    const m = await h.ask({ t: 'p:host-create', settings: { game, rounds: 1 } }, m => m.t === 'p:hosted' || m.t === 'p:error');
    assert.strictEqual(m.t, 'p:hosted', game + ' party was not created');
    const code = m.code; assert(CODES.kindsOf(code).includes('party'), 'party code ' + code + ' fails the /join rule');
    const p = await h.ask({ t: 'p:peek', code: CODES.normalize(spaced(code)) }, m => m.t === 'p:peeked');
    assert(p.found && p.gameId === game, 'party ' + code + ' not found by peek'); seen.party.add(code); n++; h.ws.close();
  }
  for (let i = 0; i < N; i++) {
    const h = client(); await h.open;
    const m = await h.ask({ t: 'sp:create', settings: { depth: 'light', rounds: 3 }, nick: 'Ann', attemptId: 'a' + i }, m => m.t === 'sp:joined' || m.t === 'sp:error');
    assert.strictEqual(m.t, 'sp:joined', 'pond was not created');
    const code = m.code; assert(CODES.kindsOf(code).includes('pond'), 'pond code ' + code + ' fails the /join rule');
    const p = await h.ask({ t: 'sp:peek', code: CODES.normalize(spaced(code)) }, m => m.t === 'sp:peeked');
    assert(p.found, 'pond ' + code + ' not found by peek'); seen.pond.add(code); n++; h.ws.close();
  }
  const withL = [...seen.party, ...seen.pond].filter(x => x.includes('L')).length;
  console.log(`room-codes-test: ${n} rooms created; every code passes the /join rule and is found when typed in lowercase with spaces (${withL} contained an L)`);
  srv.kill(); process.exit(0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
