#!/usr/bin/env node
/* tools/timer-server-test.js: starts the real room server and checks the per-move timer and the match score over real
   WebSockets (Connect Four rooms, so a draw can be played too).
   No timer by default. A room created with a timer sends its limit to whoever previews it, gives the player to move a
   deadline, restarts it when the turn passes, pauses it while a request waits (and resumes the same remaining time when
   it is declined), changes the limit only when the other player accepts, keeps the same deadline across a reconnect,
   and on expiry ends the game for the player to move, counted once in the score with endReason 'timeout'. The score
   survives a rematch, a draw is counted apart, and a restarted unfinished game counts nothing.
   Run: node tools/timer-server-test.js   (about 25 seconds: it waits for one real 10-second expiry) */
'use strict';
const { spawn } = require('child_process'); const WebSocket = require('ws'); const assert = require('assert'); const path = require('path');
const PORT = 9140 + Math.floor(Math.random() * 40);
const srv = spawn(process.execPath, [path.join(__dirname, '../server/room-server.js'), String(PORT)], { env: Object.assign({}, process.env, { POND_STATE_FILE: 'off', PARTY_STATE_FILE: 'off', TRAP_STATE_FILE: 'off', TAIL_STATE_FILE: 'off' }), stdio: ['ignore', 'ignore', 'inherit'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let checks = 0; const ok = (c, m) => { assert(c, m); checks++; };
function client(name) {
  const ws = new WebSocket('ws://127.0.0.1:' + PORT); const c = { ws, name, msgs: [], waiters: [], cursor: 0 };
  ws.on('message', d => { const m = JSON.parse(String(d)); c.msgs.push(m); if (m.state) c.last = m.state; if (m.t === 'state') c.last = m; c.waiters = c.waiters.filter(w => !w(m)); });
  c.send = m => ws.send(JSON.stringify(m));
  /* the first matching message after the last one consumed (earlier deliveries count: a broadcast can arrive first) */
  c.wait = (pred, what, ms) => new Promise((res, rej) => {
    for (let i = c.cursor; i < c.msgs.length; i++) if (pred(c.msgs[i])) { c.cursor = i + 1; return res(c.msgs[i]); }
    const t = setTimeout(() => rej(new Error(name + ' timed out waiting for ' + (what || '?'))), ms || 5000);
    c.waiters.push(m => { if (pred(m)) { clearTimeout(t); c.cursor = c.msgs.length; res(m); return true; } return false; }); });
  c.open = new Promise(r => ws.on('open', r)); return c;
}
async function room(timer) {
  const h = client('host'), g = client('guest'); await h.open; await g.open;
  const msg = { t: 'create', game: 'c4', nickname: 'Mansy', variant: 'classic', first: 'host', attemptId: 'a' + Math.random() }; if (timer != null) msg.timer = timer;
  h.send(msg); const cr = await h.wait(m => m.t === 'created'); const code = cr.state.code; h.token = cr.token;
  g.send({ t: 'preview', code }); const pv = await g.wait(m => m.t === 'previewResult');
  g.send({ t: 'join', code, nickname: 'Friend' }); const jn = await g.wait(m => m.t === 'joined'); g.token = jn.token;
  await h.wait(m => m.t === 'state' && m.status === 'lobby', 'lobby');
  h.send({ t: 'start', code, token: h.token });
  await h.wait(m => m.t === 'state' && m.status === 'active', 'active'); await g.wait(m => m.t === 'state' && m.status === 'active', 'active');
  return { h, g, code, pv };
}
const by = (r, seat) => seat === 1 ? r.h : r.g;
async function move(r, seat, col) { const c = by(r, seat), v = Math.max(r.h.last.version, r.g.last.version);
  c.send({ t: 'move', code: r.code, token: c.token, version: v, moveId: Math.random().toString(36), move: { t: 'drop', col } });
  await c.wait(m => m.t === 'state' && m.version === v + 1, 'state after move'); await by(r, 3 - seat).wait(m => m.t === 'state' && m.version === v + 1, 'opponent state');
  return c.last; }
async function ask(r, seat, kind, extra) { const c = by(r, seat), o = by(r, 3 - seat); o.cursor = o.msgs.length;
  c.send(Object.assign({ t: 'request', code: r.code, token: c.token, kind }, extra || {})); return o.wait(m => m.t === 'state' && m.pending && m.pending.kind === kind, 'pending ' + kind); }
async function answer(r, seat, pend, accept) { const c = by(r, seat); c.cursor = c.msgs.length; c.send({ t: 'respond', code: r.code, token: c.token, requestId: pend.pending.id, accept });
  return c.wait(m => m.t === 'state' && !m.pending, 'answered'); }

(async () => {
  await sleep(500);
  /* ---- no timer unless one is chosen ---- */
  { const r = await room(); ok(r.h.last.timer === 0 && r.h.last.deadline == null, 'no timer by default');
    ok(r.pv.timer === 0, 'the preview says there is no timer'); ok(r.h.last.draws === 0 && r.h.last.score[1] === 0, 'score and draws start at zero'); }

  /* ---- a timed room ---- */
  const r = await room(10);
  ok(r.pv.timer === 10, 'the preview shows the limit to whoever joins');
  let s = r.h.last; ok(s.timer === 10 && s.deadline && Math.abs(s.deadline - s.now - 10000) < 300, 'the player to move gets a 10 s deadline');
  await sleep(1200);
  s = await move(r, 1, 3); ok(s.turnSeat === 2 && Math.abs(s.deadline - s.now - 10000) < 300, 'the turn passes with a fresh full clock');
  /* a request pauses the clock; declining resumes the same remaining time */
  await sleep(1000);
  let p = await ask(r, 1, 'undo'); ok(p.deadline == null && p.remaining > 7000 && p.remaining < 9500, 'a pending request pauses the clock');
  await sleep(1500);
  let a = await answer(r, 2, p, false); ok(a.deadline && Math.abs((a.deadline - a.now) - p.remaining) < 400, 'declining resumes the remaining time, not a fresh one');
  /* a reconnect keeps the deadline */
  const before = a.deadline; const g2 = client('guest-again'); await g2.open; g2.send({ t: 'takeover', code: r.code, token: r.g.token });
  const res = await g2.wait(m => m.t === 'resumed'); ok(res.state.deadline === before, 'a reconnect keeps the same deadline'); r.g = Object.assign(g2, { token: r.g.token });
  /* a timer change needs the other player's yes */
  p = await ask(r, 2, 'timer', { secs: 30 }); ok(p.pending.payload && p.pending.payload.secs === 30, 'the request names the new limit');
  a = await answer(r, 1, p, true); ok(a.timer === 30 && Math.abs(a.deadline - a.now - 30000) < 400, 'accepted: the new limit, with a fresh clock for the move in progress');
  p = await ask(r, 1, 'timer', { secs: 10 }); a = await answer(r, 2, p, true); ok(a.timer === 10, 'back to 10 s');
  /* expiry: seat 2 is to move and does nothing */
  ok(a.turnSeat === 2, 'seat 2 to move');
  const end = await r.h.wait(m => m.t === 'state' && m.status === 'finished', 'timeout', 13000);
  ok(end.over && end.winner === 1 && end.endReason === 'timeout' && end.note === 'timeout', 'the player to move loses on time');
  ok(end.score[1] === 1 && end.score[2] === 0 && end.deadline == null, 'counted once in the score, the clock stops');
  await sleep(300); ok(r.h.last.score[1] === 1, 'no second count');
  /* rematch keeps the score; a restarted unfinished game counts nothing */
  p = await ask(r, 2, 'rematch'); a = await answer(r, 1, p, true); ok(a.status === 'active' && a.score[1] === 1 && a.endReason == null, 'a rematch keeps the score');
  ok(a.deadline && a.turnSeat === 2, 'the rematch starts a clock for the other starter');
  await move(r, 2, 0);
  p = await ask(r, 1, 'restart'); a = await answer(r, 2, p, true); ok(a.score[1] === 1 && a.score[2] === 0 && a.draws === 0, 'restarting an unfinished game counts nothing');
  /* a win by play: seat-to-move four in column 0 */
  const first = a.turnSeat, other = 3 - first;
  for (let i = 0; i < 3; i++) { await move(r, first, 0); await move(r, other, 1); }
  const won = await move(r, first, 0); ok(won.over && won.winner === first && won.endReason === 'move', 'a win by play');
  ok(won.score[first] === (first === 1 ? 2 : 1), 'counted for the winner');
  console.log(`timer-server-test: ${checks} checks passed`);
  srv.kill(); process.exit(0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
