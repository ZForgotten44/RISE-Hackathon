#!/usr/bin/env node
/* server/room-server.js — the authoritative server for "Online friend" rooms (Nim, Pentago, Notakto, TOOT & OTTO, Sim, The Gold Coin, Recursive Tic-Tac-Toe).
   Run locally:  node server/room-server.js [port]        (default 8787, or $PORT)
   The browser never decides who won or whether a move is legal; every one of those checks happens here, and only the
   accepted result is ever sent back. Rooms live in memory in this one process — enough for a first version and for a
   single small deployment (see README-ROOMS.md for what a second instance would need).

   Protocol: one WebSocket per connected tab, JSON messages, always {t:'...', ...}. See handlers below for the exact
   shape of each message type; client and server both live in this repo, so this file is the single source of truth.
   Game-specific rules (move validation, terminal/win detection, board setup) live in the RULES map near the top —
   everything else (seats, tokens, reconnect, pending undo/restart/rematch/customize requests, expiry, score) is one
   shared lifecycle shared by every game. This mirrors the client's own engines: kept independent on purpose, so the
   server never has to trust — or even load — the browser's game code. */
'use strict';
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const http = require('http');

const PORT = +process.argv[2] || +process.env.PORT || 8787;
const CODES = require('../room-codes.js'); // one code rule for making and joining rooms (/join reads the same file): no O/0, I/1, L
const UNJOINED_TTL = 30 * 60 * 1000;     // a room nobody joined disappears after this
const FINISHED_TTL = 20 * 60 * 1000;     // a finished room stays reachable for a rematch this long
const ABANDONED_TTL = 10 * 60 * 1000;    // cleanup grace after a room is marked abandoned
const DISCONNECT_GRACE = 2 * 60 * 1000;  // how long a disconnected seat can be rejoined before the other player may leave
const MAX_PILES = 60, MAX_PILE_LEN = 40; // sanity bounds on a proposed Nim board (piles count / digits per pile)

const rooms = new Map(); // code -> Room
const createAttempts = new Map(); // client-supplied attemptId -> {code, expires} — see the 'create' handler
const CREATE_ATTEMPT_TTL = 5 * 60 * 1000;
function pruneCreateAttempts() { const now = Date.now(); for (const [k, v] of createAttempts) if (v.expires < now) createAttempts.delete(k); }

function genCode() {
  let c;
  do { c = CODES.make('friend', n => crypto.randomInt(n)); }
  while (rooms.has(c));
  return c;
}
function genToken() { return crypto.randomBytes(18).toString('hex'); }
function normCode(raw) { return String(raw || '').replace(/\s+/g, '').toUpperCase(); }
/* a player's customized duck (the party profile), cleaned by the same rules the page uses; {} for a plain duck */
let ZPDuck = null; try { ZPDuck = require('../party-duck.js'); } catch (e) {}
function safeDuck(raw) { try { return raw && typeof raw === 'object' && ZPDuck ? ZPDuck.clean(raw) : {}; } catch (e) { return {}; } }
/* reactions: a short, fixed list, at most one per seat every REACT_GAP ms; relayed to both seats so both see the same event.
   The sender's id travels with it, so a client can ignore a repeated delivery. Nothing is stored: a reconnect replays nothing. */
const REACTS = ['happy', 'frustrated', 'surprised', 'cheeky', 'nod'], REACT_GAP = 1800;
/* the optional per-move timer: seconds per move, chosen by the host at create (0 = none), changed later only by an
   accepted request. The server owns the deadline: a client only ever displays it, so a background tab, a reload or a
   reconnect cannot reset it. It runs during the player-to-move's turn, restarts when the turn passes, pauses while a
   request (undo, restart, a timer change...) waits for an answer, and on expiry the player to move loses the game. */
const TIMER_MIN = 10, TIMER_MAX = 600;
function timerOf(raw) { const n = parseInt(raw, 10); if (!Number.isFinite(n) || n <= 0) return 0; return Math.max(TIMER_MIN, Math.min(TIMER_MAX, n)); }
function safeNick(raw, fallback) { const s = String(raw || '').trim().slice(0, 18); return s || fallback; }
function send(ws, msg) { if (ws && ws.readyState === ws.OPEN) try { ws.send(JSON.stringify(msg)); } catch (e) { console.error('send() failed to serialize', msg.t, e.message); } }
function fail(code, message) { const e = new Error(message); e.code = code; throw e; }
function firstPolicyOf(raw) { return ['host', 'guest', 'random'].includes(raw) ? raw : 'host'; }

