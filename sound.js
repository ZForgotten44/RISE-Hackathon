/* sound.js: small synthesized sound effects, generated in the browser (soft wooden taps, rubber squeaks, a warm coin chime). The one recorded sound is
   the rubber duck (audio/duck-squeak.mp3), used by the homepage runner's jump and the About duck.
   Sound is ON for new visitors (browsers only let it start after the first click, tap or key press, which happens silently). The speaker button beside the invert switch mutes it; the choice is remembered in this browser.
   Muting, or leaving the tab, stops everything at once, and nothing that happened while away is replayed.
   Usage from a game:  ZS.play('wood')   ZS.play('squeak',4)   ZS.creak.start() / .set(len) / .stop()   (all silent no-ops while muted) */
(function(){
const KEY='zf-sound', NOTE='zf-sound-note';
let on=true; try{ on=localStorage.getItem(KEY)!=='off'; }catch(e){}     // on for new visitors; a visitor who mutes stays muted
const AC=window.AudioContext||window.webkitAudioContext;
let ctx=null, master=null, voices=0, sq=null, cr=null, noiseBuf=null; const last={};

function ensure(){ if(!on||!AC||document.hidden) return null;
  if(!ctx){ try{ ctx=new AC(); master=ctx.createGain(); master.gain.value=1.1; const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-9; comp.knee.value=4; comp.ratio.value=6; comp.attack.value=.002; comp.release.value=.12;   /* a gentle limiter, so stacked sounds never clip */ master.connect(comp); comp.connect(ctx.destination); }catch(e){ ctx=null; return null; } }
  if(ctx.state==='suspended') ctx.resume().catch(()=>{}); return ctx; }
function kill(){ try{ if(cr){ cr=null; } sq=null; dv=null; if(ctx){ const c=ctx; ctx=null; master=null; voices=0; c.close().catch(()=>{}); } }catch(e){ ctx=null; } }

/* ---- building blocks ---- */
const rate=(o,name)=>{ const now=performance.now(), gap=o||30; if(last[name]&&now-last[name]<gap) return false; last[name]=now; return true; };
function vo(node){ voices++; node.onended=()=>{ voices=Math.max(0,voices-1); }; }
function ramp(g,t,a,peak,d){ g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a); g.gain.exponentialRampToValueAtTime(.0001,t+a+d); }
/* o: f start Hz, f2 end Hz, at (s from now), a attack, d decay, v volume, type, lp lowpass */
function tone(o){ if(voices>16) return null; const t=ctx.currentTime+(o.at||0), osc=ctx.createOscillator(), g=ctx.createGain(); osc.type=o.type||'sine'; osc.frequency.setValueAtTime(o.f,t); if(o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2,t+(o.glide||o.d));
  ramp(g,t,o.a||.004,o.v||.2,o.d); let n=osc; if(o.lp){ const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=o.lp; osc.connect(f); n=f; } n.connect(g); g.connect(master); osc.start(t); osc.stop(t+(o.a||.004)+o.d+.04); vo(osc); return {osc,g}; }
function noise(o){ if(voices>16) return; if(!noiseBuf){ noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
  const t=ctx.currentTime+(o.at||0), src=ctx.createBufferSource(); src.buffer=noiseBuf; src.loop=true; const f=ctx.createBiquadFilter(); f.type=o.type||'bandpass'; f.frequency.setValueAtTime(o.f,t); if(o.f2) f.frequency.exponentialRampToValueAtTime(o.f2,t+o.d); f.Q.value=o.q||1.2; const g=ctx.createGain(); ramp(g,t,o.a||.003,o.v||.1,o.d); src.connect(f); f.connect(g); g.connect(master); src.start(t,Math.random()*.5); src.stop(t+(o.a||.003)+o.d+.03); vo(src); }
const jit=(x,p)=>x*(1+(Math.random()-.5)*(p||.06));
/* a rubber-toy squeak: the pitch rises fast and settles, with a little wobble, through a small formant. level 0 = bright, 12 = comically low */
function squeak(k,o){ o=o||{}; if(sq){ try{ const t=ctx.currentTime; sq.g.gain.cancelScheduledValues(t); sq.g.gain.setTargetAtTime(.0001,t,.008); sq.osc.stop(t+.05); }catch(e){} sq=null; }
  const lv=Math.min(12,Math.max(0,k||0)), base=jit(o.f||(1000-lv*66),.07), d=o.d||(.14+lv*.009), t=ctx.currentTime;
  const osc=ctx.createOscillator(), g=ctx.createGain(), bp=ctx.createBiquadFilter(), lp=ctx.createBiquadFilter(), lfo=ctx.createOscillator(), lg=ctx.createGain();
  osc.type='sawtooth'; osc.frequency.setValueAtTime(base*.78,t); osc.frequency.exponentialRampToValueAtTime(base*1.5,t+d*.32); osc.frequency.exponentialRampToValueAtTime(base*1.02,t+d);
  lfo.frequency.value=34+Math.random()*10; lg.gain.value=base*.035; lfo.connect(lg); lg.connect(osc.frequency);
  bp.type='bandpass'; bp.frequency.value=Math.max(500,base*2.4); bp.Q.value=2.1;
  lp.type='lowpass'; lp.frequency.value=Math.max(1800,base*4.5); lp.Q.value=.5;      /* takes the edge off the sawtooth so it reads as rubber, not synth */
  ramp(g,t,.016,(o.v||1)*.5,d);
  osc.connect(bp); bp.connect(lp); lp.connect(g); g.connect(master); osc.start(t); lfo.start(t); osc.stop(t+d+.05); lfo.stop(t+d+.05); vo(osc); sq={g,osc};
  noise({f:base*2.6,f2:base*1.6,q:1.1,a:.02,d:d*.6,v:(o.v||1)*.05}); }

/* the recorded rubber duck: fetched once on the first gesture and decoded per audio context (a decoded buffer outlives kill()).
   One voice: a new squeeze fades the previous one out in a few ms, so fast repeated clicks never stack into a harsh pile-up. */
const DUCK_URL='/audio/duck-squeak.mp3'; let duckRaw=null, duckBuf=null, dv=null;
function loadDuck(){ if(duckRaw||!window.fetch) return; duckRaw=fetch(DUCK_URL).then(r=>r.ok?r.arrayBuffer():Promise.reject()).catch(()=>{ duckRaw=null; return null; }); }
function decodeDuck(c){ if(duckBuf) return Promise.resolve(duckBuf); loadDuck(); if(!duckRaw) return Promise.resolve(null);
  return duckRaw.then(ab=>ab&&new Promise(res=>c.decodeAudioData(ab.slice(0),b=>{ duckBuf=b; res(b); },()=>res(null)))); }
function duckStop(){ if(!dv) return; try{ const t=ctx.currentTime; dv.g.gain.cancelScheduledValues(t); dv.g.gain.setTargetAtTime(.0001,t,.006); dv.src.stop(t+.04); }catch(e){} dv=null; }
function duckPlay(o){ o=o||{}; const c=ctx; const go=b=>{ if(!b||c!==ctx||!on||document.hidden) return; duckStop();
    const src=c.createBufferSource(), g=c.createGain(); src.buffer=b; src.playbackRate.value=o.rate||1; g.gain.value=o.v||.9; src.connect(g); g.connect(master); src.start(); vo(src); dv={src,g}; };
  if(duckBuf) go(duckBuf); else { const asked=performance.now(); decodeDuck(c).then(b=>{ if(performance.now()-asked<250) go(b); }); } }   /* the very first squeeze waits for the file; a late one is dropped rather than played out of time */

/* a cartoon duck's voice: a buzzy sawtooth through two nasal formants, pitch sliding from f to f2 (rough adds a grumble) */
function quack(o){ if(voices>16) return; const t=ctx.currentTime+(o.at||0), d=o.d||.12, osc=ctx.createOscillator(), g=ctx.createGain(), f1=ctx.createBiquadFilter(), f2=ctx.createBiquadFilter(), mix=ctx.createGain();
  osc.type='sawtooth'; osc.frequency.setValueAtTime(jit(o.f,.04),t); osc.frequency.exponentialRampToValueAtTime(o.f2||o.f,t+d);
  if(o.rough){ const l=ctx.createOscillator(), lg=ctx.createGain(); l.frequency.value=28; lg.gain.value=o.f*.08; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t+d+.05); }
  f1.type='bandpass'; f1.frequency.value=1050; f1.Q.value=3.2; f2.type='bandpass'; f2.frequency.value=2300; f2.Q.value=4; mix.gain.value=.6;
  osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(mix); mix.connect(g); ramp(g,t,.012,(o.v||.5)*.6,d); g.connect(master);
  osc.start(t); osc.stop(t+d+.06); vo(osc); }

/* ---- the effects ---- */
const FX={
  wood(){ tone({f:jit(560),f2:jit(330),d:.07,v:.4,type:'sine'}); tone({f:jit(1150),f2:700,d:.03,v:.14,type:'triangle'}); noise({f:1900,q:2.5,d:.018,v:.16}); },
  turn(){ noise({f:320,f2:900,q:3,d:.2,a:.04,v:.06}); tone({f:190,f2:250,d:.2,a:.05,v:.05,type:'triangle',lp:600}); tone({f:2100,f2:1400,at:.2,d:.045,v:.075,type:'triangle',lp:2000}); noise({at:.2,f:2200,q:3,d:.02,v:.1}); },
  ticks(n){ n=Math.max(1,Math.min(6,n|0||1)); for(let i=0;i<n;i++){ const at=i*.034; tone({f:jit(1000+i*40,.05),f2:700,at,d:.028,v:.13,type:'triangle'}); noise({at,f:2400,q:3,d:.012,v:.05}); } },
  chomp(){ tone({f:300,f2:110,d:.1,v:.42,type:'sine'}); noise({type:'lowpass',f:1400,f2:400,d:.05,v:.24}); tone({f:900,f2:500,at:.012,d:.03,v:.1,type:'triangle'}); },
  coinslide(){ noise({type:'highpass',f:3200,f2:2400,d:.13,a:.02,v:.09}); tone({f:jit(1750),d:.09,v:.09,type:'sine'}); tone({f:jit(2600),at:.02,d:.07,v:.05,type:'sine'}); },
  goldchime(){ [[659.25,0],[1318.5,.005],[1975.5,.09],[2637,.18]].forEach(([f,at],i)=>tone({f,at,d:i?.5:.6,v:i?.09:.12,type:'sine'})); },
  pennycollect(){ tone({f:1800,f2:1500,d:.08,v:.16}); tone({f:2700,at:.02,d:.06,v:.08}); },
  pluck(i){ const scale=[0,2,4,7,9,12,14,16,19,21,24,26,28,31,33], f=196*Math.pow(2,scale[(i|0)%scale.length]/12); tone({f,f2:f*.995,d:.32,v:.24,type:'triangle',lp:2600}); tone({f:f*2,d:.12,v:.06,type:'sine'}); noise({f:3000,q:2,d:.01,v:.05}); },
  ping(){ tone({f:1568,d:.16,v:.09}); tone({f:2093,at:.03,d:.1,v:.04}); },
  undo(){ tone({f:jit(494),f2:jit(392),glide:.1,d:.17,v:.26,type:'triangle',lp:2200}); tone({f:988,d:.08,v:.05,type:'sine'}); },
  /* results: one cue each, played once when the result is confirmed. win is short and bright (a quick rising arpeggio
     landing on a chord with a little sparkle); lose is a gentle comic "wah-wah" sliding down, soft and short, never a
     buzzer; draw is two even, neutral notes; roundend is the shared screen's neutral close (a soft two-note bell) */
  win(){ [[523.25,0],[659.25,.075],[783.99,.15]].forEach(([f,at])=>tone({f,at,d:.11,v:.12,type:'triangle',lp:3400}));
    [1046.5,1318.5,1567.98].forEach((f,i)=>tone({f,at:.24+i*.012,d:.42,v:i?.06:.1,type:'triangle',lp:4200}));
    [2093,2637].forEach((f,i)=>tone({f,at:.3+i*.07,d:.12,v:.03})); },
  lose(){ const wah=(at,f0,f1,d,v)=>{ if(voices>16) return; const t=ctx.currentTime+at, osc=ctx.createOscillator(), g=ctx.createGain(), lp=ctx.createBiquadFilter(), lfo=ctx.createOscillator(), lg=ctx.createGain();
      osc.type='sawtooth'; osc.frequency.setValueAtTime(f0,t); osc.frequency.exponentialRampToValueAtTime(f1,t+d);
      lfo.frequency.value=6.5; lg.gain.value=f0*.018; lfo.connect(lg); lg.connect(osc.frequency);
      lp.type='lowpass'; lp.Q.value=4; lp.frequency.setValueAtTime(380,t); lp.frequency.exponentialRampToValueAtTime(1100,t+d*.35); lp.frequency.exponentialRampToValueAtTime(320,t+d);   // the mute opening and closing: "wah"
      ramp(g,t,.03,v,d); osc.connect(lp); lp.connect(g); g.connect(master); osc.start(t); lfo.start(t); osc.stop(t+d+.08); lfo.stop(t+d+.08); vo(osc); };
    wah(0,311.13,293.66,.24,.11); wah(.27,277.18,261.63,.24,.1); wah(.54,246.94,207.65,.6,.1); },
  draw(){ tone({f:440,d:.16,v:.09,type:'triangle',lp:2400}); tone({f:440,at:.2,d:.26,v:.08,type:'triangle',lp:2400}); tone({f:659.25,at:.2,d:.26,v:.035}); },
  roundend(){ [[783.99,0,.5],[1174.66,.16,.7]].forEach(([f,at,d])=>{ tone({f,at,d,v:.09}); tone({f:f*2.01,at,d:d*.5,v:.02}); }); },
  success(){ [[784,0],[1046.5,.085],[1318.5,.17]].forEach(([f,at],i)=>tone({f,at,d:i===2?.3:.09,v:.11,type:'triangle',lp:3400})); },
  squeak(k){ squeak(k); },
  deflate(){ const t=ctx.currentTime, osc=ctx.createOscillator(), g=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain(); if(sq){ try{ sq.osc.stop(); }catch(e){} sq=null; } osc.type='sine'; osc.frequency.setValueAtTime(1350,t); osc.frequency.exponentialRampToValueAtTime(260,t+.5); lfo.frequency.value=22; lg.gain.value=26; lfo.connect(lg); lg.connect(osc.frequency); ramp(g,t,.03,.1,.5); osc.connect(g); g.connect(master); osc.start(t); lfo.start(t); osc.stop(t+.6); lfo.stop(t+.6); vo(osc); setTimeout(()=>{ if(ctx&&on) squeak(0,{f:1100,d:.07,v:.6}); },500); },
  surprise(){ squeak(0,{f:1500,d:.09,v:.9}); },
  flutter(){ [0,.05,.1,.15].forEach((at,i)=>noise({at,f:2600-i*250,q:2,d:.03,v:.09})); },
  /* rubber-toy sounds for the runner and the About duck (they share the squeak voice, so quick repeats cut each other off instead of stacking) */
  jsqueak(){ duckPlay({rate:jit(1.04,.05),v:.75}); },
  /* the About duck: the same squeeze each click, a touch lower as the duck grows (level 0..12) */
  duck(k){ duckPlay({rate:jit(1.06-Math.min(12,k|0)*.018,.025),v:.9}); },
  boop(){ if(sq){ try{ const t0=ctx.currentTime; sq.g.gain.cancelScheduledValues(t0); sq.g.gain.setTargetAtTime(.0001,t0,.008); sq.osc.stop(t0+.05); }catch(e){} sq=null; }
    const t=ctx.currentTime, osc=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter(), lfo=ctx.createOscillator(), lg=ctx.createGain(); const base=jit(340,.06);
    osc.type='sine'; osc.frequency.setValueAtTime(base*1.12,t); osc.frequency.exponentialRampToValueAtTime(base*.72,t+.13); lfo.frequency.value=28; lg.gain.value=base*.03; lfo.connect(lg); lg.connect(osc.frequency);
    f.type='lowpass'; f.frequency.value=1200; ramp(g,t,.012,.3,.13); osc.connect(f); f.connect(g); g.connect(master); osc.start(t); lfo.start(t); osc.stop(t+.2); lfo.stop(t+.2); vo(osc); sq={g,osc}; },
  /* the giant duck's wings say hello: a soft, short two-note cartoon quack (a nasal buzz through a small formant), well under game feedback */
  greet(){ const t=ctx.currentTime; [[0,640,470,.085],[.105,560,410,.1]].forEach(([at,f0,f1,d])=>{ const osc=ctx.createOscillator(), g=ctx.createGain(), bp=ctx.createBiquadFilter(), lp=ctx.createBiquadFilter(), b=jit(1,.03);
      osc.type='sawtooth'; osc.frequency.setValueAtTime(f0*b,t+at); osc.frequency.exponentialRampToValueAtTime(f1*b,t+at+d);
      bp.type='bandpass'; bp.frequency.value=1150; bp.Q.value=3.2; lp.type='lowpass'; lp.frequency.value=2300; lp.Q.value=.4;
      ramp(g,t+at,.012,.16,d); osc.connect(bp); bp.connect(lp); lp.connect(g); g.connect(master); osc.start(t+at); osc.stop(t+at+d+.05); vo(osc); }); },
  softland(){ tone({f:190,f2:120,d:.04,v:.05}); },
  hop(){ tone({f:300,f2:640,d:.07,v:.24,type:'triangle'}); },
  land(){ tone({f:170,f2:90,d:.05,v:.22}); noise({type:'lowpass',f:900,d:.02,v:.07}); },
  bump(){ tone({f:250,f2:60,d:.17,v:.4,type:'sine'}); noise({type:'lowpass',f:800,f2:300,d:.07,v:.2}); },
  splash(){ noise({f:1900,f2:520,q:.8,d:.24,a:.008,v:.2}); noise({type:'lowpass',f:700,d:.14,v:.1}); tone({f:400,f2:180,d:.09,v:.09}); },
  duckling(){ squeak(0,{f:1700,d:.09,v:.55}); },
  /* player reactions (react.js): one short sound each, from the same rubber-duck voice, all well under game feedback */
  /* reactions: short cartoon duck voices, one per face, never a notification beep. Each plays once. */
  'r-happy'(){ duckPlay({rate:jit(1.16,.03),v:.5}); quack({f:520,f2:760,at:.15,d:.11,v:.5}); },
  'r-frustrated'(){ quack({f:330,f2:210,d:.2,v:.55,rough:1}); quack({f:290,f2:200,at:.24,d:.14,v:.35,rough:1}); },
  'r-surprised'(){ quack({f:620,f2:1240,d:.09,v:.55}); squeak(0,{f:1500,d:.09,v:.45}); },
  'r-cheeky'(){ duckPlay({rate:jit(1.32,.03),v:.42}); tone({f:700,f2:1500,at:.13,d:.22,glide:.18,v:.05,type:'sine'}); },
  'r-nod'(){ quack({f:380,f2:340,d:.09,v:.38}); quack({f:440,f2:500,at:.17,d:.11,v:.4}); },
  /* the move timer (turn-timer.js): a soft wooden tick near the end of a move (a touch higher in the last three seconds),
     and a low two-note close when time runs out. Quieter than a move. */
  clock(k){ tone({f:k?1180:980,f2:k?900:760,d:.035,v:.09,type:'triangle'}); noise({f:2600,q:3,d:.012,v:.035}); },
  timeup(){ tone({f:520,f2:500,d:.14,v:.16,type:'triangle'}); tone({f:392,f2:380,at:.16,d:.24,v:.16,type:'triangle'}); },
  swish(){ noise({type:'highpass',f:3000,f2:700,d:.14,a:.02,v:.12}); },
  clack(){ tone({f:330,f2:210,d:.07,v:.34}); tone({f:520,f2:380,d:.05,v:.14,type:'triangle'}); noise({f:1500,q:2,d:.02,v:.16}); },
  cheer(){ [1046.5,1318.5,1568].forEach((f,i)=>tone({f,at:i*.06,d:.13,v:.08})); },
  pb(){ FX.goldchime(); tone({f:3136,at:.26,d:.3,v:.06}); },
  /* the homepage Play triangle: one short, soft plucked note that bends up a touch, with a small playful overtone */
  playpluck(){ const f=jit(659.25,.015); tone({f:f*.93,f2:f,glide:.035,d:.34,v:.2,type:'triangle',lp:3000}); tone({f:f*2,f2:f*2.02,at:.012,d:.16,v:.05,type:'sine'}); tone({f:f*1.5,at:.045,d:.1,v:.03,type:'sine'}); noise({f:3200,q:2,d:.012,v:.04}); },
  /* pressing a game card: a smooth, muted tap, softer than the Play pluck */
  /* party rooms: a soft snare roll that builds for about a second and a half before a reveal, then one soft hit */
  drumroll(){ let at=0; for(let i=0;i<30;i++){ const k=i/29; noise({at,f:1700+k*500,q:.9,d:.045,a:.002,v:.035+k*.09}); at+=.068-k*.036; }
    noise({at:at+.03,type:'highpass',f:5200,f2:2600,d:.55,a:.004,v:.09}); tone({at:at+.03,f:130,f2:70,d:.22,v:.28,type:'sine'}); },
  /* a player pressed Ready: two quick bright notes, quieter than a result */
  readyup(){ tone({f:988,d:.08,v:.08,type:'triangle',lp:3200}); tone({f:1480,at:.07,d:.14,v:.07,type:'triangle',lp:3600}); },
  /* a vote or answer came in: the lightest wooden tick */
  votein(){ tone({f:jit(880,.08),f2:620,d:.035,v:.06,type:'triangle'}); },
  cardtap(){ tone({f:jit(390),f2:230,d:.075,v:.22,type:'sine',lp:1100,a:.006}); noise({type:'lowpass',f:900,d:.016,v:.035,a:.004}); }
};
const MIN={clock:300,timeup:1500,win:1200,lose:1200,draw:1200,roundend:1500,greet:2500,duck:45,drumroll:1500,readyup:90,votein:140,jsqueak:90,boop:150,softland:80,cardtap:300,playpluck:250,hop:70,land:60,ticks:60,wood:40,duckling:120,squeak:25,splash:120,ping:100};
/* names that mark an important result -- these briefly duck the background music (see music.js's ZMusic.duck) */
const DUCK_ON=new Set(['win','lose','draw','roundend','success','pb','goldchime','cheer','deflate','drumroll']);
function play(name,arg){ if(!on||document.hidden||!FX[name]) return; if(!rate(MIN[name],name)) return; if(window.ZS&&ZS.trace) ZS.trace(name); if(!ensure()) return; try{ FX[name](arg); }catch(e){} if(DUCK_ON.has(name)&&window.ZMusic) window.ZMusic.duck(); }

/* a soft wooden creak while a bridge grows: one low voice whose pitch follows the length */
const creak={ start(){ if(!on||document.hidden||cr||!ensure()) return; const t=ctx.currentTime, osc=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter(), lfo=ctx.createOscillator(), lg=ctx.createGain(); osc.type='sawtooth'; osc.frequency.value=70; f.type='bandpass'; f.frequency.value=260; f.Q.value=4; lfo.frequency.value=8; lg.gain.value=.012; g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(.03,t+.08); lfo.connect(lg); lg.connect(g.gain); osc.connect(f); f.connect(g); g.connect(master); osc.start(t); lfo.start(t); cr={osc,g,lfo,f}; },
  set(len){ if(!cr||!ctx) return; const t=ctx.currentTime; cr.osc.frequency.setTargetAtTime(64+len*7+Math.sin(len*9)*6,t,.05); cr.f.frequency.setTargetAtTime(220+len*30,t,.05); },
  stop(){ if(!cr) return; const c=cr; cr=null; try{ const t=ctx.currentTime; c.g.gain.cancelScheduledValues(t); c.g.gain.setTargetAtTime(.0001,t,.03); c.osc.stop(t+.15); c.lfo.stop(t+.15); }catch(e){} } };

/* ---- the speaker button ---- */
/* muted = the same speaker, dimmed, with one diagonal slash drawn across the whole glyph. The slash has a gap stroke
   in the button's own surface colour under it, so it reads as crossing the speaker rather than merging with it.
   music.js draws its note with the same slash (MUTE_SLASH), so both buttons say "off" the same way. */
const SPEAKER='<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" stroke="none"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
const MUTE_SLASH='<path class="mute-gap" d="M4 4l16 16" fill="none" stroke-width="5" stroke-linecap="round"/><path d="M4 4l16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
const ICON_ON='<svg viewBox="0 0 24 24" aria-hidden="true">'+SPEAKER+'</svg>';
const ICON_OFF='<svg viewBox="0 0 24 24" aria-hidden="true"><g opacity=".55">'+SPEAKER+'</g>'+MUTE_SLASH+'</svg>';
const btns=[];
function paint(){ btns.forEach(b=>{ b.innerHTML=on?ICON_ON:ICON_OFF; b.setAttribute('aria-label','Sound effects'); b.setAttribute('data-tip',on?'Sound effects on':'Sound effects muted'); b.setAttribute('aria-pressed',on?'true':'false'); }); }
function set(v,quiet){ on=!!v; try{ localStorage.setItem(KEY,on?'on':'off'); }catch(e){} if(!on) kill(); paint(); window.dispatchEvent(new CustomEvent('zf-sound',{detail:{on}})); if(on&&!quiet){ ensure(); play('ping'); } }
function build(){ document.querySelectorAll('.themesw').forEach(sw=>{ if(sw.previousElementSibling&&sw.previousElementSibling.classList.contains('soundsw')) return; const b=document.createElement('button'); b.type='button'; b.className='soundsw'; b.addEventListener('click',()=>set(!on)); sw.parentNode.insertBefore(b,sw); btns.push(b); }); paint(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
document.addEventListener('visibilitychange',()=>{ if(document.hidden) kill(); });
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>{ if(on&&ensure()){ loadDuck(); decodeDuck(ctx); } },{capture:true,passive:true}));
document.addEventListener('click',e=>{ if(e.button>0||!e.target.closest) return; const c=e.target.closest('.gcard'); if(!c||e.target.closest('.rules-link')) return; play('cardtap'); });
window.ZS={ play, creak, set, isOn:()=>on, toggle:()=>set(!on), MUTE_SLASH };
})();
