/* turn-timer.js: an optional per-move timer for the two-player turn-based games (the ones with a matchup, match.js).
   Off by default, so untimed play, learning and accessibility stay as they were. Chosen before play under Advanced
   settings on the setup screen (with the limit shown there), and from the in-game Settings.
     Standard 60 s · Quick 30 s · Thinking time 120 s · Custom · No timer
   Games that ask for deeper calculation (DEEP below) suggest longer limits: half as long again.
   In a timed game the matchup shows a thin bar and the seconds left under the turn label. Both reset whenever the turn
   passes. In the last 10 seconds (or the last fifth of a short limit) the number darkens and blinks once a second,
   with a soft tick through the site's sound-effects switch (ZS), so muting sound effects silences it.
   The outcome is fixed before play: when the time runs out, the player to move loses that game, and the match score
   counts it once (match.js timeout). No move is ever chosen for anyone.
   Local games: only the human player's turns are timed (the computer moves on its own), and the clock pauses while a
   blocking panel is open (How to play, Settings, a dialog) or the tab is hidden. Online: the room server owns the
   deadline (room-server.js), so a background tab, a reload or a reconnect never resets it, and opening a panel here
   never stops the shared clock. A change of limit during an online match is a request the other player must accept.
   Games with their own round timing (party games, Tail Thief, Duck Trap) never get a second timer: only the games with a
   matchup are timed at all.
   ZFTimer.sync(root, view, clockEl) (match.js)   ZFTimer.secs(slug)   ZFTimer.settingsRow(body)   ZFTimer.label(secs) */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const KEY='zf-move-timer';