/* ================= Nim rules — the same two facts the client's engine uses, kept independent on purpose ================= */
function parsePiles(list) {
  if (!Array.isArray(list) || !list.length || list.length > MAX_PILES) fail('cant_create', 'That board could not be used to start a room.');
  return list.map(v => { const s = String(v).trim(); if (!/^\d+$/.test(s) || s.length > MAX_PILE_LEN) fail('cant_create', 'That board could not be used to start a room.'); return BigInt(s); });
}
const toWire = piles => piles.map(String);
const NimRules = {
  parseCreate(msg) { return { rule: msg.rule === 'misere' ? 'misere' : 'normal', startPiles: parsePiles(msg.piles), firstPolicy: firstPolicyOf(msg.first) }; },
  parseCustomize(msg) { return { rule: msg.rule === 'misere' ? 'misere' : 'normal', startPiles: parsePiles(msg.piles), firstPolicy: firstPolicyOf(msg.first) }; },
  initialState(setup) { return { piles: setup.startPiles.slice() }; },
  previewFields(setup) { return { rule: setup.rule, startPiles: toWire(setup.startPiles) }; },
  snapshotFields(setup, state) { return { rule: setup.rule, piles: toWire(state.piles), startPiles: toWire(setup.startPiles) }; },
  applyMove(setup, state, seat, msg) {
    const idx = msg.pile | 0, take = typeof msg.take === 'string' && /^\d+$/.test(msg.take) ? BigInt(msg.take) : -1n;
    if (idx < 0 || idx >= state.piles.length) fail('bad_move', 'That pile does not exist.');
    if (!(take > 0n) || take > state.piles[idx]) fail('bad_move', 'That is not a legal amount to take.');
    const piles = state.piles.slice(); piles[idx] = piles[idx] - take;
    const terminal = piles.every(x => x === 0n) ? { winner: setup.rule === 'misere' ? (seat === 1 ? 2 : 1) : seat } : null;
    return { state: { piles }, lastMove: { seat, pile: idx, take: String(take), leave: String(piles[idx]) }, terminal, nextTurn: seat === 1 ? 2 : 1 };
  },
  // a pending "customize" payload holds the same shape parseCreate/parseCustomize return (BigInt piles, for exact
  // reuse as `setup` if accepted) — but that shape is never itself sent over the wire; only this wire-safe copy is.
  wirePayload(payload) { return { rule: payload.rule, startPiles: toWire(payload.startPiles), firstPolicy: payload.firstPolicy }; },
};

function clampInt(raw, lo, hi, dflt) { const n = parseInt(raw, 10); if (!Number.isFinite(n)) return dflt; return Math.max(lo, Math.min(hi, n)); }
/* ================= Pentago rules — an independent, from-scratch engine (not the client's engines2.js) =================
   A turn is two accepted moves: place (mt:'place', into any empty hole) then rotate (mt:'rot', any quadrant either
   way) — tracked by `state.phase`. A placement win skips the rotation entirely; nextTurn is only consulted when
   `terminal` is null, so its value while the turn is still open (right after an accepted placement) is the SAME
   seat, and only flips to the other seat once that seat's rotation is accepted. Marble color is purely cosmetic —
   the engine only ever reasons in seat numbers, with no fixed orientation. */
function pgAt(r, c) { return r * 6 + c; }
const PG_LINES = (() => {
  const W = [], dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) for (const [dr, dc] of dirs) {
    const w = []; let ok = true;
    for (let k = 0; k < 5; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr > 5 || cc < 0 || cc > 5) { ok = false; break; } w.push(pgAt(rr, cc)); }
    if (ok) W.push(w);
  }
  return W;
})();
const PG_QORG = [[0, 0], [0, 3], [3, 0], [3, 3]];
function pgHasLine(cells, p) { return PG_LINES.some(w => w.every(i => cells[i] === p)); }
function pgRotate(cells, q, dir) {
  const out = cells.slice(), [r0, c0] = PG_QORG[q];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const [sr, sc] = dir > 0 ? [2 - c, r] : [c, 2 - r]; out[pgAt(r0 + r, c0 + c)] = cells[pgAt(r0 + sr, c0 + sc)]; }
  return out;
}
function pgColorOf(setup, seat) { return seat === 1 ? setup.hostColor : (setup.hostColor === 'w' ? 'b' : 'w'); }
const pgWireColor = k => k === 'w' ? 'white' : 'black';
function pgParseSetup(msg) { return { hostColor: msg.color === 'black' ? 'b' : msg.color === 'white' ? 'w' : (Math.random() < 0.5 ? 'w' : 'b'), firstPolicy: firstPolicyOf(msg.first) }; }
const PentagoRules = {
  parseCreate(msg) { return pgParseSetup(msg); },
  parseCustomize(msg) { return pgParseSetup(msg); },
  initialState() { return { cells: new Array(36).fill(0), phase: 'place' }; },
  previewFields(setup) { return { hostColor: pgWireColor(setup.hostColor), guestColor: pgWireColor(setup.hostColor === 'w' ? 'b' : 'w') }; },
  snapshotFields(setup, state) { return { cells: state.cells, phase: state.phase, color: { 1: pgWireColor(pgColorOf(setup, 1)), 2: pgWireColor(pgColorOf(setup, 2)) } }; },
  undoPlies: 2,
  canUndo(state) { return state.phase === 'place'; },
  applyMove(setup, state, seat, msg) {
    if (state.phase === 'place') {
      if (msg.mt !== 'place') fail('bad_move', 'Place a marble first.');
      const cell = msg.cell | 0;
      if (cell < 0 || cell >= 36) fail('bad_move', 'That square does not exist.');
      if (state.cells[cell] !== 0) fail('bad_move', 'That hole is already filled.');
      const cells = state.cells.slice(); cells[cell] = seat;
      const lastMove = { seat, t: 'place', cell };
      if (pgHasLine(cells, seat)) return { state: { cells, phase: 'place' }, lastMove, terminal: { winner: seat }, nextTurn: null };
      return { state: { cells, phase: 'rot' }, lastMove, terminal: null, nextTurn: seat };
    }
    if (msg.mt !== 'rot') fail('bad_move', 'Rotate a quadrant first.');
    const q = msg.q | 0, d = msg.d === -1 ? -1 : 1;
    if (q < 0 || q > 3) fail('bad_move', 'That quadrant does not exist.');
    const cells = pgRotate(state.cells, q, d);
    const lastMove = { seat, t: 'rot', q, d };
    const w1 = pgHasLine(cells, 1), w2 = pgHasLine(cells, 2);
    if (w1 && w2) return { state: { cells, phase: 'place' }, lastMove, terminal: { winner: 0 }, nextTurn: null };
    if (w1) return { state: { cells, phase: 'place' }, lastMove, terminal: { winner: 1 }, nextTurn: null };
    if (w2) return { state: { cells, phase: 'place' }, lastMove, terminal: { winner: 2 }, nextTurn: null };
    if (cells.every(v => v !== 0)) return { state: { cells, phase: 'place' }, lastMove, terminal: { winner: 0 }, nextTurn: null };
    return { state: { cells, phase: 'place' }, lastMove, terminal: null, nextTurn: seat === 1 ? 2 : 1 };
  },
};

