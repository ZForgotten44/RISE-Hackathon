/* online-nim.js — the Nim-specific adapter on top of online-rooms.js's shared room infrastructure: board setup,
   piles preview, and driving Nim's own board/renderer for a live online match. See online-rooms.js for everything
   generic (dialog, connection/reconnect, lobby, errors, room bar, pending-request banner, leave/rematch UI). */
(function(){
const $=id=>document.getElementById(id);
const RC=window.ZFRoomCore, esc=RC.esc;
const client=RC.createClient({
  basePath:'/nim',
  isLive: ()=>{ const g=$('nimGame'); return g && g.classList.contains('show') && window.__nimState && window.__nimState() && window.__nimState().online; },
  onSelfReconnecting(v){ const nm=window.__nimState&&window.__nimState(); if(nm && nm.online){ nm.busy = v || !nm.online.opponentConnected; drawBar(nm); window.__nimRenderExternal&&window.__nimRenderExternal(); } },
  onKicked(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
  // A rejected move (stale version, not actually your turn) must release the pending-move lock right away — the
  // resynced board (applied by online-rooms.js from the error's own state) is worthless if the next legal click
  // still gets swallowed by a lock that only clears on its own after a multi-second failsafe.
  onLiveError(){ const nm=window.__nimState&&window.__nimState(); if(nm&&nm.online&&nm.online.hook) nm.online.hook.unlockAfterConfirm(); },
  onEnterLive: enterLiveGame,
  onOpenLobby: room => client.openLobbyScreen(room),
  onLobbyUpdate(){},
  onLiveState: applyLiveState,
  renderJoinPreview(body, m){
    const p=document.createElement('p'); p.className='on-status'; p.innerHTML=`${esc(m.hostNickname)} invited you to play Nim.`; body.appendChild(p);
    const prev=document.createElement('div'); prev.className='on-preview'; body.appendChild(prev); pilesPreview(prev, m.startPiles);
    const rule=document.createElement('p'); rule.className='on-rule'; rule.innerHTML=`<b>${m.rule==='misere'?'Last token loses':'Last token wins'}</b> · who starts: ${m.first==='guest'?'you':m.first==='random'?'random':esc(m.hostNickname)}`; body.appendChild(rule);
  },
  renderLobby(body, room, {onStart}){
    const isHost=room.mySeat===1, opp=room.seats[room.mySeat===1?2:1];
    body.innerHTML=`<div class="on-preview" id="zfPrev"></div>
      <p class="on-rule"><b>${room.rule==='misere'?'Last token loses':'Last token wins'}</b></p>
      <p class="on-status">You: ${esc(room.myNickname)} · ${esc(opp.nickname||'waiting…')}</p>
      ${isHost?'<div class="on-actions"><button type="button" class="start primary" data-role="start" id="zfStartGo" style="flex:1">Start game</button></div>':'<p class="on-status">Waiting for the host to start…</p>'}`;
    pilesPreview(body.querySelector('#zfPrev'), room.startPiles);
    if(isHost) body.querySelector('#zfStartGo').onclick=onStart;
  },
  onCreateFromError: showCreateScreen,
  onLeft(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
});

function pilesPreview(container, piles){
  container.innerHTML='';
  const nums=piles.map(v=>{ try{ return BigInt(v); }catch(e){ return 0n; } });
  const max=nums.reduce((a,b)=>b>a?b:a,1n);
  nums.forEach(n=>{ const h=Math.max(6,Math.min(56,Number(n>40n?40n:n)/Number(max>40n?40n:max||1n)*56)); const bar=document.createElement('i'); bar.style.height=h+'px'; container.appendChild(bar); });
}

/* ================= entry point: called from Settings' Players row ================= */
function openOnlineFlow(){
  const urlRoom = new URL(location.href).searchParams.get('room');
  client.showChoiceScreen(showCreateScreen, ()=>client.showJoinCodeScreen());
  if(urlRoom) client.showJoinPreview(RC.normalizeCode(urlRoom));
}

function showCreateScreen(){
  const nimP = window.__nimPrefs && window.__nimPrefs();
  const nm0 = window.__nimState && window.__nimState();
  let piles = (nm0 && nm0.start && nm0.opp!=='online') ? nm0.start.map(String) : nimP.piles.slice();
  let rule = nimP.rule||'normal', first='host', nick='';
  const attemptId = client.genAttemptId(); // stable across retries of *this* create, so a lost response can't double-create
  const body=client.openDlg('Room settings');
  const draw=()=>{
    body.innerHTML=`<div class="on-field"><label>Your nickname (optional)</label><input type="text" id="zfNick" maxlength="18" placeholder="Player 1" value="${esc(nick)}"></div>
      <div class="on-preview" id="zfPrev"></div>
      <div class="on-actions" style="justify-content:center"><button type="button" class="on-iconbtn" id="zfEditBoard">${RC.icon('<path d="M4 20l1-4.2L15.6 5.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19 4 20Z"/><path d="M14 7l3 3"/>')}<span>Build your board</span></button></div>
      <p class="on-rule"><b>${rule==='misere'?'Last token loses':'Last token wins'}</b> — starts a fresh match with this board.</p>
      <div class="on-field"><label>Who starts</label><div class="gs-seg" id="zfFirst" role="group"><button type="button" data-v="host" class="${first==='host'?'on':''}">You</button><button type="button" data-v="guest" class="${first==='guest'?'on':''}">Friend</button><button type="button" data-v="random" class="${first==='random'?'on':''}">Random</button></div></div>
      <div class="on-actions"><button type="button" class="start primary" id="zfCreateGo" style="flex:1">Create room</button></div>`;
    pilesPreview(body.querySelector('#zfPrev'), piles);
    body.querySelector('#zfNick').addEventListener('input', e=>{ nick=e.target.value; });
    body.querySelectorAll('#zfFirst button').forEach(b=>b.onclick=()=>{ first=b.dataset.v; draw(); });
    body.querySelector('#zfEditBoard').onclick=()=>{
      if(!(window.ZFA && ZFA.nimCustomize)) return;
      nick=body.querySelector('#zfNick').value;
      nimP.piles=piles.slice(); nimP.rule=rule;
      const roomDlg=document.getElementById('zfRoomDlg');
      roomDlg.classList.remove('open'); // avoid stacking two dialogs — the board builder uses its own, separate one
      ZFA.nimCustomize((newPiles, newRule)=>{ piles=newPiles; rule=newRule; });
      const gcustom=document.getElementById('gcustom');
      const obs=new MutationObserver(()=>{ if(!gcustom.classList.contains('open')){ obs.disconnect(); roomDlg.classList.add('open'); draw(); } });
      obs.observe(gcustom,{attributes:true,attributeFilter:['class']});
    };
    const tryCreate=async()=>{
      const nickTrimmed=nick.trim();
      const btn=body.querySelector('#zfCreateGo'); if(btn.disabled) return; btn.disabled=true; btn.textContent='Creating…';
      try{
        await client.connect(()=>{ btn.textContent='Waking up the server…'; }, ()=>{ btn.textContent='Still waking up…'; });
        client.onCreated=m=>{ const room={ mySeat:1, myToken:m.token, myNickname:nickTrimmed||'Player 1' }; Object.assign(room, m.state); client.saveSeat(room.code, m.token, 1, nickTrimmed||'Player 1'); client.lastIntent={t:'resume', code:room.code, token:room.myToken}; client.room=room; client.showWaitingScreen(); };
        client.onErrorScreen=e=>{ client.showCreateFailure(body, btn, e, 'Create room', {}); };
        client.sendMsg({ t:'create', game:'nim', attemptId, nickname: nickTrimmed, rule, piles, first });
      } catch(e){
        client.showCreateFailure(body, btn, e, 'Create room', { onRetry: tryCreate, onPlayLocally: ()=>{ client.closeDlg(); nimP.piles=piles.slice(); nimP.rule=rule; window.ZFA && ZFA.nimOpen && ZFA.nimOpen(); } });
      }
    };
    body.querySelector('#zfCreateGo').onclick=tryCreate;
  };
  draw();
}

/* ================= reactive live-state handling (runs on every state broadcast while the match is live) ================= */
let peerWasConnected=true;
function applyLiveState(room, {wasStatus}){
  const nm=window.__nimState && window.__nimState();
  if(!nm || !nm.online) return;
  const mySeat=room.mySeat, other=mySeat===1?2:1;
  const prevOver=nm.over;
  const connNow=room.seats[other].connected;
  peerWasConnected=connNow;
  nm.online.opponentNickname = room.opponentNickname;
  nm.online.connected = room.seats[mySeat].connected;
  nm.online.opponentConnected = connNow;
  nm.busy = !room.seats[1].connected || !room.seats[2].connected || !!room.pending;
  if(room.lastMove && (!nm._lastAppliedVersion || nm._lastAppliedVersion<room.version) && room.lastMove.seat!==mySeat){
    nm._lastAppliedVersion=room.version;
    animateRemoteMove(nm, room);
  } else if(!room.lastMove || room.lastMove.seat===mySeat || (nm._lastAppliedVersion||0)>=room.version){
    nm._lastAppliedVersion=room.version;
    syncLocalFromRoom(nm, room);
    if(nm.online.hook) nm.online.hook.unlockAfterConfirm();
    window.__nimRenderExternal && window.__nimRenderExternal();
  }
  if(room.status==='finished' && !prevOver) showOnlineResult(nm, room);
  if(room.status==='abandoned') client.showAbandoned($('nResult'), nm.online.opponentNickname, ()=>{ window.ZFA.toLobby(); });
  if(room.status==='active' && (wasStatus==='finished'||wasStatus==='abandoned')){ $('nResult').classList.remove('show'); $('nResult').innerHTML=''; }
  drawBar(nm);
  if(room.pending) client.drawPendingBanner($('nimGame').querySelector('.stage'), mySeat, nm.online.opponentNickname, room.pending,
    accept=>client.sendMsg({t:'respond',code:room.code,token:room.myToken,requestId:room.pending.id,accept}),
    ()=>client.sendMsg({t:'cancelRequest',code:room.code,token:room.myToken,requestId:room.pending.id}));
  else client.clearPendingBanner($('nimGame').querySelector('.stage'));
  if(room.status==='lobby' && wasStatus==='active') client.showReturnedToLobby($('nResult'), room);
}

function drawBar(nm){
  const stage=$('nimGame').querySelector('.stage');
  client.drawBar(stage, { myNickname: nm.online.myNickname, opponentNickname: nm.online.opponentNickname, opponentConnected: nm.online.opponentConnected, meTurn: nm.player===nm.humanIs, selfReconnecting: client.selfReconnecting, over: nm.over });
}

function animateRemoteMove(nm, room){
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish=()=>{ syncLocalFromRoom(nm, room); window.__nimRenderExternal && window.__nimRenderExternal(); if(room.status==='finished') showOnlineResult(nm, room); };
  if(reduce){ finish(); return; }
  const board=$('nBoard'); const idx=room.lastMove.pile, take=BigInt(room.lastMove.take);
  const pileEl=board && board.querySelector(`.pile[data-pile="${idx}"]`);
  if(pileEl) pileEl.classList.add('changed');
  setTimeout(()=>{
    const h=nm.h; if(board) board.querySelectorAll(`.tok[data-pile="${idx}"]:not(.column)`).forEach(t=>{ const j=BigInt(t.dataset.j); if(h[idx]-j<=take) t.classList.add('leave'); });
    setTimeout(finish, 250);
  }, 150);
}
function syncLocalFromRoom(nm, room){
  nm.h = room.piles.map(BigInt); nm.player = room.turnSeat; nm.over = room.over; nm.winner = room.winner;
  if(room.lastMove){ const last=nm.moves[nm.moves.length-1]; const wire={pile:room.lastMove.pile,take:BigInt(room.lastMove.take),leave:BigInt(room.lastMove.leave)};
    if(!last || last.pile!==wire.pile || String(last.take)!==String(wire.take) || nm.moves.length<room.version){ nm.moves.push(wire); nm.snaps.push(nm.h.slice()); } }
  nm.view=-1; nm.sel=null; nm.hover=null;
}
function showOnlineResult(nm, room){
  const mySeat=nm.humanIs, other=mySeat===1?2:1, name=nm.online.opponentNickname||'Your friend';
  const won = room.winner===mySeat;
  const title = won?'You won!':`${esc(name)} won`;
  const detail = room.note==='resigned' ? (won?`${esc(name)} left the match.`:'You left the match.') : (nm.misere?`${won?(esc(nm.online.opponentNickname||'they')):'you'} took the last token — misère, so that loses.`:`${won?'You':esc(name)} took the last token.`);
  client.showResult($('nResult'), { title, detail, mySeatScore: room.score[mySeat], otherScore: room.score[other], opponentName: name, sound: won?'win':'lose', onRematch: ()=>nm.online.hook.requestRematch() });
}

/* ================= entering the live game, reusing Nim's own board and renderer ================= */
function enterLiveGame(room){
  client.closeDlg();
  // A fresh /nim visit opens the entry Settings dialog and a "Start game" overlay on the (inert) preview board
  // before a player ever touches "Online friend" — closeSettings() already runs when they pick it from inside
  // that dialog, but a direct invite link or a stale render can leave either one sitting on top of, or under,
  // the live room: the settings popup unexplained, and the overlay's own "Start game" button (nimStart, a fresh
  // LOCAL match) still wired up and clickable straight through to the shared board underneath.
  window.ZFShell && ZFShell.closeSettings && ZFShell.closeSettings();
  window.ZFShell && ZFShell.hideStartOverlay('nimGame');
  // nimEnterFresh() (the create flow runs it first, before any room exists) hides these for its inert preview
  // board and nothing else ever un-hides them for an online match — leaving Undo/Restart permanently invisible
  // and unclickable for the room's whole lifetime, exactly like nimStart() restores them for a local match.
  const undoBtn=$('nUndo'), restartBtn=$('nRestart'), hintBtn=$('nHint'); if(undoBtn) undoBtn.style.display=''; if(restartBtn) restartBtn.style.display=''; if(hintBtn) hintBtn.style.display='';
  const startPiles = room.startPiles.map(BigInt);
  const nmOnline = {
    layout: null, start: startPiles, h: room.piles.map(BigInt), misere: room.rule==='misere', opp:'online',
    diff:null, mode:'challenge', humanIs: room.mySeat, player: room.turnSeat, over: room.over||false, winner: room.winner||0,
    moves: [], snaps: [startPiles.slice()], view: -1, sel: null, hover: null, assisted: false, hint: null, note: '',
    busy: !(room.seats[1].connected && room.seats[2].connected), lastCpu: null,
    online: { code: room.code, mySeat: room.mySeat, myNickname: room.myNickname, opponentNickname: room.opponentNickname, connected:true, opponentConnected: room.seats[room.mySeat===1?2:1].connected, hook: makeHook() },
    _lastAppliedVersion: room.version,
  };
  window.__nimSetMatch && window.__nimSetMatch(nmOnline);
  window.__nimEnterGameView && window.__nimEnterGameView();
  $('nGameMode') && ($('nGameMode').textContent = 'online friend');
  $('nResult').classList.remove('show');
  window.__nimRenderExternal && window.__nimRenderExternal();
  drawBar(nmOnline);
  peerWasConnected = nmOnline.online.opponentConnected;
  // Reconnecting (or just reloading) straight into a match that already ended has no earlier "over" to transition
  // from — the result/abandoned notice only ever fired on that transition, so arriving here after the fact needs
  // to show it directly instead of leaving a bare board with no result and no way to ask for a rematch.
  if(room.status==='finished') showOnlineResult(nmOnline, room);
  else if(room.status==='abandoned') client.showAbandoned($('nResult'), nmOnline.online.opponentNickname, ()=>{ window.ZFA.toLobby(); });
}
function makeHook(){
  let moveSeq=0, locked=false;
  return {
    proposeMove(m){ if(locked) return; const nm=window.__nimState(); if(nm.player!==nm.humanIs) return; locked=true; const room=client.room;
      client.sendMsg({ t:'move', code:room.code, token:room.myToken, moveId:`${room.mySeat}-${Date.now()}-${moveSeq++}`, version:nm._lastAppliedVersion, pile:m.pile, take:String(m.take) });
      setTimeout(()=>{ locked=false; }, 4000); // safety unlock if a reply never arrives
    },
    unlockAfterConfirm(){ locked=false; },
    requestUndo(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'undo'}); },
    requestRestart(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'restart'}); },
    requestRematch(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'rematch'}); },
    requestCustomize(piles, rule, first){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'customize',piles,rule,first}); },
  };
}

window.ZFOnlineNim = { open: openOnlineFlow };
function boot(){ client.tryAutoResume(code=>openOnlineFlow()); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
