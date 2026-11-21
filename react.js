/* react.js: players react through their own ducks during a match.
   Your duck in the matchup is the button (a small smile beside it says so); it opens a palette of five previews of
   your own duck, already making each face:
     Happy (smiling eyes, beak a little open, one bounce) · Frustrated (lowered brow, narrowed eye, a dip and a wing
     flap) · Surprised (wide eye, raised brow, open beak, a small recoil) · Cheeky (a wink, one brow up, a tilt)
     Good move (warm smiling eye, an approving nod toward the opponent)
   Picking one plays it on that player's actual duck, drawn by the duck vector system itself (party-duck.js moods), so
   hair, beards, glasses, hats and colours never change, and there is no banner or floating word: the face says it.
   Each reaction has a quick entrance, a held expression and a smooth return to neutral, about 1.5 to 2 s. A new one
   replaces the one playing (never a queue), a short cooldown stops spamming, and with reduced motion the face changes
   without the bounce or the shake. It never pauses or blocks the game, and the turn label never moves.
   Sound: one short sound per reaction, through the site's sound-effects switch (ZS), so muting music alone leaves it
   on and muting sound effects silences it at once. The sender hears it once, when it plays; an echo from the server
   is not played again.
   Online, the reaction goes to the room server, which sends it to both players with an id: the opponent's screen
   plays it once on the sender's duck, a repeated delivery is ignored, and nothing old is replayed after reconnecting
   (the server only relays; it never stores reactions).
   ZFReact.sync(root, rowEl, view) (match.js)   ZFReact.remote(msg) (online-rooms.js)   ZFReact.close() */
(function(){
'use strict';
const KINDS=(window.ZPDuck&&ZPDuck.MOODS)||[['happy','Happy'],['frustrated','Frustrated'],['surprised','Surprised'],['cheeky','Cheeky'],['nod','Good move']];
const NAME=Object.fromEntries(KINDS);
const GAP=2000;                                                                 // the cooldown between one seat's reactions
const HOLD={happy:2000,frustrated:2200,surprised:2100,cheeky:2300,nod:2000};    // entrance + held face, then the return
/* the performance: every reaction briefly enlarges the duck (it is a transform, so nothing around it moves); surprise and
   cheek also move the framing in on the face inside the duck's own box (clipped there, never over the board), hold the
   expression, then pull back out to the whole duck */
const GROW={happy:1.2,frustrated:1.17,surprised:1.22,cheeky:1.2,nod:1.16};
const ZOOM={surprised:1.9,cheeky:1.75};
const RMQ=matchMedia('(prefers-reduced-motion: reduce)');
const calmNow=()=>RMQ.matches||document.documentElement.classList.contains('calm');
const SMILE='<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.3 9.4c1.5 1.6 3.9 1.6 5.4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="5.9" cy="6.4" r="1" fill="currentColor"/><circle cx="10.1" cy="6.4" r="1" fill="currentColor"/></svg>';
const CSS=`
/* your duck is the reaction button; the smile sits beside it, on the outer side, never over the face */
.zm-duck.zr-can{cursor:pointer;border-radius:16px;-webkit-tap-highlight-color:transparent}
.zm-duck.zr-can:hover .pd{filter:brightness(1.04)}
.zm-duck.zr-can:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
.zm-duck.zr-can:active .pd{scale:.96}
.zr-ind{position:absolute;bottom:4px;left:-6px;width:20px;height:20px;padding:2px;box-sizing:border-box;border-radius:50%;background:var(--bg);color:var(--g6);border:1.5px solid var(--g3);pointer-events:none;transition:opacity .2s,color .15s}
.zm-p.r .zr-ind{left:auto;right:-6px}
.zr-ind svg{display:block;width:100%;height:100%}
.zm-duck.zr-can:hover .zr-ind,.zm-duck[aria-expanded=true] .zr-ind{color:var(--fg);border-color:var(--g5)}
.zm-duck.zr-cool .zr-ind{opacity:.35}
/* the palette: five previews of your own duck, anchored to it and kept inside the window */
.zr-pal{position:fixed;z-index:95;display:flex;gap:4px;padding:6px;border-radius:18px;background:var(--bg);border:1px solid var(--g3);box-shadow:0 12px 32px rgba(0,0,0,.2)}
.zr-pal[hidden]{display:none}
.zr-pal button{position:relative;width:62px;height:62px;margin:0;padding:0;border:none;border-radius:13px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:0;-webkit-tap-highlight-color:transparent}
.zr-pal button:hover,.zr-pal button:focus-visible{background:var(--surf2)}
.zr-pal button:focus-visible{outline:2px solid var(--fg);outline-offset:-2px}
.zr-pal button:active{scale:.94}
.zr-pal .pd{width:56px;height:57px}
.zr-pal .pd,.zr-pal .pd-svg{overflow:hidden;border-radius:10px}
.zr-tip{position:absolute;bottom:calc(100% + 6px);left:50%;translate:-50% 0;padding:3px 8px;border-radius:7px;background:var(--fg);color:var(--bg);font:600 12px/1.3 var(--font-sans);white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .12s}
.zr-pal.below .zr-tip{bottom:auto;top:calc(100% + 6px)}
@media (hover:hover){.zr-pal button:hover .zr-tip{opacity:1}}
.zr-pal button:focus-visible .zr-tip{opacity:1}
.zm-duck.zr-zoom{clip-path:inset(0 round 18px);background:var(--surf2)}
.zm-duck.zr-big{z-index:3}
.zr-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:600px){.zr-pal button{width:56px;height:56px}.zr-pal .pd{width:50px;height:51px}.zr-ind{width:18px;height:18px;bottom:2px;left:-4px}.zm-p.r .zr-ind{right:-4px}}
@media (prefers-reduced-motion:reduce){.zm-duck.zr-can:active .pd,.zr-pal button:active{scale:none}}
`;
const st=document.createElement('style'); st.id='zr-css'; st.textContent=CSS; document.head.appendChild(st);

let view=null, row=null, pal=null, palSeat=0, palFor=null;
const last={}, timers={}, seen=new Set();
const sideOf=seat=>row&&row.children[seat===1?0:2];
const duckBox=seat=>{ const s=sideOf(seat); return s&&s.querySelector('.zm-duck'); };
/* which seats can react from this device: yours; both on one shared device */
const mineSeats=v=>v.opp==='2p'?[1,2]:[v.players.findIndex(p=>p.you)+1].filter(Boolean);
let live=null; function say(t){ if(!live){ live=document.createElement('div'); live.className='zr-sr'; live.setAttribute('aria-live','polite'); document.body.appendChild(live); } live.textContent=''; setTimeout(()=>{ live.textContent=t; },30); }

function sync(root,el,v){ view=v; row=el; const can=mineSeats(v);
  [1,2].forEach(seat=>{ const box=duckBox(seat); if(!box) return; const p=v.players[seat-1], on=can.includes(seat);
    box.classList.toggle('zr-can',on);
    if(on){ if(box.getAttribute('role')!=='button'){ box.setAttribute('role','button'); box.tabIndex=0; box.setAttribute('aria-haspopup','true'); box.setAttribute('aria-expanded','false'); box.onclick=e=>{ e.stopPropagation(); toggle(seat,box); };
        box.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(seat,box); } }; }
      box.setAttribute('aria-label',v.opp==='2p'?`React as ${p.nick}`:'React with your duck');
      if(!box.querySelector('.zr-ind')){ const i=document.createElement('span'); i.className='zr-ind'; i.innerHTML=SMILE; box.appendChild(i); } }
    else if(box.getAttribute('role')==='button'){ box.removeAttribute('role'); box.removeAttribute('tabindex'); box.removeAttribute('aria-haspopup'); box.removeAttribute('aria-expanded'); box.removeAttribute('aria-label'); box.onclick=null; box.onkeydown=null; const i=box.querySelector('.zr-ind'); if(i) i.remove(); } });
  if(pal&&!pal.hidden&&!can.includes(palSeat)) close(); }