/* ================= Notakto rules — an independent, from-scratch engine (not the client's engines2.js) =================
   Everyone plays X, on the number of 3x3 boards agreed at setup (3, 5 or 7). A board closes the instant it holds any
   of the 8 three-in-a-row masks; the player whose move closes the LAST open board loses (misère, not ordinary tic-tac-toe). */
const NK_BOARDS = [3, 5, 7];
const NK_LINES = [0b000000111, 0b000111000, 0b111000000, 0b001001001, 0b010010010, 0b100100100, 0b100010001, 0b001010100];
const nkHasLine = m => NK_LINES.some(l => (m & l) === l);
function nkParseSetup(msg) { return { n: NK_BOARDS.includes(msg.boards | 0) ? (msg.boards | 0) : 3, firstPolicy: firstPolicyOf(msg.first) }; }
const NotaktoRules = {
  parseCreate(msg) { return nkParseSetup(msg); },
  parseCustomize(msg) { return nkParseSetup(msg); },
  initialState(setup) { return { boards: new Array(setup.n).fill(0), closed: new Array(setup.n).fill(false) }; },
  previewFields(setup) { return { n: setup.n }; },
  snapshotFields(setup, state) { return { n: setup.n, boards: state.boards, closed: state.closed }; },
  applyMove(setup, state, seat, msg) {
    const b = msg.b | 0, c = msg.c | 0;
    if (b < 0 || b >= setup.n) fail('bad_move', 'That board does not exist.');
    if (c < 0 || c > 8) fail('bad_move', 'That square does not exist.');
    if (state.closed[b]) fail('bad_move', 'That board is already closed.');
    if (state.boards[b] & (1 << c)) fail('bad_move', 'That square is already taken.');
    const boards = state.boards.slice(), closed = state.closed.slice();
    boards[b] |= (1 << c);
    let terminal = null;
    if (nkHasLine(boards[b])) { closed[b] = true; if (closed.every(Boolean)) terminal = { winner: seat === 1 ? 2 : 1 }; }
    return { state: { boards, closed }, lastMove: { seat, b, c }, terminal, nextTurn: seat === 1 ? 2 : 1 };
  },
};

/* ================= TOOT & OTTO rules — an independent, from-scratch engine (not the client's engines2.js) =================
   Fixed 4-row by 6-column board (matches the offline game; there is nothing to configure at setup beyond who starts).
   Whoever's word appears when a drop completes one decides the winner — not whoever made that drop — and both words
   completing at once is a draw, exactly as the offline rules already work. */
const TT_R = 4, TT_C = 6;
const TT_IDX = (r, c) => r * TT_C + c;
const TT_WIN = (() => { const W = []; for (let r = 0; r < TT_R; r++) for (let c = 0; c < TT_C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const w = []; for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= TT_R || cc < 0 || cc >= TT_C) { w.length = 0; break; } w.push(TT_IDX(rr, cc)); } if (w.length === 4) W.push(w); } return W; })();
function ttLanding(board, col) { for (let r = TT_R - 1; r >= 0; r--) if (!board[TT_IDX(r, col)]) return r; return -1; }
function ttScan(board) { const found = { TOOT: [], OTTO: [] }; for (const w of TT_WIN) { const str = w.map(i => board[i] || '.').join(''); if (str === 'TOOT') found.TOOT.push(w); else if (str === 'OTTO') found.OTTO.push(w); } return found; }
const TootOttoRules = {
  parseCreate(msg) { return { firstPolicy: firstPolicyOf(msg.first) }; },
  parseCustomize(msg) { return { firstPolicy: firstPolicyOf(msg.first) }; },
  initialState() { return { board: new Array(TT_R * TT_C).fill(''), sup: { 1: { T: 6, O: 6 }, 2: { T: 6, O: 6 } }, cells: [], words: [] }; },
  previewFields() { return { R: TT_R, C: TT_C }; },
  snapshotFields(setup, state) { return { R: TT_R, C: TT_C, board: state.board, sup: state.sup, cells: state.cells, words: state.words }; },
  applyMove(setup, state, seat, msg) {
    const ch = msg.ch === 'O' ? 'O' : (msg.ch === 'T' ? 'T' : null);
    if (!ch) fail('bad_move', 'Choose T or O.');
    const col = msg.col | 0;
    if (col < 0 || col >= TT_C) fail('bad_move', 'That column does not exist.');
    if (state.sup[seat][ch] <= 0) fail('bad_move', 'You have none of that letter left.');
    const r = ttLanding(state.board, col);
    if (r < 0) fail('bad_move', 'That column is full.');
    const board = state.board.slice(); board[TT_IDX(r, col)] = ch;
    const sup = { 1: { ...state.sup[1] }, 2: { ...state.sup[2] } }; sup[seat][ch]--;
    const f = ttScan(board), a = f.TOOT.length > 0, b = f.OTTO.length > 0;
    let terminal = null, word = a && b ? null : (a ? 'TOOT' : (b ? 'OTTO' : null));
    let cells = [], words = [];
    if (a && b) { terminal = { winner: 0 }; words = ['TOOT', 'OTTO']; cells = [...f.TOOT.flat(), ...f.OTTO.flat()]; }
    else if (a) { terminal = { winner: 1 }; words = ['TOOT']; cells = f.TOOT.flat(); }
    else if (b) { terminal = { winner: 2 }; words = ['OTTO']; cells = f.OTTO.flat(); }
    else if (board.every(x => x)) terminal = { winner: 0 };
    return { state: { board, sup, cells, words }, lastMove: { seat, ch, col, row: r, word }, terminal, nextTurn: seat === 1 ? 2 : 1 };
  },
};