const MODES=[['off','No timer'],['quick','Quick'],['standard','Standard'],['think','Thinking time'],['custom','Custom']];
const BASE={quick:30,standard:60,think:120};
const DEEP={'connect-four':1,pentago:1,quarto:1,'recursive-tic-tac-toe':1,'3d-tic-tac-toe':1,domineering:1,sim:1,'toot-otto':1,chomp:1};
const slugNow=()=>location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0]||'';
const lsGet=(k,d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } };
const lsSet=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const pref=()=>Object.assign({mode:'off',custom:90},lsGet(KEY,{})||{});
const factor=slug=>DEEP[slug||slugNow()]?1.5:1;
/* seconds per move for a mode in this game (0 = no timer) */
function secsFor(mode,custom,slug){ if(mode==='off') return 0; if(mode==='custom') return Math.max(10,Math.min(600,custom|0||90)); return Math.round(BASE[mode]*factor(slug)); }
const secs=slug=>{ const p=pref(); return secsFor(p.mode,p.custom,slug); };
const label=s=>!s?'No timer':s<60?`${s} s per move`:s%60?`${Math.floor(s/60)} min ${s%60} s per move`:`${s/60} min per move`;
const clock=ms=>{ const t=Math.max(0,Math.ceil(ms/1000)); return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`; };

const CSS=`
.zt-adv{margin-top:14px;max-width:560px;border-top:1px solid var(--g2);padding-top:10px}
.zt-adv>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;min-height:40px;font:700 11.5px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5)}
.zt-adv>summary::-webkit-details-marker{display:none}
.zt-adv>summary::before{content:"";width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg);transition:transform .15s;margin-right:2px}
.zt-adv[open]>summary::before{transform:rotate(45deg)}
.zt-adv>summary .zt-now{margin-left:auto;font:600 13px var(--font-sans);letter-spacing:0;text-transform:none;color:var(--fg)}
.zt-adv>summary:focus-visible{outline:2px solid var(--fg);outline-offset:2px;border-radius:6px}
.zt-row{display:flex;flex-direction:column;gap:8px;padding:6px 0 4px}
.zt-row .glabel,.zt-row .gs-label{margin:0}
.zt-seg{display:flex;flex-wrap:wrap;gap:6px}
.zt-seg button{min-height:40px;padding:0 14px;border:1.5px solid var(--g3);border-radius:999px;background:transparent;color:var(--fg);font:600 13.5px var(--font-sans);cursor:pointer}
.zt-seg button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.zt-seg button:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.zt-seg button small{font-weight:500;opacity:.75;margin-left:5px}
.zt-cust{display:flex;align-items:center;gap:8px;font:600 13.5px var(--font-sans);color:var(--g6)}
.zt-cust[hidden]{display:none}
.zt-cust input{width:84px;min-height:40px;box-sizing:border-box;padding:0 10px;border:1.5px solid var(--g3);border-radius:10px;background:var(--bg);color:var(--fg);font:600 15px var(--font-sans)}
.zt-cust input:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
.zt-note{margin:0;font:500 13px/1.45 var(--font-sans);color:var(--g6)}
.zt-note b{color:var(--fg)}
`;
const st=document.createElement('style'); st.id='zt-css'; st.textContent=CSS; document.head.appendChild(st);

/* ---- the picker (setup's Advanced settings, in-game Settings, the online room dialog) ---- */
function pickerHTML(id,cur,custom){ const slug=slugNow();
  return `<div class="zt-seg" role="group" aria-label="Move timer">${MODES.map(([m,l])=>{ const sec=m==='off'||m==='custom'?0:secsFor(m,0,slug); return `<button type="button" data-zt="${m}" aria-pressed="${m===cur}">${l}${sec?`<small>${sec} s</small>`:''}</button>`; }).join('')}</div>
    <label class="zt-cust" ${cur==='custom'?'':'hidden'}>Seconds per move <input type="number" inputmode="numeric" min="10" max="600" step="5" id="${id}" value="${custom}"></label>`; }
function wire(box,onChange){ const P=pref();
  const set=(mode,custom)=>{ const p=pref(); if(mode) p.mode=mode; if(custom!=null) p.custom=Math.max(10,Math.min(600,custom|0||90)); lsSet(KEY,p);
    box.querySelectorAll('[data-zt]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.zt===p.mode)); const c=box.querySelector('.zt-cust'); if(c) c.hidden=p.mode!=='custom';
    onChange&&onChange(secs()); paintSetups(); };
  box.querySelectorAll('[data-zt]').forEach(b=>b.onclick=()=>set(b.dataset.zt));
  const inp=box.querySelector('.zt-cust input'); if(inp) inp.onchange=()=>set(null,+inp.value);
  return P; }
const OUTCOME='If the time runs out, the player to move <b>loses that game</b> and the match score counts it. No move is made for anyone.';

/* setup screens: an Advanced settings section above Start, showing the chosen limit even while it is closed */
const SETUPS=['setup','nimSetup','chSetup','gxSetup'], STARTS={setup:'startBtn',nimSetup:'nStart',chSetup:'cStart',gxSetup:'gxStart'};
function setupApplies(sec){ const S=$(sec); if(!S||!S.classList.contains('show')) return false;
  const box=S.querySelector('.zm-whobox'); return !!(box&&!box.hidden); }   // only where the matchup's players are chosen (two-player games)
function paintSetup(sec){ const S=$(sec); if(!S) return; let d=S.querySelector('.zt-adv'); const on=setupApplies(sec);
  if(!on){ if(d) d.hidden=true; return; }
  const p=pref(), sec2=secs();
  if(!d){ const start=$(STARTS[sec]); if(!start) return;
    d=document.createElement('details'); d.className='zt-adv';
    start.insertAdjacentElement('beforebegin',d); }
  d.hidden=false;
  const html=`<summary>Advanced settings <span class="zt-now">Move timer: ${label(sec2).replace(' per move','')}</span></summary><div class="zt-row"><div class="glabel">Move timer</div>${pickerHTML('ztC-'+sec,p.mode,p.custom)}<p class="zt-note">${sec2?OUTCOME:'Untimed: take as long as you like.'}</p></div>`;
  if(d.dataset.h===html) return; const open=d.open; d.dataset.h=html; d.innerHTML=html; d.open=open; wire(d); }
function paintSetups(){ SETUPS.forEach(paintSetup); }
document.addEventListener('click',()=>{ if(document.querySelector('.entry.show')) setTimeout(paintSetups,30); });
document.addEventListener('DOMContentLoaded',()=>{ const mo=new MutationObserver(()=>setTimeout(paintSetups,30)); SETUPS.forEach(id=>{ const S=$(id); if(S) mo.observe(S,{attributes:true,attributeFilter:['class']}); }); paintSetups(); });
setTimeout(paintSetups,200);

/* in-game Settings: the same choice. Local: it applies at once, with a fresh clock for the move in progress. Online: the
   room's limit, and a request to change it that the other player accepts or declines. */
function settingsRow(body){ const v=window.ZFMatch&&ZFMatch.current(); if(!v||!body) return;
  const row=document.createElement('div'); row.className='gs-row zt-row';
  if(v.opp==='online'){ const rm=ZFMatch.roomOf&&ZFMatch.roomOf(v), now=rm&&rm.timer||0, c=client(v);
    row.innerHTML=`<div class="gs-label">Move timer</div><p class="zt-note">This room: <b>${label(now)}</b>. ${now?'The room server keeps the clock, so it runs the same for both of you.':''}</p><div class="zt-seg" role="group" aria-label="Ask to change the move timer">${[0,30,60,90,120,180].map(x=>`<button type="button" data-ask="${x}" aria-pressed="${x===now}">${x?x+' s':'None'}</button>`).join('')}</div><p class="zt-note">A change needs ${esc((v.online&&v.online.opponentNickname)||'your friend')} to accept.</p>`;
    row.querySelectorAll('[data-ask]').forEach(b=>b.onclick=()=>{ const x=+b.dataset.ask; if(x===now||!c||!rm) return; c.sendMsg({t:'request',kind:'timer',secs:x,code:rm.code,token:rm.myToken}); row.querySelector('.zt-note:last-child').textContent='Asked. The change applies once it is accepted.'; });
    body.appendChild(row); return; }
  row.innerHTML=`<div class="gs-label">Move timer</div>${pickerHTML('ztC-g',pref().mode,pref().custom)}<p class="zt-note">${OUTCOME}</p>`;
  wire(row,()=>{ const r=state[v.root]; if(r){ r.key=''; } tickAll(); });
  body.appendChild(row); }
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const client=v=>{ const code=v&&v.online&&v.online.code; return (window.__zfRoomClients||[]).find(c=>c.room&&c.room.code&&(!code||c.room.code===code)); };

/* ---- the running clock ---- */
const state={};   // root -> {key, left (ms), last (ms timestamp), total, el, v, warned}
const blocking=()=>!!document.querySelector('#gdrawer.open,.gdialog.open')||document.hidden;
/* local: is the player to move a person at this device? */
const humanTurn=v=>{ const p=v.players[v.turn-1]; return !!p&&!p.cpu&&(v.opp==='2p'||p.you); };
function sync(root,v,el){ let r=state[root]; if(!v||!el){ if(r){ r.v=null; if(r.el) r.el.classList.remove('on'); } return; }
  if(!r) r=state[root]={key:'',left:0,last:0,total:0}; r.v=v; r.el=el;
  if(v.opp==='online'){ const rm=ZFMatch.roomOf&&ZFMatch.roomOf(v); r.online=rm; r.total=(rm&&rm.timer||0)*1000; r.key=''; }
  else { r.online=null; const total=secs()*1000, key=[v.turn,v.len,total].join(':'), gi=v.s;
    if(r.gi!==gi||r.key!==key){ r.gi=gi; r.key=key; r.total=total; r.left=total; r.last=performance.now(); r.warned=0; r.fired=false; } }
  draw(root); loop(); }
function draw(root){ const r=state[root], v=r&&r.v, el=r&&r.el; if(!v||!el) return;
  let left, show, paused=false;
  if(r.online){ const rm=r.online; show=!!(rm.timer&&rm.status==='active'&&!rm.over&&(rm.deadline||rm.remaining));
    left=rm.deadline?rm.deadline-(Date.now()+(rm.skew||0)):(rm.remaining||0); paused=!rm.deadline&&!!rm.remaining; }
  else { show=r.total>0&&!v.over&&humanTurn(v); paused=blocking(); left=r.left; }
  el.classList.toggle('on',!!show); if(!show){ el.removeAttribute('aria-label'); return; }
  const total=r.online?r.total:r.total, frac=Math.max(0,Math.min(1,left/(total||1))), warnAt=Math.min(10000,total*.2), warn=left<=warnAt;
  el.querySelector('.zm-bar i').style.setProperty('--p',frac.toFixed(4));
  const t=clock(left); const sEl=el.querySelector('.zm-secs'); if(sEl.textContent!==t) sEl.textContent=t;
  el.classList.toggle('warn',warn&&left>0); el.classList.toggle('paused',paused);
  el.setAttribute('aria-label',`${t} left for this move${paused?', paused':''}`);
  /* a soft tick as the warning starts, then once a second in the last five */
  const sec=Math.ceil(left/1000); if(warn&&left>0&&!paused&&r.warned!==sec&&(r.warned===0||sec<=5)){ r.warned=sec; if(window.ZS) ZS.play('clock',sec<=3?1:0); }
  if(!r.online&&left<=0&&!r.fired){ r.fired=true; expire(root); } }
function expire(root){ const r=state[root], v=r&&r.v; if(!v||v.over) return;
  if(window.ZS) ZS.play('timeup');
  if(window.ZFMatch&&ZFMatch.timeout(v.turn)){ const loser=v.players[v.turn-1], winner=v.players[2-v.turn];
    const lname=loser.you&&v.opp!=='2p'?'You':loser.nick, wname=winner.you&&v.opp!=='2p'?'You':winner.cpu?'The computer':winner.nick;
    if(window.ZFShell&&ZFShell.timeUp) ZFShell.timeUp(root,{title:`${wname} won on time`,detail:`${lname} ran out of time on this move, so ${lname==='You'?'you lose':'they lose'} this game.`}); } }
let raf=0, lastT=0;
function loop(){ if(raf) return; lastT=performance.now(); const step=now=>{ raf=0; const dt=now-lastT; lastT=now; let any=false;
    for(const root in state){ const r=state[root]; if(!r.v||!r.el||!r.el.isConnected) continue;
      if(!r.online){ if(r.total>0&&!r.v.over&&humanTurn(r.v)&&!r.fired){ any=true; if(!blocking()) r.left-=dt; } }
      else if(r.online&&r.online.timer&&r.online.status==='active') any=true;
      draw(root); }
    if(any) raf=requestAnimationFrame(step); };
  raf=requestAnimationFrame(step); }
function tickAll(){ for(const root in state){ const r=state[root]; if(r.v) sync(root,r.v,r.el); } }
document.addEventListener('visibilitychange',()=>{ lastT=performance.now(); });

window.ZFTimer={ sync, secs, secsFor, label, settingsRow, pref, paintSetups, MODES };
})();