/* ---- the palette ---- */
function toggle(seat,box){ if(pal&&!pal.hidden&&palSeat===seat){ close(true); return; } open(seat,box); }
function open(seat,box){ close(); if(!view) return; palSeat=seat; palFor=box; const p=view.players[seat-1];
  if(window.ZFHintDuck) ZFHintDuck.hide();
  if(!pal){ pal=document.createElement('div'); pal.className='zr-pal'; pal.setAttribute('role','menu'); pal.hidden=true; document.body.appendChild(pal);
    pal.addEventListener('click',e=>{ e.stopPropagation(); const b=e.target.closest('[data-k]'); if(!b) return; send(palSeat,b.dataset.k); close(true); });
    pal.addEventListener('keydown',e=>{ const bs=[...pal.querySelectorAll('button')], i=bs.indexOf(document.activeElement);
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(true); }
      else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); const n=bs[(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length]; if(n) n.focus(); }
      else if(e.key==='Tab'){ close(); } }); }
  pal.setAttribute('aria-label',view.opp==='2p'?`Reactions for ${p.nick}`:'Reactions');
  pal.innerHTML=KINDS.map(([k,l])=>`<button type="button" role="menuitem" data-k="${k}" aria-label="${l}">${window.ZPDuck?ZPDuck.html({nick:p.nick,duck:p.duck},{size:'sm',crop:'mug',mood:k}).replace(/ role="img" aria-label="[^"]*"/,''):''}<span class="zr-tip" aria-hidden="true">${l}</span></button>`).join('');
  pal.hidden=false; place(); box.setAttribute('aria-expanded','true');
  const f=pal.querySelector('button'); if(f) try{ f.focus({preventScroll:true}); }catch(e){} }