/* ================= Sim rules — an independent, from-scratch engine (not the client's shared.js SIM_CORE) =================
   n dots (6 or 7), edges numbered exactly as SIM_CORE.geom does (i<j pairs in that same order, so a client-picked edge
   index always means the same edge here). Completing your OWN monochromatic triangle loses in classic Sim; the
   "reverse" variant (agreed at setup, fixed for the room) flips that outcome, never the collision/turn checks. */
const SIM_N = [6, 7];
const simGeomCache = {};
function simGeomOf(n) {
  if (simGeomCache[n]) return simGeomCache[n];
  const edges = [], id = {};
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { id[i + ',' + j] = edges.length; edges.push([i, j]); }
  const e = (a, b) => id[Math.min(a, b) + ',' + Math.max(a, b)];
  const tris = []; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) tris.push([e(a, b), e(b, c), e(a, c)]);
  return simGeomCache[n] = { n, edges, tris };
}
function simParseSetup(msg) { return { n: SIM_N.includes(msg.n | 0) ? (msg.n | 0) : 6, reverse: !!msg.reverse, firstPolicy: firstPolicyOf(msg.first) }; }
const SimRules = {
  parseCreate(msg) { return simParseSetup(msg); },
  parseCustomize(msg) { return simParseSetup(msg); },
  initialState(setup) { return { own: new Array(simGeomOf(setup.n).edges.length).fill(0), tri: null }; },
  previewFields(setup) { return { n: setup.n, reverse: setup.reverse }; },
  snapshotFields(setup, state) { return { n: setup.n, reverse: setup.reverse, own: state.own, tri: state.tri }; },
  applyMove(setup, state, seat, msg) {
    const e = msg.e | 0, geom = simGeomOf(setup.n);
    if (e < 0 || e >= geom.edges.length) fail('bad_move', 'That edge does not exist.');
    if (state.own[e] !== 0) fail('bad_move', 'That edge is already claimed.');
    const own = state.own.slice(); own[e] = seat;
    const tri = geom.tris.find(t => t.includes(e) && t.every(k => own[k] === seat)) || null;
    const terminal = tri ? { winner: setup.reverse ? seat : (seat === 1 ? 2 : 1) } : null;
    return { state: { own, tri }, lastMove: { seat, e }, terminal, nextTurn: seat === 1 ? 2 : 1 };
  },
};

/* ================= The Gold Coin rules — an independent, from-scratch engine (not the client's gold-engine.js) =================
   A turn is one SLIDE (a coin left, never onto or past another) or one COLLECT (always the leftmost coin, from
   wherever it stands). Whoever collects the gold coin wins, whenever that happens — there is no separate "game over"
   check beyond that single instant, exactly like the offline engine. */
const GOLD_MIN = 2, GOLD_MAX = 60;
function goldClampInt(raw, lo, hi, dflt) { const n = parseInt(raw, 10); if (!Number.isFinite(n)) return dflt; return Math.max(lo, Math.min(hi, n)); }
function goldParseSetup(msg) {
  const n = goldClampInt(msg.n, GOLD_MIN, GOLD_MAX, 11);
  const pens = Array.isArray(msg.pens) ? msg.pens.map(x => x | 0) : [];
  const gold = msg.gold | 0;
  const variant = msg.variant === 'rear' ? 'rear' : 'std';
  const all = pens.concat([gold]);
  if (!Number.isInteger(gold) || gold < 0 || gold >= n) fail('cant_create', 'Place the gold coin on the track.');
  if (pens.some(p => !Number.isInteger(p) || p < 0 || p >= n)) fail('cant_create', 'Every coin must sit on the track.');
  if (new Set(all).size !== all.length) fail('cant_create', 'Two coins cannot share a space.');
  if (variant === 'std' && pens.some(p => p > gold)) fail('cant_create', 'In the standard game the gold coin is farthest right.');
  return { n, pens, gold, variant, firstPolicy: firstPolicyOf(msg.first) };
}
function goldInitialCoins(setup) {
  const coins = setup.pens.map((p, i) => ({ id: 'p' + (i + 1), pos: p, kind: 'penny' }));
  coins.push({ id: 'gold', pos: setup.gold, kind: 'gold' });
  coins.sort((a, b) => a.pos - b.pos);
  return coins;
}
const GoldCoinRules = {
  parseCreate(msg) { return goldParseSetup(msg); },
  parseCustomize(msg) { return goldParseSetup(msg); },
  initialState(setup) { return { coins: goldInitialCoins(setup), taken: [] }; },
  previewFields(setup) { return { n: setup.n, pens: setup.pens, gold: setup.gold, variant: setup.variant }; },
  // taken travels in the snapshot (not just lastMove) so a reconnect or a fresh join mid-match still shows an
  // accurate "who took what" tray, not just whatever coins happen to remain on the board right now.
  snapshotFields(setup, state) { return { n: setup.n, variant: setup.variant, coins: state.coins, taken: state.taken }; },
  applyMove(setup, state, seat, msg) {
    // msg.mt (not msg.t) names the move's own sub-type -- msg.t is already the envelope's 'move', exactly like
    // Pentago's place/rotate distinction; reusing msg.t here would silently collide with it.
    const coins = state.coins.map(c => ({ ...c }));
    if (msg.mt === 'collect') {
      if (!coins.length) fail('bad_move', 'No coins remain.');
      const c = coins.shift();
      const taken = state.taken.concat([{ id: c.id, kind: c.kind, by: seat }]);
      const terminal = c.kind === 'gold' ? { winner: seat } : null;
      return { state: { coins, taken }, lastMove: { seat, mt: 'collect', id: c.id, kind: c.kind }, terminal, nextTurn: seat === 1 ? 2 : 1 };
    }
    if (msg.mt === 'slide') {
      const i = coins.findIndex(c => c.id === msg.id);
      if (i < 0) fail('bad_move', 'That coin does not exist.');
      const to = msg.to | 0, lo = i === 0 ? 0 : coins[i - 1].pos + 1;
      if (to < lo || to >= coins[i].pos) fail('bad_move', 'Not a legal slide.');
      coins[i].pos = to; coins.sort((a, b) => a.pos - b.pos);
      return { state: { coins, taken: state.taken }, lastMove: { seat, mt: 'slide', id: msg.id, to }, terminal: null, nextTurn: seat === 1 ? 2 : 1 };
    }
    fail('bad_move', 'Unknown move.');
  },
};


