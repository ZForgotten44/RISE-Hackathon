/* online-recursive.js — the Recursive Tic-Tac-Toe (ULT)-specific adapter on top of online-rooms.js's shared room
   infrastructure. ULT predates games2.js's gx framework (like Nim/Chomp, it's on the older arcade-main.js
   architecture), so instead of ZFX.setM/enterLiveView/applyRemote this drives arcade-main.js's own match object
   through the window.__ult* accessors it exports for exactly this purpose (mirroring arcade-games.js's
   window.__nimSetMatch/__nimEnterGameView/__nimState for Nim). There is nothing to configure at setup beyond who
   starts — the board is always nine fixed 3x3 boards — so the create screen matches online-toot.js's minimal one. */
(function(){
const $=id=>document.getElementById(id);
const RC=window.ZFRoomCore, esc=RC.esc;

const client=RC.createClient({
  basePath:'/recursive-tic-tac-toe',
  isLive: ()=>{ const g=$('game'); const M=window.__ultState&&window.__ultState(); return !!(g && g.classList.contains('show') && M && M.opp==='online'); },
  onSelfReconnecting(v){ const M=window.__ultState&&window.__ultState(); if(M && M.online){ M.busy = v || !M.online.opponentConnected; drawBar(M); window.__ultRenderExternal&&window.__ultRenderExternal(); } },
  onKicked(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
  onLiveError(){ const M=window.__ultState&&window.__ultState(); if(M&&M.online&&M.online.hook) M.online.hook.unlockAfterConfirm(); },
  onEnterLive: enterLiveGame,
  onOpenLobby: room => client.openLobbyScreen(room),
  onLobbyUpdate(){},
  onLiveState: applyLiveState,
  renderJoinPreview(body, m){
    const p=document.createElement('p'); p.className='on-status'; p.innerHTML=`${esc(m.hostNickname)} invited you to play Recursive Tic-Tac-Toe.`; body.appendChild(p);
    const rule=document.createElement('p'); rule.className='on-rule'; rule.innerHTML=`Nine 3×3 boards · who starts: ${m.first==='guest'?'you':m.first==='random'?'random':esc(m.hostNickname)}`; body.appendChild(rule);
  },
  renderLobby(body, room, {onStart}){
    const isHost=room.mySeat===1, opp=room.seats[room.mySeat===1?2:1];
    body.innerHTML=`<p class="on-rule">Nine 3×3 boards · standard rules</p>
      <p class="on-status">You: ${esc(room.myNickname)} · ${esc(opp.nickname||'waiting…')}</p>
      ${isHost?'<div class="on-actions"><button type="button" class="start primary" data-role="start" id="zfStartGo" style="flex:1">Start game</button></div>':'<p class="on-status">Waiting for the host to start…</p>'}`;
    if(isHost) body.querySelector('#zfStartGo').onclick=onStart;
  },
  onCreateFromError: showCreateScreen,
  onLeft(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
});

/* ================= entry point: called from the entry screen's Players row ================= */
function openOnlineFlow(){
  const urlRoom = new URL(location.href).searchParams.get('room');
  client.showChoiceScreen(showCreateScreen, ()=>client.showJoinCodeScreen());
  if(urlRoom) client.showJoinPreview(RC.normalizeCode(urlRoom));
}

function showCreateScreen(){
  let first='host';
  const attemptId = client.genAttemptId();
  const body=client.openDlg('Room settings');
  const draw=()=>{
    body.innerHTML=`<div class="on-field"><label>Your nickname (optional)</label><input type="text" id="zfNick" maxlength="18" placeholder="Player 1"></div>
      <p class="on-rule">Nine 3×3 boards · standard rules</p>
      <div class="on-setup-group"><div class="glabel">Who starts</div><div class="gs-seg" id="zfFirst" role="group"><button type="button" data-v="host" class="${first==='host'?'on':''}">You</button><button type="button" data-v="guest" class="${first==='guest'?'on':''}">Friend</button><button type="button" data-v="random" class="${first==='random'?'on':''}">Random</button></div></div>
      <div class="on-actions"><button type="button" class="start primary" id="zfCreateGo" style="flex:1">Create room</button></div>`;
    body.querySelectorAll('#zfFirst button').forEach(b=>b.onclick=()=>{ first=b.dataset.v; draw(); });
    const tryCreate=async()=>{
      const nick=body.querySelector('#zfNick').value.trim();
      const btn=body.querySelector('#zfCreateGo'); if(btn.disabled) return; btn.disabled=true; btn.textContent='Creating…';
      try{
        await client.connect(()=>{ btn.textContent='Waking up the server…'; }, ()=>{ btn.textContent='Still waking up…'; });
        client.onCreated=m=>{ const room={ mySeat:1, myToken:m.token, myNickname:nick||'Player 1' }; Object.assign(room, m.state); client.saveSeat(room.code, m.token, 1, nick||'Player 1'); client.lastIntent={t:'resume', code:room.code, token:room.myToken}; client.room=room; client.showWaitingScreen(); };
        client.onErrorScreen=e=>{ client.showCreateFailure(body, btn, e, 'Create room', {}); };
        client.sendMsg({ t:'create', game:'ult', attemptId, nickname: nick, first });
      } catch(e){
        client.showCreateFailure(body, btn, e, 'Create room', { onRetry: tryCreate, onPlayLocally: ()=>{ client.closeDlg(); window.__ultOpenSetup && window.__ultOpenSetup(); } });
      }
    };
    body.querySelector('#zfCreateGo').onclick=tryCreate;
  };
  draw();
}

/* ================= reactive live-state handling ================= */
function other(seat){ return seat===1?2:1; }
function applyLiveState(room, {wasStatus}){
  const M=window.__ultState && window.__ultState();
  if(!M || !M.online) return;
  const mySeat=room.mySeat, seatOther=other(mySeat);
  const prevOver=M.over;
  const connNow=room.seats[seatOther].connected;
  M.online.opponentNickname = room.opponentNickname;
  M.online.connected = room.seats[mySeat].connected;
  M.online.opponentConnected = connNow;
  M.busy = !room.seats[1].connected || !room.seats[2].connected || !!room.pending;

  const doSync=()=>{
    M._lastAppliedVersion=room.version;
    const state = { cells: room.cells.slice(), bw: room.bw.slice(), next: room.next, player: room.turnSeat, winner: room.over?(room.winner||0):0 };
    const lastMove = room.lastMove ? room.lastMove.i : null;
    window.__ultApplyRemote(state, lastMove);
    if(M.online.hook) M.online.hook.unlockAfterConfirm();
    if(room.over && !prevOver) showOnlineResult(M, room);
    drawBar(M);
  };
  if(room.lastMove && (!M._lastAppliedVersion || M._lastAppliedVersion<room.version) && room.lastMove.seat!==mySeat){
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce) doSync(); else setTimeout(doSync, 160);
  } else if(!room.lastMove || room.lastMove.seat===mySeat || (M._lastAppliedVersion||0)>=room.version){
    doSync();
  }
  if(room.status==='abandoned') client.showAbandoned($('result'), M.online.opponentNickname, ()=>{ window.ZFA.toLobby(); });
  if(room.status==='active' && (wasStatus==='finished'||wasStatus==='abandoned')){ $('result').classList.remove('show'); $('result').innerHTML=''; }
  drawBar(M);
  const stage=$('game').querySelector('.stage');
  if(room.pending){
    client.drawPendingBanner(stage, mySeat, M.online.opponentNickname, room.pending,
      accept=>client.sendMsg({t:'respond',code:room.code,token:room.myToken,requestId:room.pending.id,accept}),
      ()=>client.sendMsg({t:'cancelRequest',code:room.code,token:room.myToken,requestId:room.pending.id}));
  }
  else client.clearPendingBanner(stage);
  if(room.status==='lobby' && wasStatus==='active') client.showReturnedToLobby($('result'), room);
}

function drawBar(M){
  const stage=$('game').querySelector('.stage');
  client.drawBar(stage, { myNickname: M.online.myNickname, opponentNickname: M.online.opponentNickname, opponentConnected: M.online.opponentConnected, meTurn: M.player===M.humanIs, selfReconnecting: client.selfReconnecting, over: M.over });
}
function showOnlineResult(M, room){
  const mySeat=M.humanIs, seatOther=other(mySeat), name=(M.online&&M.online.opponentNickname)||'Your friend';
  const draw = room.winner===0;
  const won = room.winner===mySeat;
  const title = draw?'A draw':(won?'You won!':`${esc(name)} won`);
  const detail = room.note==='resigned' ? (won?`${esc(name)} left the match.`:'You left the match.')
    : draw ? 'All nine boards were closed with no line for either side.'
    : `${won?'You':esc(name)} won three boards in a line.`;
  client.showResult($('result'), { title, detail, mySeatScore: room.score[mySeat], otherScore: room.score[seatOther], opponentName: name, sound: draw?'ping':(won?'win':'lose'), onRematch: ()=>M.online.hook.requestRematch() });
}

/* ================= entering the live game, reusing ULT's own board and renderer ================= */
function enterLiveGame(room){
  client.closeDlg();
  window.ZFShell && ZFShell.closeSettings && ZFShell.closeSettings();
  window.ZFShell && ZFShell.hideStartOverlay && ZFShell.hideStartOverlay('game');
  const state = { cells: room.cells.slice(), bw: room.bw.slice(), next: room.next, player: room.turnSeat, winner: room.over?(room.winner||0):0 };
  window.__ultEnterLiveView(room.mySeat, state);
  const M = window.__ultState();
  M.online = { code: room.code, mySeat: room.mySeat, myNickname: room.myNickname, opponentNickname: room.opponentNickname, connected:true, opponentConnected: room.seats[other(room.mySeat)].connected, hook: makeHook() };
  M.busy = !(room.seats[1].connected && room.seats[2].connected);
  M._lastAppliedVersion = room.version;
  drawBar(M);
  if(room.status==='finished') showOnlineResult(M, room);
  else if(room.status==='abandoned') client.showAbandoned($('result'), M.online.opponentNickname, ()=>{ window.ZFA.toLobby(); });
}
function makeHook(){
  let moveSeq=0, locked=false;
  return {
    proposeMove(m){ if(locked) return; const M=window.__ultState(); if(!M||M.player!==M.humanIs) return; locked=true; const room=client.room;
      client.sendMsg({ t:'move', code:room.code, token:room.myToken, moveId:`${room.mySeat}-${Date.now()}-${moveSeq++}`, version:M._lastAppliedVersion, i:m });
      setTimeout(()=>{ locked=false; }, 4000);
    },
    unlockAfterConfirm(){ locked=false; },
    requestUndo(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'undo'}); },
    requestRestart(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'restart'}); },
    requestRematch(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'rematch'}); },
  };
}

window.ZFOnlineUlt = { open: openOnlineFlow };
function boot(){ client.tryAutoResume(code=>openOnlineFlow()); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