/* under the duck when it fits, above it otherwise; always inside the window with an 8px margin */
function place(){ if(!pal||pal.hidden||!palFor) return; const r=palFor.getBoundingClientRect(), w=pal.offsetWidth, h=pal.offsetHeight, vw=innerWidth, vh=innerHeight, m=8;
  const right=palFor.closest('.zm-p.r'); let x=right?r.right-w:r.left; x=Math.max(m,Math.min(vw-w-m,x));
  let y=r.bottom+6, below=true; if(y+h>vh-m&&r.top-6-h>=m){ y=r.top-6-h; below=false; } y=Math.max(m,Math.min(vh-h-m,y));
  pal.style.left=Math.round(x)+'px'; pal.style.top=Math.round(y)+'px'; pal.classList.toggle('below',below); }
function close(refocus){ if(!pal||pal.hidden) return; pal.hidden=true; const b=palFor; palFor=null; if(b){ b.setAttribute('aria-expanded','false'); if(refocus&&b.isConnected) try{ b.focus({preventScroll:true}); }catch(e){} } }
document.addEventListener('pointerdown',e=>{ if(pal&&!pal.hidden&&!pal.contains(e.target)&&!(palFor&&palFor.contains(e.target))) close(); },true);
addEventListener('resize',()=>close()); addEventListener('scroll',()=>{ if(pal&&!pal.hidden) place(); },{passive:true});

/* ---- sending and playing ---- */
/* the room client for the match on screen (online-rooms.js registers each one) */
const client=()=>{ const code=view&&view.online&&view.online.code; return (window.__zfRoomClients||[]).find(c=>c.room&&(!code||c.room.code===code)&&c.room.myToken); };
const newId=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
function send(seat,kind){ if(!NAME[kind]) return; const now=Date.now(); if(last[seat]&&now-last[seat]<GAP) return; last[seat]=now; cool(seat);
  const id=newId(); seen.add(id);
  play(seat,kind,true);
  if(view&&view.opp==='online'){ const c=client(); if(c&&c.react) c.react(kind,id); } }
function cool(seat){ const b=duckBox(seat); if(!b) return; b.classList.add('zr-cool'); setTimeout(()=>{ const n=duckBox(seat); if(n) n.classList.remove('zr-cool'); },GAP); }
/* one reaction on one duck: set the mood on the duck that is already drawn (nothing is redrawn), hold it, let it go.
   A new reaction on the same duck replaces the one playing. */
const anims={};
function settle(seat){ const a=anims[seat]; if(a){ try{ a.cancel(); }catch(e){} delete anims[seat]; } const b=duckBox(seat); if(b) b.classList.remove('zr-zoom','zr-big'); }
function play(seat,kind,sound){ const box=duckBox(seat), pd=box&&box.querySelector('.pd'); if(!pd||!NAME[kind]) return;
  clearTimeout(timers[seat]); settle(seat); pd.classList.remove('pd-moving'); pd.removeAttribute('data-mood'); void pd.offsetWidth;
  pd.setAttribute('data-mood',kind); pd.classList.add('pd-moving');
  const hold=HOLD[kind]||1800;
  if(!calmNow()&&pd.animate){ const right=!!box.closest('.zm-p.r'), z=ZOOM[kind], g=GROW[kind]||1.18;
    box.classList.add('zr-big'); if(z) box.classList.add('zr-zoom');
    /* the face sits high on the duck, towards the way it looks (the right-hand duck is drawn mirrored) */
    const origin=z?(right?'33% 24%':'67% 24%'):'50% 92%', peak=z||g;
    anims[seat]=pd.animate([{scale:1,transformOrigin:origin},{scale:peak,transformOrigin:origin,offset:.14},{scale:peak,transformOrigin:origin,offset:.78},{scale:1,transformOrigin:origin}],{duration:hold,easing:'cubic-bezier(.3,.9,.3,1)'});
    anims[seat].onfinish=()=>settle(seat); }
  if(sound&&window.ZS) ZS.play('r-'+kind);
  const p=view&&view.players[seat-1]; if(p) say(`${p.you&&view.opp!=='2p'?'You':p.nick}: ${NAME[kind]}`);
  timers[seat]=setTimeout(()=>{ settle(seat); if(pd.getAttribute('data-mood')===kind){ pd.removeAttribute('data-mood'); pd.classList.remove('pd-moving'); } },hold); }
/* a reaction relayed by the room server. Our own comes back too: it already played when it was sent. */
function remote(m){ if(!view||view.opp!=='online'||!m||!NAME[m.kind]) return; const mine=(view.online&&view.online.mySeat)||view.humanIs; if(m.seat===mine) return;
  const key=m.id||`${m.seat}:${m.kind}:${m.at}`; if(seen.has(key)) return; seen.add(key); if(seen.size>200) seen.delete(seen.values().next().value);
  play(m.seat,m.kind,true); }
/* the duck was redrawn (a new name or duck): nothing to carry over, the mood simply ends */
window.ZFReact={ sync, remote, close, KINDS:KINDS.map(k=>k[0]), _play:play };
})();