const RULES = { nim: NimRules, pentago: PentagoRules, notakto: NotaktoRules, toot: TootOttoRules, sim: SimRules, gold: GoldCoinRules };

class Room {
  constructor(game, hostNickname, setup) {
    this.code = genCode();
    this.game = game;
    this.setup = setup;
    this.state = RULES[game].initialState(setup);
    this.turnSeat = 1;
    this.version = 0;
    this.over = false; this.winner = 0; this.lastMove = null;
    this.seats = {
      1: { nickname: hostNickname, token: genToken(), ws: null, connected: false, disconnectedAt: 0 },
      2: { nickname: null, token: null, ws: null, connected: false, disconnectedAt: 0 },
    };
    this.status = 'waiting'; // waiting -> lobby -> active -> finished | abandoned | expired
    this.pending = null;     // {id, kind:'undo'|'restart'|'customize'|'rematch', by:seat, payload}
    this.score = { 1: 0, 2: 0 }; this.draws = 0;   // games won by each seat, and drawn games: counted once per finished game
    this.timer = 0; this.deadline = null; this.remaining = null; this.clockTimer = null; this.endReason = null;
    this.gameNumber = 1;
    this.lastStarter = null; // who moved first in the game just started, for rematch alternation
    this.history = []; // {state, turnSeat} snapshots captured before each accepted move — undo pops RULES[game].undoPlies of these
    this.seenMoveIds = new Set();
    this.disconnectTimer = null;
    this.armExpiry();
  }
  resolveFirst() { return this.setup.firstPolicy === 'guest' ? 2 : this.setup.firstPolicy === 'random' ? (Math.random() < 0.5 ? 1 : 2) : 1; }
  armExpiry() {
    clearTimeout(this.expireTimer);
    const ms = this.status === 'waiting' ? UNJOINED_TTL : this.status === 'finished' ? FINISHED_TTL : (this.status === 'abandoned' || this.status === 'expired') ? ABANDONED_TTL : null;
    if (ms != null) this.expireTimer = setTimeout(() => { rooms.delete(this.code); }, ms);
  }
  other(seat) { return seat === 1 ? 2 : 1; }
  /* a fresh full clock for the player to move (or none) */
  armClock() { clearTimeout(this.clockTimer); this.clockTimer = null; this.deadline = null; this.remaining = null;
    if (!this.timer || this.status !== 'active' || this.over) return;
    this.runClock(this.timer * 1000); }
  runClock(ms) { clearTimeout(this.clockTimer); this.deadline = Date.now() + ms; this.remaining = null;
    const seat = this.turnSeat, v = this.version;
    this.clockTimer = setTimeout(() => this.expire(seat, v), ms + 50); }
  pauseClock() { if (!this.deadline) return; clearTimeout(this.clockTimer); this.clockTimer = null; this.remaining = Math.max(1000, this.deadline - Date.now()); this.deadline = null; }
  resumeClock() { if (this.deadline || this.remaining == null || this.status !== 'active' || this.over) return; this.runClock(this.remaining); }
  stopClock() { clearTimeout(this.clockTimer); this.clockTimer = null; this.deadline = null; this.remaining = null; }
  /* time ran out: the player to move loses this game, counted once */
  expire(seat, version) {
    if (this.status !== 'active' || this.over || this.turnSeat !== seat || this.version !== version || !this.deadline) return;
    if (Date.now() < this.deadline - 20) { this.runClock(this.deadline - Date.now()); return; }
    const w = this.other(seat);
    this.over = true; this.winner = w; this.status = 'finished'; this.endReason = 'timeout'; this.score[w]++;
    this.pending = null; this.stopClock(); this.version++; this.armExpiry();
    this.broadcast('timeout'); }
  bothSeats() { return [this.seats[1], this.seats[2]]; }
  snapshot(seat) {
    return Object.assign({
      code: this.code, game: this.game,
      version: this.version, turnSeat: this.turnSeat, over: this.over, winner: this.winner, lastMove: this.lastMove,
      status: this.status, gameNumber: this.gameNumber, score: this.score, draws: this.draws, endReason: this.endReason,
      timer: this.timer, deadline: this.deadline, remaining: this.remaining, now: Date.now(),
      seats: {
        1: { nickname: this.seats[1].nickname, duck: this.seats[1].duck || {}, present: true, connected: this.seats[1].connected, graceEndsAt: this.graceEndsAtFor(1) },
        2: { nickname: this.seats[2].nickname, duck: this.seats[2].duck || {}, present: !!this.seats[2].token, connected: this.seats[2].connected, graceEndsAt: this.graceEndsAtFor(2) },
      },
      pending: this.pending ? { id: this.pending.id, kind: this.pending.kind, by: this.pending.by, payload: this.wirePending() } : null,
    }, RULES[this.game].snapshotFields(this.setup, this.state, seat));
  }
  graceEndsAtFor(seat) { const s = this.seats[seat]; return (s.token && !s.connected && s.disconnectedAt) ? s.disconnectedAt + DISCONNECT_GRACE : null; }
  // the stored pending.payload keeps whatever internal shape the game's own setup uses (e.g. BigInt piles, so
  // accepting it can become `this.setup` directly) — never JSON-safe by itself, so every broadcast sends this
  // wire-safe copy instead. Skipping this was a real bug: JSON.stringify throws on BigInt, and send() swallows
  // that silently, which left a customize proposal permanently "pending" with neither client ever seeing it.
  wirePending() { if (!this.pending || !this.pending.payload) return null; const w = RULES[this.game].wirePayload; return w ? w(this.pending.payload) : this.pending.payload; }
  broadcast(extra) { for (const seat of [1, 2]) { const s = this.seats[seat]; if (s.ws) send(s.ws, Object.assign({ t: 'state' }, this.snapshot(seat), extra ? { note: extra } : null)); } }
}

