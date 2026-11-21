/* online-rooms.js — shared "online friend" room infrastructure used by every game that offers it (Nim, Domineering, …).
   One WebSocket protocol, one dialog, one connection/reconnect state machine, one visual language. A per-game adapter
   (online-nim.js, online-domineering.js) supplies only what actually differs: the setup screen's board controls, how
   to preview a board, and how to enter/drive its own live game view. Everything else — creating or joining a room,
   the invite link and code, the lobby, reconnect, leave/resign, undo/restart/rematch requests, and error screens —
   lives here exactly once. The server (server/room-server.js) is the only authority on the board; this file only ever
   shows what the server has confirmed, or a clearly-labelled draft/pending state waiting on it. */
(function(){
const $=id=>document.getElementById(id);
const WS_URL = window.ZF_ROOM_WS_URL || 'wss://zfgames-room-server.onrender.com' // set once, per host, in the page head (tools/arcade-template.html);
const LS_PREFIX='zf-room-'; // + code -> {1:{token,nickname}, 2:{token,nickname}} — room codes are unique across every game

/* ---- design-system-matched CSS: reuses the site's .start/.cancel/.gs-seg buttons and .gdialog chrome wherever
   possible, and gives every bespoke control here (code display, room bar, pending banner) the same font, radius,
   height and focus treatment as the rest of the app. No control changes width when its label changes. ---- */
const CSS=`
.on-dlg .gdialog-card{max-width:460px}
.on-body{display:flex;flex-direction:column;gap:18px}
.on-choice{display:flex;flex-direction:column;gap:10px}
.on-choice button{min-height:58px;border:1.5px solid var(--g4);border-radius:14px;background:var(--surf2);color:var(--fg);font:700 16px var(--font-sans);cursor:pointer;transition:background .15s,border-color .15s;text-align:left;padding:0 20px;display:flex;align-items:center;gap:12px}
.on-choice button:hover,.on-choice button:focus-visible{background:var(--surf3);border-color:var(--g5)}
.on-choice button:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.on-choice button svg{width:20px;height:20px;flex:none;color:var(--g5)}
.on-field{display:flex;flex-direction:column;gap:7px}
.on-field label{font:700 11.5px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5)}
.on-field input[type=text]{min-height:48px;padding:0 16px;border:1.5px solid var(--g3);border-radius:12px;background:var(--surf);color:var(--fg);font:600 15px var(--font-sans);width:100%;box-sizing:border-box}
.on-field input[type=text]:focus-visible{outline:2px solid var(--fg);outline-offset:1px;border-color:var(--fg)}
.on-field input.code-in{min-height:58px;font:800 22px var(--font-mono);letter-spacing:.16em;text-align:center;text-transform:uppercase}
.on-preview{display:flex;gap:8px;align-items:flex-end;justify-content:center;min-height:70px;padding:14px;background:var(--surf2);border-radius:14px}
.on-preview i{display:block;width:14px;border-radius:3px 3px 1px 1px;background:var(--fg)}
.on-rule{text-align:center;font:600 14px/1.45 var(--font-sans);color:var(--g6)}
.on-rule b{color:var(--fg)}
.on-code{font:800 40px/1 var(--font-mono);letter-spacing:.22em;text-align:center;padding:20px 8px;background:var(--surf2);border-radius:16px;color:var(--fg);user-select:all}
.on-link{display:flex;gap:8px;align-items:center;background:var(--surf2);border-radius:12px;padding:0 6px 0 16px;min-height:48px}
.on-link span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 13px var(--font-mono);color:var(--g6)}
.on-status{text-align:center;font:600 14px var(--font-sans);color:var(--g5)}
.on-status .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--g5);margin-right:7px;vertical-align:1px}
.on-status .dot.live{background:#3f9142}
.on-error{text-align:center;font:500 14.5px/1.5 var(--font-sans);color:var(--g6)}
.on-error b{display:block;color:var(--fg);font-size:16px;margin-bottom:6px}
.on-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch}
.on-actions .start,.on-actions .cancel,.on-actions .on-iconbtn{min-width:150px;white-space:nowrap}
.on-actions .start{flex:1;min-height:50px}
/* the site's plain secondary button — was previously unstyled here (bare browser-default chrome); this is the
   same recipe used for .gc-actions/.editactions .cancel elsewhere, so every "Copy code"/"Retry"/"Close" in these
   dialogs actually looks like a button in this design system instead of a native OS control. */
.on-actions .cancel{min-height:50px;padding:0 22px;border:1.5px solid var(--g4);border-radius:12px;background:transparent;color:var(--fg);font:600 14.5px var(--font-sans);cursor:pointer;transition:background .15s,border-color .15s}
.on-actions .cancel:hover{background:var(--surf2);border-color:var(--g5)}
.on-actions .cancel:active{background:var(--surf3)}
.on-actions .cancel:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
/* the pill-shaped icon button used for "Build your board" — same component as the site's own Customize board entry */
.on-iconbtn{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:50px;padding:0 20px;border:1.5px solid var(--g4);border-radius:999px;background:var(--surf2);color:var(--fg);font:700 14.5px var(--font-sans);cursor:pointer;transition:background .15s,border-color .15s}
.on-iconbtn:hover{background:var(--surf3);border-color:var(--g5)}
.on-iconbtn:active{background:var(--surf3);border-color:var(--g6)}
.on-iconbtn:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.on-iconbtn svg{width:16px;height:16px;flex:none}
.on-iconbtn[disabled]{opacity:.45;cursor:default;pointer-events:none}
/* buttons whose label swaps in place (Creating…/Copied/Starting…) never resize or reflow the dialog */
.on-actions button[disabled]{opacity:.55;cursor:default}
.on-actions button.copied{background:var(--g6) !important;color:var(--bg) !important;border-color:var(--g6) !important}
/* room-info bar during live play */
.on-bar{order:0;display:flex;align-items:center;gap:10px;justify-content:center;flex-wrap:wrap;width:100%;font:600 13.5px var(--font-sans);color:var(--g6);margin-bottom:2px}
.on-bar .who{padding:6px 13px;border-radius:999px;background:var(--surf2)}
.on-bar .who.me{color:var(--fg)}
.on-bar .who.turn{background:var(--fg);color:var(--bg)}
.on-bar .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--g5);margin-right:6px}
.on-bar .dot.live{background:#3f9142}
.on-bar .dot.gone{background:#b3483f}
.on-bar button.roombtn{min-height:34px;padding:0 13px;border:1.5px solid var(--g3);border-radius:999px;background:transparent;color:var(--g5);font:600 12.5px var(--font-sans);cursor:pointer;transition:color .15s,border-color .15s}
.on-bar button.roombtn:hover,.on-bar button.roombtn:focus-visible{color:var(--fg);border-color:var(--g5)}
.on-bar button.roombtn:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
.on-pending{order:0;width:100%;max-width:520px;margin:0 auto 4px;padding:12px 16px;border-radius:14px;background:var(--surf2);display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;font:600 13.5px var(--font-sans);color:var(--fg)}
.on-pending .btns{display:flex;gap:8px}
.on-pending button{min-height:38px;padding:0 16px;border:none;border-radius:11px;background:var(--fg);color:var(--bg);font:700 13px var(--font-sans);cursor:pointer;transition:opacity .15s}
.on-pending button:hover{opacity:.88}
.on-pending button.ghost{background:transparent;border:1.5px solid var(--g4);color:var(--fg)}
.on-pending button.ghost:hover{background:var(--surf3);opacity:1}
.on-select{min-height:46px;padding:0 12px;border:1.5px solid var(--g3);border-radius:12px;background:var(--surf);color:var(--fg);font:600 15px var(--font-sans);width:100%;box-sizing:border-box}
.on-select:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
.on-score{text-align:center;font:700 16px var(--font-sans);color:var(--fg);margin:2px 0 10px}
.on-setup-group{display:flex;flex-direction:column;gap:8px}
.on-setup-group .glabel{font:700 11.5px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5)}
@media (max-width:560px){
  .on-bar{font-size:12.5px}
  .on-code{font-size:32px;letter-spacing:.14em}
  .on-actions{flex-direction:column}
  .on-actions .start,.on-actions .cancel,.on-actions .on-iconbtn{width:100%;min-width:0}
  .on-choice button{min-height:54px}
}
`;
const CSS_ME=`.on-me{display:flex;align-items:center;gap:12px;padding:8px 12px 8px 6px;border-radius:14px;background:var(--surf2)}.on-me>.pd{flex:none;width:64px;height:68px}
.on-me>div{display:flex;flex-direction:column;align-items:flex-start;gap:6px}.on-me-l{font:700 11.5px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5)}
.on-me-b{min-height:38px!important;padding:0 14px!important;border-radius:999px!important;font-size:13.5px!important;white-space:nowrap}
.on-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.on-pl{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 8px;border-radius:14px;background:var(--surf2);min-width:0;text-align:center}
.on-pl>.pd{width:72px;height:76px}.on-pl b{max-width:100%;font:700 15px var(--font-sans);color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.on-pl small{font:600 12px var(--font-sans);color:var(--g5)}
.on-pl.wait{opacity:.7}.on-pl-empty{display:flex;align-items:center;justify-content:center;width:64px;height:64px;margin:6px 0;border:1.5px dashed var(--g4);border-radius:50%;font:700 22px var(--font-sans);color:var(--g5)}
.on-pair+*{margin-top:0}`;
const st=document.createElement('style'); st.textContent=CSS+CSS_ME; document.head.appendChild(st);

/* ---- one shared dialog shell (reuses the site's dialog chrome classes so it matches Settings/Customize) ---- */
const dlg=document.createElement('div'); dlg.id='zfRoomDlg'; dlg.className='gdialog on-dlg'; dlg.setAttribute('role','dialog'); dlg.setAttribute('aria-modal','true');
dlg.innerHTML=`<div class="gdialog-scrim"></div><div class="gdialog-card"><div class="gdialog-head"><h3 id="zfRoomTitle">Online friend</h3><button type="button" class="gt" data-label="Close" aria-label="Close" id="zfRoomClose">${icon('<path d="M6 6l12 12M18 6 6 18"/>')}</button></div><div class="gdialog-body on-body" id="zfRoomBody"></div></div>`;
document.body.appendChild(dlg);
function icon(d){ return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`; }
function openDlg(title){ $('zfRoomTitle').textContent=title; $('zfRoomBody').innerHTML=''; dlg.classList.add('open'); return $('zfRoomBody'); }
function closeDlg(){ dlg.classList.remove('open'); }
/* your duck before you go in: every create and join form that asks for a nickname also shows the duck you will play as,
   with Customize duck (the shared creator, over this dialog, so nothing typed here is lost). The nickname starts as the
   saved one and is remembered for next time, like the duck. The lobby then shows both players' ducks and names. */
const PROF='zf-party-profile';
const prof=()=>{ try{ return JSON.parse(localStorage.getItem(PROF)||'{}')||{}; }catch(e){ return {}; } };
const profSet=patch=>{ try{ localStorage.setItem(PROF,JSON.stringify(Object.assign(prof(),patch))); }catch(e){} };
const duckPic=(nick,duck,size)=>window.ZPDuck?ZPDuck.html({nick:nick||'You',duck:ZPDuck.clean(duck||{})},{size:size||'md'}):'';
function meRow(inp){ const f=inp.closest('.on-field'); if(!f||f.previousElementSibling&&f.previousElementSibling.classList.contains('on-me')) return;
  const p=prof(); if(!inp.value&&p.nick){ inp.value=String(p.nick).slice(0,18); inp.dispatchEvent(new Event('input',{bubbles:true})); }   // the game's own form listens for input
  const row=document.createElement('div'); row.className='on-me';
  const draw=()=>{ const q=prof(); row.innerHTML=`${duckPic(inp.value||q.nick,q.duck,'md')}<div><span class="on-me-l">Your duck</span><button type="button" class="cancel on-me-b">Customize duck</button></div>`;
    row.querySelector('button').onclick=e=>{ if(!window.ZFMatch||!ZFMatch.customize) return; ZFMatch.customize(prof().duck,inp.value||prof().nick||'You',dk=>{ profSet({duck:dk}); draw(); if(ZFMatch.paintSetup) ZFMatch.paintSetup(); },e.currentTarget); }; };
  draw(); f.parentNode.insertBefore(row,f);
  inp.addEventListener('input',()=>profSet({nick:inp.value.trim().slice(0,16)})); }
function lobbyDucks(body,room){ if(!room||!room.seats||!body||body.querySelector('.on-pair')) return;
  const me=room.mySeat||1, other=me===1?2:1, s=room.seats, P=prof();
  const one=(seat,you)=>{ const x=s[seat]||{}; const nick=you?(room.myNickname||x.nickname||'You'):(x.nickname||room.opponentNickname||''); const here=you||x.present;
    return `<div class="on-pl${here?'':' wait'}">${here?duckPic(nick,you?(x.duck||P.duck):x.duck,'md'):'<span class="on-pl-empty" aria-hidden="true">?</span>'}<b dir="auto">${esc(here?nick:'Waiting…')}</b><small>${you?'You':here?'Your friend':'Not here yet'}</small></div>`; };
  const pair=document.createElement('div'); pair.className='on-pair'; pair.innerHTML=one(me,true)+one(other,false); body.insertBefore(pair,body.firstChild); }
if(window.MutationObserver) new MutationObserver(()=>{ const b=$('zfRoomBody'); b.querySelectorAll('#zfNick,#zfNick2').forEach(meRow); }).observe($('zfRoomBody'),{childList:true,subtree:true});
let onCloseClick=null;
$('zfRoomClose').onclick=()=>{ if(onCloseClick) onCloseClick(); else closeDlg(); };
dlg.querySelector('.gdialog-scrim').onclick=()=>$('zfRoomClose').onclick();

function esc(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function normalizeCode(raw){ return String(raw||'').replace(/\s+/g,'').toUpperCase(); }
function copyText(text, btn){
  const done=()=>{ const old=btn.textContent; btn.textContent='Copied'; btn.classList.add('copied'); setTimeout(()=>{ btn.textContent=old; btn.classList.remove('copied'); },1400); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done,done);
  else { const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove(); done(); }
}
function playSound(name){ if(window.ZS) ZS.play(name); }
function loadAllSeats(code){ try{ return JSON.parse(localStorage.getItem(LS_PREFIX+code)||'{}'); }catch(e){ return {}; } }
function saveSeat(code, token, seat, nickname){ try{ const all=loadAllSeats(code); all[seat]={token,nickname}; localStorage.setItem(LS_PREFIX+code, JSON.stringify(all)); }catch(e){} }
function loadSeat(code){ const all=loadAllSeats(code); if(all[1]) return Object.assign({seat:1}, all[1]); if(all[2]) return Object.assign({seat:2}, all[2]); return null; }
function forgetRoom(code){ try{ localStorage.removeItem(LS_PREFIX+code); }catch(e){} }

/* ================= errors ================= */
function errorTitle(code){ return { not_found:'Room not found', expired:'Room expired', full:'Room full', connection_lost:'Connection lost', host_canceled:'Host canceled the room', cant_create:"Couldn't create room", pending:'Request pending', not_active:'Game not active', not_your_turn:"Not your turn", stale:'Board changed', bad_move:'Not a legal move', internal:'Something went wrong' }[code] || 'Error'; }
function showInlineError(body, e){ let n=body.querySelector('.on-inline-err'); if(!n){ n=document.createElement('p'); n.className='on-error on-inline-err'; body.appendChild(n); } n.innerHTML=`<b>${errorTitle(e.code)}</b>${esc(e.message||'')}`; }
function showRoomError(body, e, actions){
  actions = actions || {};
  const map = {
    not_found: `<button type="button" class="cancel" id="zfTryCode">Check the code</button><button type="button" class="start primary" id="zfNewRoom">Create a room</button>`,
    expired: `<button type="button" class="start primary" id="zfNewRoom">Create a new room</button>`,
    full: `<button type="button" class="cancel" id="zfClose2">Close</button>`,
    connection_lost: `<button type="button" class="start primary" id="zfRetry">Retry</button>`,
    host_canceled: `<button type="button" class="start primary" id="zfBack2">Back</button>`,
    cant_create: `<button type="button" class="start primary" id="zfRetryCreate">Retry</button>`,
  };
  const html = map[e.code] || `<button type="button" class="cancel" id="zfClose2">Close</button>`;
  body.innerHTML = `<p class="on-error"><b>${errorTitle(e.code)}</b>${esc(e.message||'')}</p><div class="on-actions">${html}</div>`;
  const byId=id=>body.querySelector('#'+id);
  if(byId('zfTryCode')) byId('zfTryCode').onclick=actions.onTryCode||closeDlg;
  if(byId('zfNewRoom')) byId('zfNewRoom').onclick=actions.onNewRoom||closeDlg;
  if(byId('zfClose2')) byId('zfClose2').onclick=closeDlg;
  if(byId('zfBack2')) byId('zfBack2').onclick=closeDlg;
  if(byId('zfRetry')) byId('zfRetry').onclick=()=>location.reload();
  if(byId('zfRetryCreate')) byId('zfRetryCreate').onclick=actions.onNewRoom||closeDlg;
}

/* ================= per-game client: connection, reconnect, generic screens ================= */
function createClient(cfg){
  // cfg: { basePath, saveSeatPrefix? (unused, shared LS_PREFIX is global), stage:()=>HTMLElement, resultEl:()=>HTMLElement,
  //        onEnterLive(room), onReturnToLobbyMidGame(room), onOpponentMoveSync(room) }
  let sock=null, room=null, pendingSentId=null, reconnectTimer=null, lastIntent=null, selfReconnecting=false, peerWasConnected=true;
  let onCreated=null, onJoined=null, onPreview=null, onErrorScreen=null, onResumed=null;
  let currentScreen=null; // 'waiting' | 'lobby' | null — drives reactive transitions instead of polling

  function inviteLink(code){ return `${location.origin}${cfg.basePath}?room=${code}`; }
  // Render's free tier (and similar) spin the room server down after 15 minutes idle; Render's own docs say a cold
  // start can take 50s or more, so the timeout has to clear that with real margin rather than just "most of the time."
  // onSlow (optional) fires in TWO stages — a quick one so "Creating…" doesn't sit unexplained for long, and a later
  // one so a genuinely slow wake still reads as "still working" rather than "probably stuck" — so a caller can swap
  // in progressively more reassuring text instead of one message doing double duty for both.
  const CONNECT_TIMEOUT_MS = 90000;
  const SLOW_CONNECT_MS = 4000, VERY_SLOW_CONNECT_MS = 20000;
  function connect(onSlow, onVerySlow){
    return new Promise((resolve,reject)=>{
      let settled=false, opened=false, s;
      try{ s=new WebSocket(WS_URL); sock=s; }catch(e){ return reject(e); }
      const slowTimer = onSlow ? setTimeout(()=>{ if(!settled) onSlow(); }, SLOW_CONNECT_MS) : null;
      const verySlowTimer = onVerySlow ? setTimeout(()=>{ if(!settled) onVerySlow(); }, VERY_SLOW_CONNECT_MS) : null;
      const clearAll=()=>{ clearTimeout(slowTimer); clearTimeout(verySlowTimer); };
      const timer=setTimeout(()=>{ if(settled) return; settled=true; clearAll(); try{ s.close(); }catch(e){} const err=new Error('connect timed out'); err.code='timeout'; reject(err); }, CONNECT_TIMEOUT_MS);
      s.onopen=()=>{ opened=true; if(settled) return; settled=true; clearTimeout(timer); clearAll(); resolve(s); };
      s.onerror=()=>{ if(opened||settled) return; settled=true; clearTimeout(timer); clearAll(); const err=new Error('connect failed'); err.code='connection_lost'; reject(err); };
      s.onclose=()=>{ if(room && (room.status==='active'||room.status==='lobby')) handleDrop(); };
      s.onmessage=e=>{ let m; try{ m=JSON.parse(e.data); }catch(err){ return; } onMessage(m); };
    });
  }
  // Fired the moment a player shows ANY intent to go online (opening the choice screen, or landing on an invite
  // link) — a plain, uncounted HTTP ping at the server's health check, well before there's a form to fill in or a
  // "Create room" click to wait on. A free-tier dyno takes the same ~50s+ to wake either way; starting that clock
  // as early as possible is the single biggest thing that can be done about it without touching the host itself.
  // no-cors + swallowed rejection: the response is never read, so a CORS-less server, a cold TCP handshake that
  // never completes, or the request racing an unrelated navigation must never surface as an error anywhere.
  let prewarmed=false;
  function prewarm(){
    if(prewarmed) return; prewarmed=true;
    try{
      const httpUrl=WS_URL.replace(/^wss:/,'https:').replace(/^ws:/,'http:').replace(/\/$/,'')+'/healthz';
      fetch(httpUrl,{mode:'no-cors',cache:'no-store'}).catch(()=>{});
    }catch(e){}
  }
  function genAttemptId(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
  // A connect()/create failure needs to read as "the server didn't answer," never as a verdict on the player's own
  // connection — and, unlike a validation error, it deserves a way forward that doesn't depend on the server at all.
  function showCreateFailure(body, btn, e, defaultLabel, {onRetry, onPlayLocally}){
    btn.disabled=false; btn.textContent=defaultLabel;
    let n=body.querySelector('.on-inline-err');
    if(!n){ n=document.createElement('div'); n.className='on-error on-inline-err'; body.appendChild(n); }
    const unreachable = e.code==='connection_lost' || e.code==='timeout';
    const title = unreachable ? "Couldn't reach the room server" : errorTitle(e.code);
    const detail = unreachable ? "The server didn't respond in time — if it's been quiet for a while it may have gone to sleep and be waking up. Your own connection may be fine — try again, or play locally for now." : (e.message||'');
    n.innerHTML=`<b>${esc(title)}</b>${esc(detail)}`;
    let actions=n.querySelector('.on-actions');
    if(!actions){ actions=document.createElement('div'); actions.className='on-actions'; actions.style.marginTop='10px'; n.appendChild(actions); }
    actions.innerHTML = unreachable
      ? `<button type="button" class="cancel" id="zfFailRetry">Retry</button><button type="button" class="start" id="zfFailLocal" style="flex:1">Play locally</button>`
      : '';
    if(unreachable){
      actions.querySelector('#zfFailRetry').onclick=onRetry;
      actions.querySelector('#zfFailLocal').onclick=onPlayLocally;
    }
  }
  /* the player's customized duck rides along with create and join, so the other side's matchup shows it (a server
     without duck support simply ignores the field) */
  function myDuck(){ try{ const p=JSON.parse(localStorage.getItem('zf-party-profile')||'{}'); return window.ZPDuck?ZPDuck.clean(p.duck||{}):(p.duck||{}); }catch(e){ return {}; } }
  function sendMsg(m){ if(m&&(m.t==='create'||m.t==='join')&&!m.duck) m=Object.assign({},m,{duck:myDuck()});
    /* the move timer chosen for a new room (turn-timer.js; the room server keeps the clock) */
    if(m&&m.t==='create'&&m.timer==null&&window.ZFTimer) m=Object.assign({},m,{timer:ZFTimer.secs()});
    if(sock && sock.readyState===sock.OPEN) sock.send(JSON.stringify(m)); }
  function peerOut(){ if(!room||!room.seats||!room.mySeat) return; const o=room.seats[room.mySeat===1?2:1]; if(window.ZFMatch) ZFMatch.setPeer({duck:o&&o.duck}); }

  function setSelfReconnecting(v){ selfReconnecting=v; if(cfg.onSelfReconnecting) cfg.onSelfReconnecting(v); }
  function handleDrop(){
    setSelfReconnecting(true);
    clearTimeout(reconnectTimer);
    let tries=0;
    const tryOnce=async()=>{
      tries++;
      try{ await connect(); if(lastIntent) sendMsg(lastIntent); else setSelfReconnecting(false); }
      catch(e){ if(tries<20) reconnectTimer=setTimeout(tryOnce, Math.min(1000*tries, 6000)); else showConnectionLostFatal(); }
    };
    reconnectTimer=setTimeout(tryOnce, 500);
  }
  function showConnectionLostFatal(){
    const body=openDlg('Connection lost');
    showRoomError(body, {code:'connection_lost', message:"The room server stopped responding. Retry, or check back in a moment."});
  }

  // currentScreen is the source of truth: once we've reactively returned to a lobby/waiting screen (e.g. after an
  // agreed "customize board"), the old game view and match object are often still sitting around unhidden/uncleared
  // (a game-specific cleanup would be extra bookkeeping for every adapter to get right) — checking currentScreen
  // first means a stale cfg.isLive() can never be mistaken for "still live" while a lobby screen is actually showing.
  function gameLive(){ return currentScreen===null && (cfg.isLive ? cfg.isLive() : false); }

  function onMessage(m){
    if(m.t==='state'){ applyState(m); return; }
    if(m.t==='react'){ if(window.ZFReact) ZFReact.remote(m); return; }
    if(m.t==='error'){
      if(selfReconnecting && gameLive()){ setSelfReconnecting(false); const body=openDlg(errorTitle(m.code)); showRoomError(body, m); return; }
      // A rejected move/request (stale version, not-your-turn, a request that raced a server-side change) must never
      // be swallowed by whatever stale onErrorScreen a much earlier dialog left wired up — that handler's dialog is
      // long closed, so the rejection would be invisible and any move-lock (see makeHook's `locked`) would stay set
      // for its full failsafe timeout, reading exactly like a click that silently did nothing. Resync from the
      // server's own snapshot when it sent one (it does for 'stale'), and let the adapter release its lock at once.
      if(gameLive()){ cfg.onLiveError && cfg.onLiveError(m); if(m.state) applyState(m.state); return; }
      if(onErrorScreen) onErrorScreen(m); return;
    }
    if(m.t==='created' && onCreated) return onCreated(m);
    if(m.t==='joined' && onJoined) return onJoined(m);
    if(m.t==='previewResult' && onPreview) return onPreview(m);
    if(m.t==='resumed' && gameLive()){ setSelfReconnecting(false); applyState(m.state); return; }
    if(m.t==='resumed' && onResumed) return onResumed(m);
    if(m.t==='resumeConflict'){ showTakeoverPrompt(); return; }
    if(m.t==='kicked'){ closeDlg(); cfg.onKicked&&cfg.onKicked(); alert('This seat is now controlled from another tab.'); return; }
  }

  function applyState(snap){
    const wasStatus = room && room.status;
    room = Object.assign(room||{}, snap);
    if(snap.now) room.skew = snap.now - Date.now();   // the server's clock against ours, for the move timer's deadline
    if(window.ZFMatch) setTimeout(()=>ZFMatch.refresh(),0);
    if(room.mySeat) saveSeat(room.code, room.myToken, room.mySeat, room.myNickname);
    const mySeat=room.mySeat, other=mySeat===1?2:1;
    room.opponentNickname = room.seats[other] && room.seats[other].nickname;
    peerOut();

    // reactive screen transitions — no polling: react the instant a state broadcast says the game moved on
    if(!gameLive()){
      if(room.status==='active' && (currentScreen==='lobby'||currentScreen==='waiting')){ currentScreen=null; cfg.onEnterLive(room); return; }
      if(room.status==='lobby' && currentScreen==='waiting'){ currentScreen='lobby'; playSound('cardtap'); cfg.onOpenLobby(room); return; }
      if(currentScreen==='lobby'){ cfg.onLobbyUpdate && cfg.onLobbyUpdate(room); }
      return;
    }

    const connNow = room.seats[other].connected;
    if(connNow && !peerWasConnected) playSound('cardtap');
    peerWasConnected = connNow;
    cfg.onLiveState(room, { wasStatus, connNow });
  }

  function showTakeoverPrompt(){
    const body=openDlg('Already open elsewhere');
    body.innerHTML=`<p class="on-error">This seat is already active in another tab or window.</p><div class="on-actions"><button type="button" class="start primary" id="zfTakeover">Play in this tab</button></div>`;
    body.querySelector('#zfTakeover').onclick=()=>{ sendMsg(Object.assign({}, lastIntent, {t:'takeover'})); };
  }

  /* ---- generic screens ---- */
  function showChoiceScreen(onCreate, onJoin){
    currentScreen=null;
    prewarm();
    const body=openDlg('Online friend');
    body.innerHTML=`<div class="on-choice">
      <button type="button" id="zfCreateBtn">${icon('<path d="M12 5v14M5 12h14"/>')}<span>Create room</span></button>
      <button type="button" id="zfJoinBtn">${icon('<path d="M9 5l7 7-7 7"/>')}<span>Join room</span></button>
    </div>`;
    /* a new room's move timer, chosen here and shown to whoever joins (the server keeps the clock) */
    if(window.ZFTimer){ const t=document.createElement('div'); t.className='on-field on-timer';
      const draw=()=>{ const cur=ZFTimer.secs(); t.innerHTML=`<label for="zfTimerSel">Move timer for a new room</label><select id="zfTimerSel" class="on-select">${[0,30,60,90,120,180].concat(cur&&![30,60,90,120,180].includes(cur)?[cur]:[]).map(x=>`<option value="${x}"${x===cur?' selected':''}>${x?x+' seconds per move':'No timer'}</option>`).join('')}</select><p class="on-rule" style="text-align:left;margin:0">${cur?'If the time runs out, the player to move loses that game.':'Untimed: take as long as you like.'}</p>`;
        t.querySelector('select').onchange=e=>{ const x=+e.target.value; let p={}; try{ p=JSON.parse(localStorage.getItem('zf-move-timer')||'{}'); }catch(err){} if(!x) p.mode='off'; else { p.mode='custom'; p.custom=x; } try{ localStorage.setItem('zf-move-timer',JSON.stringify(p)); }catch(err){} draw(); if(ZFTimer.paintSetups) ZFTimer.paintSetups(); }; };
      draw(); body.appendChild(t); }
    body.querySelector('#zfCreateBtn').onclick=onCreate;
    body.querySelector('#zfJoinBtn').onclick=onJoin;
    if(autoCreate){ autoCreate=false; onCreate(); } // arrived from /create: straight to this game's own Room settings
  }
  /* /create links to /<game>?create. That opens this game's usual Room settings dialog (its own settings, nothing
     created until the host presses Create room); the parameter is dropped at once so a reload or a shared link
     doesn't keep reopening it. */
  let autoCreate=false;
  function wantsCreate(){
    const u=new URL(location.href);
    if(!u.searchParams.has('create') || u.pathname.replace(/\/$/,'')!==cfg.basePath.replace(/\/$/,'')) return false;
    history.replaceState(history.state,'',u.pathname+u.hash); return true;
  }

  function showWaitingScreen(){
    currentScreen='waiting';
    const body=openDlg('Your room is ready');
    const code=room.code;
    body.innerHTML=`<p class="on-status">Send the invitation to a friend.</p>
      <div class="on-code">${code}</div>
      <div class="on-link"><span>${esc(inviteLink(code))}</span></div>
      <div class="on-actions"><button type="button" class="start primary" id="zfCopyLink" style="flex:1">Copy invite link</button><button type="button" class="cancel" id="zfCopyCode">Copy code</button></div>
      <p class="on-status" id="zfWaitLine"><span class="dot"></span>Waiting for your friend…</p>`;
    body.querySelector('#zfCopyLink').onclick=()=>copyText(inviteLink(code), body.querySelector('#zfCopyLink'));
    body.querySelector('#zfCopyCode').onclick=()=>copyText(code, body.querySelector('#zfCopyCode'));
    history.replaceState({}, '', `${cfg.basePath}?room=${code}`);
  }

  function showJoinCodeScreen(){
    currentScreen=null;
    const body=openDlg('Join a room');
    body.innerHTML=`<div class="on-field"><label>Room code</label><input type="text" class="code-in" id="zfCodeIn" maxlength="8" placeholder="K7M4PX"></div>
      <div class="on-actions"><button type="button" class="start primary" id="zfCodeGo" style="flex:1">Find room</button></div>`;
    const inp=body.querySelector('#zfCodeIn'); inp.focus();
    const go=()=>{ const code=normalizeCode(inp.value); if(code.length<4) return; showJoinPreview(code); };
    body.querySelector('#zfCodeGo').onclick=go;
    inp.addEventListener('keydown',e=>{ if(e.key==='Enter') go(); });
  }

  async function showJoinPreview(code){
    currentScreen=null;
    prewarm();
    const body=openDlg('Join this room?');
    body.innerHTML=`<p class="on-status">Loading room…</p>`;
    try{
      await connect(
        ()=>{ const p=body.querySelector('.on-status'); if(p) p.textContent='Waking up the room server… this can take a little while.'; },
        ()=>{ const p=body.querySelector('.on-status'); if(p) p.textContent="Still waking up — a cold server can take close to a minute. Almost there…"; },
      );
    }
    catch(e){ return showRoomError(body, {code:'connection_lost', message:"Couldn't reach the room server."}); }
    onPreview=m=>{
      body.innerHTML='';
      const nickField=document.createElement('div'); nickField.className='on-field';
      nickField.innerHTML=`<label>Your nickname (optional)</label><input type="text" id="zfNick2" maxlength="18" placeholder="Player 2">`;
      const actions=document.createElement('div'); actions.className='on-actions';
      actions.innerHTML=`<button type="button" class="start primary" id="zfJoinGo" style="flex:1">Join game</button>`;
      cfg.renderJoinPreview(body, m); // per-game: host name, board preview, rule/orientation text, who starts
      { const tl=document.createElement('p'); tl.className='on-rule'; tl.innerHTML=m.timer?`Move timer: <b>${m.timer} seconds per move</b>. If the time runs out, the player to move loses that game.`:'No move timer.'; body.appendChild(tl); }
      body.appendChild(nickField); body.appendChild(actions);
      actions.querySelector('#zfJoinGo').onclick=()=>{
        const nick=nickField.querySelector('#zfNick2').value.trim();
        const btn=actions.querySelector('#zfJoinGo'); btn.disabled=true; btn.textContent='Joining…';
        onJoined=jm=>{ room={ mySeat:2, myToken:jm.token, myNickname:nick||'Player 2' }; Object.assign(room, jm.state); saveSeat(room.code, jm.token, 2, nick||'Player 2'); lastIntent={t:'resume', code:room.code, token:room.myToken}; history.replaceState({}, '', `${cfg.basePath}?room=${room.code}`); openLobbyScreen(); };
        onErrorScreen=e=>{ btn.disabled=false; btn.textContent='Join game'; showInlineError(body, e); };
        sendMsg(Object.assign({ t:'join', code, nickname: nick }));
      };
    };
    onErrorScreen=e=>showRoomError(body, e, { onTryCode:showJoinCodeScreen, onNewRoom:()=>cfg.onCreateFromError&&cfg.onCreateFromError() });
    sendMsg({ t:'preview', code });
  }

  function openLobbyScreen(room2){
    if(room2) room=room2;
    currentScreen='lobby';
    const body=openDlg('Ready to play');
    cfg.renderLobby(body, room, {
      onStart: ()=>{
        const btn=body.querySelector('[data-role=start]'); if(btn){ if(btn.disabled) return; btn.disabled=true; btn.textContent='Starting…'; }
        onErrorScreen=e=>{ if(btn){ btn.disabled=false; btn.textContent='Start game'; } showInlineError(body, e); };
        sendMsg({t:'start',code:room.code,token:room.myToken});
      }
    });
    lobbyDucks(body, room);
    if(room&&!body.querySelector('.on-timerline')){ const tl=document.createElement('p'); tl.className='on-rule on-timerline'; tl.innerHTML=room.timer?`Move timer: <b>${room.timer} seconds per move</b>`:'No move timer'; body.appendChild(tl); }
  }

  function confirmLeave(activeGame, opponentConnected){
    if(activeGame && opponentConnected && !confirm('Leave this match? This counts as resignation.')) return false;
    sendMsg({t:'leave',code:room.code,token:room.myToken});
    forgetRoom(room.code);
    room=null; if(sock) sock.close();
    return true;
  }

  function openRoomStatus(){
    const body=openDlg('Room');
    const mySeat=room.mySeat, other=mySeat===1?2:1, oppName=room.opponentNickname||'Your friend', oppConn=room.seats[other].connected;
    body.innerHTML=`<div class="on-field"><label>Invitation link</label><div class="on-link"><span>${esc(inviteLink(room.code))}</span><button type="button" class="cancel" id="zfCopyLink2">Copy</button></div></div>
      <div class="on-field"><label>Room code</label><div class="on-code" style="font-size:26px;padding:12px">${room.code}</div></div>
      <p class="on-status"><span class="dot ${oppConn?'live':'gone'}"></span>${esc(oppName)} ${oppConn?'is connected':'is disconnected'}</p>
      <div class="on-score">You ${room.score[mySeat]} — ${esc(oppName)} ${room.score[other]}${room.draws?` · ${room.draws} draw${room.draws===1?'':'s'}`:''}</div>${room.timer?`<p class="on-status">Move timer: ${room.timer} seconds per move</p>`:''}`;
    body.querySelector('#zfCopyLink2').onclick=()=>copyText(inviteLink(room.code), body.querySelector('#zfCopyLink2'));
  }

  function drawBar(stageEl, vm){
    // vm: {myNickname, opponentNickname, opponentConnected, meTurn, selfReconnecting}
    let bar=stageEl.querySelector('#zfOnBar');
    if(!bar){ bar=document.createElement('div'); bar.id='zfOnBar'; bar.className='on-bar'; stageEl.insertBefore(bar, stageEl.firstChild); }
    bar.innerHTML = `<span class="who me${vm.meTurn?' turn':''}">${vm.selfReconnecting?'<span class="dot gone"></span>':''}You${vm.myNickname&&vm.myNickname!=='You'?` (${esc(vm.myNickname)})`:''}${vm.selfReconnecting?' — reconnecting…':''}</span>`+
      `<span class="who${!vm.meTurn?' turn':''}"><span class="dot ${vm.opponentConnected?'live':'gone'}"></span>${esc(vm.opponentNickname||'your friend')}</span>`+
      `<button type="button" class="roombtn" id="zfRoomBtn">Room</button>`+
      `<button type="button" class="roombtn" id="zfLeaveBtn">Leave room</button>`;
    bar.querySelector('#zfRoomBtn').onclick=()=>openRoomStatus();
    bar.querySelector('#zfLeaveBtn').onclick=()=>{ if(confirmLeave(!vm.over, vm.opponentConnected)) cfg.onLeft&&cfg.onLeft(); };
    const noteId='zfOnDiscNote';
    if(!vm.opponentConnected){
      let note=stageEl.querySelector('#'+noteId);
      if(!note){ note=document.createElement('div'); note.id=noteId; note.className='on-status'; bar.insertAdjacentElement('afterend', note); }
      note.textContent = `${esc(vm.opponentNickname||'Your friend')} disconnected — waiting for them to return…`;
    } else { const note=stageEl.querySelector('#'+noteId); if(note) note.remove(); }
    return bar;
  }
  function clearPendingBanner(stageEl){ const el=stageEl.querySelector('#zfOnPending'); if(el) el.remove(); }
  function drawPendingBanner(stageEl, mySeat, opponentNickname, pending, onRespond, onCancel){
    clearPendingBanner(stageEl);
    const bar=stageEl.querySelector('#zfOnBar'); if(!bar) return;
    const el=document.createElement('div'); el.id='zfOnPending'; el.className='on-pending';
    const tSecs=pending.kind==='timer'&&pending.payload?pending.payload.secs:0;
    const byMe=pending.by===mySeat, kindVerb={undo:'undo the last move',restart:'restart with the same board',customize:'play a new board',rematch:'a rematch',timer:tSecs?`set the move timer to ${tSecs} seconds`:'turn the move timer off'}[pending.kind];
    const askText=pending.kind==='rematch'?`wants ${kindVerb}`:`wants to ${kindVerb}`;
    if(byMe){ el.innerHTML=`<span>Waiting for ${esc(opponentNickname||'your friend')} to accept — ${esc(kindVerb)}.</span><div class="btns"><button type="button" class="ghost" id="zfCancelReq">Cancel</button></div>`;
      el.querySelector('#zfCancelReq').onclick=onCancel; }
    else { el.innerHTML=`<span>${esc(opponentNickname||'Your friend')} ${esc(askText)}.</span><div class="btns"><button type="button" class="ghost" id="zfDecline">Decline</button><button type="button" id="zfAccept">Accept</button></div>`;
      el.querySelector('#zfAccept').onclick=()=>onRespond(true);
      el.querySelector('#zfDecline').onclick=()=>onRespond(false); }
    bar.insertAdjacentElement('afterend', el);
  }
  function showResult(resultEl, {title, detail, mySeatScore, otherScore, opponentName, onRematch, onCustomize, sound}){
    if(sound) playSound(sound);
    /* a game decided by the clock says so, whatever the game's own wording */
    if(room&&room.endReason==='timeout'&&room.winner){ const lostMe=room.winner!==room.mySeat; detail=lostMe?'Your time ran out on that move, so this game goes to '+esc(opponentName||'your friend')+'.':esc(opponentName||'Your friend')+' ran out of time on that move, so this game is yours.'; }
    const draws=room&&room.draws?` · ${room.draws} draw${room.draws===1?'':'s'}`:'';
    resultEl.innerHTML=`<b>${esc(title)}</b><div>${detail}</div>${mySeatScore!=null?`<div class="on-score">You ${mySeatScore} — ${esc(opponentName||'Friend')} ${otherScore}${draws}</div>`:''}<div class="gx-after">${onRematch?'<button type="button" class="primary" id="zfRematchBtn">Ask for a rematch</button>':''}${onCustomize?'<button type="button" class="cancel" id="zfChangeBoardBtn">Change board</button>':''}<button type="button" class="cancel" id="zfResultLeaveBtn">Leave room</button></div>`;
    resultEl.classList.add('show');
    if(onRematch){ const rb=resultEl.querySelector('#zfRematchBtn'); if(rb) rb.onclick=onRematch; }
    if(onCustomize){ const cb=resultEl.querySelector('#zfChangeBoardBtn'); if(cb) cb.onclick=onCustomize; }
    // the match is already over here, so leaving from the result card is never a resignation -- no confirm needed
    resultEl.querySelector('#zfResultLeaveBtn').onclick=()=>{ if(confirmLeave(false,true)) cfg.onLeft&&cfg.onLeft(); };
  }
  function showAbandoned(resultEl, opponentName, onBack){
    resultEl.innerHTML=`<b>Match abandoned</b><div>${esc(opponentName||'Your friend')} didn't reconnect in time. No score was recorded.</div><div class="gx-after"><button type="button" class="primary" id="zfAbBack">Back</button></div>`;
    resultEl.classList.add('show');
    resultEl.querySelector('#zfAbBack').onclick=()=>{ if(room) forgetRoom(room.code); onBack(); };
  }
  function showReturnedToLobby(resultEl, room2){
    resultEl.innerHTML=`<b>New board agreed</b><div>Both players are back at the lobby to review it.</div>`;
    resultEl.classList.add('show');
    openLobbyScreen(room2);
  }

  async function tryAutoResume(onNoSeat){
    const urlRoom = new URL(location.href).searchParams.get('room');
    if(!urlRoom){ if(wantsCreate()){ autoCreate=true; onNoSeat(null); } return; }
    if(location.pathname.replace(/\/$/,'')!==cfg.basePath.replace(/\/$/,'')) return; // a room code for a different game's page
    const code=normalizeCode(urlRoom);
    const seat=loadSeat(code);
    if(!seat){ onNoSeat(code); return; }
    try{ await connect(); } catch(e){ return; }
    lastIntent = { t:'resume', code, token: seat.token };
    onResumed=m=>{ room={ mySeat:m.seat, myToken:seat.token, myNickname:seat.nickname }; Object.assign(room, m.state);
      // applyState() (the regular per-broadcast path) always derives opponentNickname from the fresh seats snapshot;
      // this cold-resume path skipped that, so a page reload showed "Your friend" even right after the opponent had
      // given a real name -- the result popup, pending banners and room bar all read this same field.
      { const other=room.mySeat===1?2:1; room.opponentNickname = room.seats && room.seats[other] && room.seats[other].nickname; peerOut(); }
      // 'finished' and 'abandoned' fell through both this and the generic broadcast's screen-transition check
      // untouched — reloading the page (or any auto-reconnect) after a match ended landed on a blank board with
      // no result, no rematch button, nothing, even though the server's own state was already correct.
      if(m.state.status==='active'||m.state.status==='finished'||m.state.status==='abandoned'){ currentScreen=null; cfg.onEnterLive(room); }
      else if(m.state.status==='lobby'){ currentScreen='lobby'; openLobbyScreen(room); }
      else if(m.state.status==='waiting'){ currentScreen='waiting'; showWaitingScreen(); } };
    onErrorScreen=e=>{ /* stale/missing room: quietly do nothing — the visitor can still create/join fresh */ };
    sendMsg(lastIntent);
  }

  const api={
    connect, sendMsg, react(kind,id){ if(room&&room.code&&room.myToken) sendMsg({t:'react',code:room.code,token:room.myToken,kind,id}); }, get room(){ return room; }, set room(v){ room=v; },
    get lastIntent(){ return lastIntent; }, set lastIntent(v){ lastIntent=v; },
    get selfReconnecting(){ return selfReconnecting; },
    set onCreated(f){ onCreated=f; }, set onJoined(f){ onJoined=f; }, set onErrorScreen(f){ onErrorScreen=f; },
    saveSeat, loadSeat, forgetRoom, inviteLink, normalizeCode, esc, copyText, playSound, genAttemptId,
    openDlg, closeDlg, showInlineError, showRoomError, showCreateFailure, errorTitle,
    showChoiceScreen, showWaitingScreen, showJoinCodeScreen, showJoinPreview, openLobbyScreen,
    confirmLeave, openRoomStatus, drawBar, drawPendingBanner, clearPendingBanner, showResult, showAbandoned, showReturnedToLobby,
    tryAutoResume,
    set onCloseClick(f){ onCloseClick=f; },
  };
  (window.__zfRoomClients=window.__zfRoomClients||[]).push(api);   // reactions find the client of the room on screen
  return api;
}

window.ZFRoomCore = { createClient, esc, copyText, normalizeCode, icon };
})();
