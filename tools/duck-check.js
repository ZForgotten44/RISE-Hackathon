/* Both room servers clean ducks with party-duck.js itself. This checks the rules every page and server relies on:
   any choice made in the creator is kept, what it takes off is explained, every combination comes out valid (cleaning
   it again changes nothing), older saved ducks still load, and every part draws in both views. */
const path = require('path');
process.env.PARTY_STATE_FILE = 'off';
const Z = require(path.join(__dirname, '..', 'party-duck.js'));
const core = require(path.join(__dirname, '..', 'server', 'party', 'core.js'));
let fails = 0, checks = 0;
const ok = (c, what) => { checks++; if (!c) { fails++; console.error('FAIL', what); } };
const opts = k => Z.OPTIONS[k].map(x => x[0]);
for (const head of opts('head')) for (const hair of opts('hair')) for (const neck of opts('neck')) for (const acc of opts('acc')) {
  const d = { head, hair, neck, acc, face: 'glasses', expr: 'cheerful', beard: 'short' }, c = Z.clean(d);
  ok(JSON.stringify(Z.clean(c)) === JSON.stringify(c), 'cleaning twice is stable ' + JSON.stringify(d));
  ok(JSON.stringify(core._cleanDuck(d)) === JSON.stringify(c), 'server and page agree ' + JSON.stringify(d));
  for (const k of ['head', 'hair', 'neck', 'acc']) { const r = Z.adjust(c, k, d[k]); ok(r.duck[k] === d[k], `choosing ${k} ${d[k]} keeps it`);
    const lost = ['head', 'hair', 'neck', 'acc'].filter(x => c[x] && !r.duck[x]); ok(!lost.length || r.note, `a note explains what came off: ${k}=${d[k]} from ${JSON.stringify(c)}`); }
}
for (const k of Z.KEYS) for (const [v] of Z.OPTIONS[k]) for (const view of ['side', 'front']) { const s = Z.svg({ [k]: v, hair: k === 'beard' ? 'bob' : undefined }, { view }); ok(/^<svg[\s\S]*<\/svg>$/.test(s) && !/NaN|undefined/.test(s), `${k} ${v} draws in ${view} view`); }
for (const [h, want] of [['short', 'pixie'], ['spiky', 'pixie'], ['tuft', 'pixie'], ['mohawk', 'pixie'], ['long', 'long'], ['braids', 'braids']]) ok(Z.clean({ hair: h }).hair === want, 'old hair ' + h);
ok(Z.clean({ head: 'headphones' }).acc === 'headphones' && Z.clean({ head: 'rainhat' }).head === 'sunhat', 'old headwear moves to today\'s slots');
ok(Z.clean({ hair: 'constructor', hc: '__proto__' }).hair === '' && Z.clean({ hc: 'toString' }).hc === '', 'odd values are dropped');
console.log(fails ? `${fails} of ${checks} duck checks failed` : `All ${checks} duck checks passed`);
process.exit(fails ? 1 : 0);