const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
const httpServer = http.createServer((req, res) => {
  if (req.url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  /* which build is running: Render sets RENDER_GIT_COMMIT */
  if (req.url === '/version') { res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); return res.end(JSON.stringify({ commit: process.env.RENDER_GIT_COMMIT || null })); }
  res.writeHead(404); res.end('room server: use a WebSocket connection, not plain HTTP');
});
httpServer.on('upgrade', (req, socket, head) => { wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req)); });

function findSeatByToken(room, token) { for (const seat of [1, 2]) if (room.seats[seat].token === token) return seat; return null; }

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    try { handle(ws, msg); } catch (e) { send(ws, { t: 'error', code: 'internal', message: 'Something went wrong on our end.' }); }
  });
  ws.on('close', () => { onSocketClosed(ws); });
});
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } }, 20000);

function onSocketClosed(ws) {
  if (!ws.__room || !ws.__seat) return;
  const room = rooms.get(ws.__room); if (!room) return;
  const seat = room.seats[ws.__seat];
  if (seat.ws !== ws) return; // an old, already-superseded socket closing (post-takeover) — ignore
  seat.ws = null; seat.connected = false; seat.disconnectedAt = Date.now();
  if (room.status === 'active' || room.status === 'lobby') {
    room.broadcast();
    clearTimeout(room.disconnectTimer);
    room.disconnectTimer = setTimeout(() => { if (!seat.connected) room.broadcast(); }, DISCONNECT_GRACE + 500); // nudge clients once grace elapses
  }
}

function attachSeat(ws, room, seat) {
  const s = room.seats[seat];
  if (s.ws && s.ws !== ws) { send(ws, { t: 'resumeConflict', code: room.code }); return false; }
  s.ws = ws; s.connected = true; s.disconnectedAt = 0;
  ws.__room = room.code; ws.__seat = seat;
  return true;
}

function handle(ws, msg) {
  switch (msg.t) {
    case 'ping': return send(ws, { t: 'pong' });

    case 'create': {
      // idempotent retries: if the client already sent this exact create attempt and the room still exists
      // (its own response was just lost — a dropped packet, a slow free-tier wake-up, whatever), hand back the
      // SAME room instead of minting a second one that would sit there abandoned and confuse "which link is real".
      if (msg.attemptId) {
        pruneCreateAttempts();
        const prior = createAttempts.get(msg.attemptId);
        if (prior) {
          const room = rooms.get(prior.code);
          if (room) {
            if (!attachSeat(ws, room, 1)) return; // resumeConflict already sent if seat 1 is somehow live elsewhere
            return send(ws, { t: 'created', seat: 1, token: room.seats[1].token, state: room.snapshot(1) });
          }
          createAttempts.delete(msg.attemptId); // that room is gone (expired) — fall through and make a fresh one
        }
      }
      const game = RULES[msg.game] ? msg.game : 'nim';
      let room;
      try { const setup = RULES[game].parseCreate(msg); room = new Room(game, safeNick(msg.nickname, 'Player 1'), setup); room.seats[1].duck = safeDuck(msg.duck); room.timer = timerOf(msg.timer); }
      catch (e) { return send(ws, { t: 'error', code: e.code || 'cant_create', message: e.message || 'That board could not be used to start a room.' }); }
      rooms.set(room.code, room);
      attachSeat(ws, room, 1);
      if (msg.attemptId) { pruneCreateAttempts(); createAttempts.set(msg.attemptId, { code: room.code, expires: Date.now() + CREATE_ATTEMPT_TTL }); }
      return send(ws, { t: 'created', seat: 1, token: room.seats[1].token, state: room.snapshot(1) });
    }

    case 'preview': {
      const room = rooms.get(normCode(msg.code));
      if (!room) return send(ws, { t: 'error', code: 'not_found', message: "That room code doesn't match an open room." });
      if (room.status === 'finished' && !room.seats[2].connected && !room.seats[1].connected) return send(ws, { t: 'error', code: 'expired', message: 'This room has closed.' });
      return send(ws, Object.assign({ t: 'previewResult', code: room.code, game: room.game, hostNickname: room.seats[1].nickname, first: room.setup.firstPolicy, full: !!room.seats[2].token, status: room.status, timer: room.timer }, RULES[room.game].previewFields(room.setup)));
    }

    case 'join': {
      const room = rooms.get(normCode(msg.code));
      if (!room) return send(ws, { t: 'error', code: 'not_found', message: "That room code doesn't match an open room." });
      if (room.status !== 'waiting') {
        if (room.seats[2].token) return send(ws, { t: 'error', code: 'full', message: 'Both seats in this room are already taken.' });
      }
      room.seats[2].nickname = safeNick(msg.nickname, 'Player 2');
      room.seats[2].duck = safeDuck(msg.duck);
      room.seats[2].token = genToken();
      attachSeat(ws, room, 2);
      room.status = 'lobby'; room.armExpiry();
      room.broadcast();
      return send(ws, { t: 'joined', seat: 2, token: room.seats[2].token, state: room.snapshot(2) });
    }

    case 'resume': {
      const room = rooms.get(normCode(msg.code));
      if (!room) return send(ws, { t: 'error', code: 'not_found', message: 'This room no longer exists.' });
      const seat = findSeatByToken(room, msg.token);
      if (!seat) return send(ws, { t: 'error', code: 'not_found', message: "We couldn't find your seat in this room." });
      if (!attachSeat(ws, room, seat)) return; // resumeConflict already sent
      room.broadcast();
      return send(ws, { t: 'resumed', seat, state: room.snapshot(seat) });
    }

    case 'takeover': {
      const room = rooms.get(normCode(msg.code)); if (!room) return send(ws, { t: 'error', code: 'not_found', message: 'This room no longer exists.' });
      const seat = findSeatByToken(room, msg.token); if (!seat) return send(ws, { t: 'error', code: 'not_found', message: "We couldn't find your seat in this room." });
      const s = room.seats[seat];
      if (s.ws && s.ws !== ws) { send(s.ws, { t: 'kicked' }); try { s.ws.close(); } catch (e) {} }
      s.ws = null;
      attachSeat(ws, room, seat);
      room.broadcast();
      return send(ws, { t: 'resumed', seat, state: room.snapshot(seat) });
    }

    case 'start': {
      const { room, seat, err } = requireSeat(ws, msg); if (err) return send(ws, err);
      if (seat !== 1) return send(ws, { t: 'error', code: 'not_host', message: 'Only the host can start the game.' });
      if (room.status !== 'lobby') return;
      if (!room.seats[2].connected) return send(ws, { t: 'error', code: 'not_active', message: "Your friend isn't connected right now." });
      room.state = RULES[room.game].initialState(room.setup);
      room.turnSeat = room.resolveFirst(); room.lastStarter = room.turnSeat;
      room.over = false; room.winner = 0; room.lastMove = null; room.version++; room.history = []; room.pending = null;
      room.status = 'active'; room.endReason = null; room.armExpiry(); room.armClock();
      return room.broadcast();
    }

    case 'move': {
      const { room, seat, err } = requireSeat(ws, msg); if (err) return send(ws, err);
      if (room.status !== 'active' || room.over) return send(ws, { t: 'error', code: 'not_active', message: 'This game is not in progress.' });
      if (room.pending) return send(ws, { t: 'error', code: 'pending', message: 'Resolve the pending request first.' });
      if (room.turnSeat !== seat) return send(ws, { t: 'error', code: 'not_your_turn', message: "It's not your turn." });
      if (typeof msg.version !== 'number' || msg.version !== room.version) return send(ws, { t: 'error', code: 'stale', message: 'The board has changed — here is the current position.', state: room.snapshot(seat) });
      if (msg.moveId) { if (room.seenMoveIds.has(msg.moveId)) return; room.seenMoveIds.add(msg.moveId); }
      let result;
      try { result = RULES[room.game].applyMove(room.setup, room.state, seat, msg); }
      catch (e) { return send(ws, { t: 'error', code: e.code || 'bad_move', message: e.message || 'That is not a legal move.' }); }
      room.history.push({ state: room.state, turnSeat: room.turnSeat });
      room.state = result.state; room.lastMove = result.lastMove;
      room.version++;
      if (result.terminal) {
        room.over = true; room.winner = result.terminal.winner; room.status = 'finished'; room.endReason = 'move';
        if (result.terminal.winner) room.score[result.terminal.winner]++; else room.draws++;
        room.stopClock(); room.armExpiry();
      } else {
        const passed = result.nextTurn !== seat;   // a turn made of two steps (Pentago: place, then turn) keeps its clock
        room.turnSeat = result.nextTurn;
        if (passed) room.armClock();
      }
      return room.broadcast();
    }

    case 'react': {
      const { room, seat, err } = requireSeat(ws, msg); if (err) return;
      if (!REACTS.includes(msg.kind) || room.status !== 'active' && room.status !== 'finished') return;
      const s = room.seats[seat], now = Date.now();
      if (s.lastReact && now - s.lastReact < REACT_GAP) return;
      s.lastReact = now;
      const id = typeof msg.id === 'string' ? msg.id.replace(/[^a-z0-9]/gi, '').slice(0, 20) : '';
      for (const x of room.bothSeats()) if (x.ws) send(x.ws, { t: 'react', seat, kind: msg.kind, at: now, id });
      return;
    }

    case 'request': {
      const { room, seat, err } = requireSeat(ws, msg); if (err) return send(ws, err);
      const kind = msg.kind;
      if (!['undo', 'restart', 'customize', 'rematch', 'timer'].includes(kind)) return;
      if (room.pending) return send(ws, { t: 'error', code: 'pending', message: 'A request is already pending.' });
      if (kind === 'undo') {
        const undoPlies = RULES[room.game].undoPlies || 1;
        const canUndoRule = RULES[room.game].canUndo;
        if (room.history.length < undoPlies || (canUndoRule && !canUndoRule(room.state))) return send(ws, { t: 'error', code: 'no_undo', message: 'There is no complete move to undo yet.' });
      }
      if (kind === 'rematch' && room.status !== 'finished') return;
      if ((kind === 'undo' || kind === 'restart') && room.status !== 'active') return;
      let payload = null;
      if (kind === 'customize') { try { payload = RULES[room.game].parseCustomize(msg); } catch (e) { return send(ws, { t: 'error', code: e.code || 'cant_create', message: e.message || 'That board could not be used.' }); } }
      if (kind === 'timer') { const secs = timerOf(msg.secs); if (secs === room.timer) return; payload = { secs }; }
      room.pending = { id: genToken().slice(0, 8), kind, by: seat, payload };
      room.pauseClock();   // nobody can move while a request waits, so nobody's time runs out meanwhile
      return room.broadcast();
    }

    case 'respond': {
      const { room, seat, err } = requireSeat(ws, msg); if (err) return send(ws, err);
      if (!room.pending || room.pending.id !== msg.requestId) return;
      if (room.pending.by === seat) return; // only the other player answers
      const { kind, payload } = room.pending;
      room.pending = null;
      if (!msg.accept) { room.resumeClock(); room.broadcast(); return; }
      if (kind === 'undo') {
        const undoPlies = RULES[room.game].undoPlies || 1;
        const n = Math.min(undoPlies, room.history.length);
        const idx = room.history.length - n, target = room.history[idx];
        room.history.length = idx;
        room.state = target.state; room.turnSeat = target.turnSeat; room.lastMove = null; room.over = false; room.winner = 0; room.version++; room.status = 'active';
      }
      else if (kind === 'restart') { room.state = RULES[room.game].initialState(room.setup); room.turnSeat = room.resolveFirst(); room.lastStarter = room.turnSeat; room.over = false; room.winner = 0; room.lastMove = null; room.history = []; room.version++; room.status = 'active'; room.gameNumber++; }
      else if (kind === 'customize') {
        // A new board can change shape entirely (different rows/cols/pile count) — the old state (wrong-sized cells
        // array, stale turn/lastMove/history) must never survive into it, even though nothing is "active" again
        // until the next 'start'. Landing in 'lobby' with the OLD state (as this used to do) sent clients an
        // inconsistent snapshot: new dimensions from setup, but the previous board's cells array underneath them.
        room.setup = payload;
        room.state = RULES[room.game].initialState(room.setup);
        room.turnSeat = 1; room.over = false; room.winner = 0; room.lastMove = null; room.history = [];
        room.version++; room.status = 'lobby'; room.gameNumber++;
      }
      else if (kind === 'rematch') { room.state = RULES[room.game].initialState(room.setup); room.turnSeat = room.other(room.lastStarter || 1); room.lastStarter = room.turnSeat; room.over = false; room.winner = 0; room.lastMove = null; room.history = []; room.version++; room.status = 'active'; room.gameNumber++; }
      else if (kind === 'timer') { room.timer = payload.secs; }
      if (kind !== 'timer' || room.status === 'active') room.endReason = room.over ? room.endReason : null;
      /* every accepted change gives the player to move a fresh full clock (a new game, an undone move, a new limit) */
      room.armClock();
      room.armExpiry();
      return room.broadcast();
    }

    case 'cancelRequest': {
      const { room, seat, err } = requireSeat(ws, msg); if (err) return send(ws, err);
      if (room.pending && room.pending.by === seat && room.pending.id === msg.requestId) { room.pending = null; room.resumeClock(); room.broadcast(); }
      return;
    }

    case 'leave': {
      const { room, seat, err } = requireSeat(ws, msg); if (err) return send(ws, err);
      const otherSeat = room.other(seat);
      if (room.status === 'active') {
        if (room.seats[otherSeat].connected) { room.over = true; room.winner = otherSeat; room.status = 'finished'; room.endReason = 'resigned'; room.score[otherSeat]++; room.stopClock(); room.broadcast('resigned'); }
        else { room.status = 'abandoned'; room.stopClock(); room.broadcast(); }
      } else if (room.status === 'lobby' || room.status === 'waiting') { room.status = 'abandoned'; room.broadcast('host_left'); }
      room.armExpiry();
      return;
    }
  }
}

function requireSeat(ws, msg) {
  const room = rooms.get(normCode(msg.code));
  if (!room) return { err: { t: 'error', code: 'not_found', message: 'This room no longer exists.' } };
  const seat = findSeatByToken(room, msg.token);
  if (!seat) return { err: { t: 'error', code: 'not_found', message: "We couldn't find your seat in this room." } };
  return { room, seat };
}

httpServer.listen(PORT, () => console.log(`Room server listening on :${PORT}  (health check: /healthz)`));
