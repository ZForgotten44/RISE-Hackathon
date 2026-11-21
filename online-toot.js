/* online-toot.js — the TOOT & OTTO-specific adapter on top of online-rooms.js's shared room infrastructure: a
   who-starts-only setup screen (the board itself is fixed, 4 rows x 6 columns), and driving a live online match
   through games2.js's generic gx framework (ZFX.setM/enterLiveView/applyRemote), reusing the offline board renderer
   (tRender, games3.js) unchanged -- every drop already flows through ctx.play(), which games2.js's play() already
   redirects into M.online.hook.proposeMove() whenever M.opt.opp==='online'. */
(function(){
const $=id=>document.getElementById(id);
const RC=window.ZFRoomCore, esc=RC.esc;

const client=RC.createClient({
  basePath:'/toot-otto',
  isLive: ()=>{ const g=$('gxGame'); return g && g.classList.contains('show') && window.ZFX && ZFX.current()==='toot' && ZFX.M && ZFX.M.opt.opp==='online'; },
  onSelfReconnecting(v){ const M=window.ZFX&&ZFX.M; if(M && M.online){ M.online.busy = v || !M.online.opponentConnected; drawBar(M); ZFX.redraw(); } },
  onKicked(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
  onLiveError(){ const M=window.ZFX&&ZFX.M; if(M&&M.online&&M.online.hook) M.online.hook.unlockAfterConfirm(); },
  onEnterLive: enterLiveGame,
  onOpenLobby: room => client.openLobbyScreen(room),
  onLobbyUpdate(){},
  onLiveState: applyLiveState,
  renderJoinPreview(body, m){
    const p=document.createElement('p'); p.className='on-status'; p.innerHTML=`${esc(m.hostNickname)} invited you to play TOOT &amp; OTTO.`; body.appendChild(p);
    const rule=document.createElement('p'); rule.className='on-rule'; rule.innerHTML=`4×6 board · ${m.first==='guest'?'you':'Player 1'} plays TOOT, the other plays OTTO · who starts: ${m.first==='guest'?'you':m.first==='random'?'random':esc(m.hostNickname)}`; body.appendChild(rule);
  },
  renderLobby(body, room, {onStart}){
    const isHost=room.mySeat===1, opp=room.seats[room.mySeat===1?2:1], myWord=room.mySeat===1?'TOOT':'OTTO';
    body.innerHTML=`<p class="on-rule">4×6 board · you want <b>${myWord}</b></p>
      <p class="on-status">You: ${esc(room.myNickname)} · ${esc(opp.nickname||'waiting…')}</p>
      ${isHost?'<div class="on-actions"><button type="button" class="start primary" data-role="start" id="zfStartGo" style="flex:1">Start game</button></div>':'<p class="on-status">Waiting for the host to start…</p>'}`;
    if(isHost) body.querySelector('#zfStartGo').onclick=onStart;
  },
  onCreateFromError: showCreateScreen,
  onLeft(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
});

/* ================= entry point ================= */
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
      <p class="on-rule">4×6 board · Player 1 wants TOOT, Player 2 wants OTTO</p>
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
        client.sendMsg({ t:'create', game:'toot', attemptId, nickname: nick, first });
      } catch(e){
        client.showCreateFailure(body, btn, e, 'Create room', { onRetry: tryCreate, onPlayLocally: ()=>{ client.closeDlg(); window.ZFX && ZFX.open && ZFX.open('toot', false); } });
      }
    };
    body.querySelector('#zfCreateGo').onclick=tryCreate;
  };
  draw();
}

/* ================= reactive live-state handling ================= */
function other(seat){ return seat===1?2:1; }
function applyLiveState(room, {wasStatus}){
  const M=window.ZFX&&ZFX.M;
  if(!M || !M.online) return;
  const mySeat=room.mySeat, seatOther=other(mySeat);
  const cur=M.hist[M.hist.length-1];
  const prevOver=cur.over;
  const connNow=room.seats[seatOther].connected;
  M.online.opponentNickname = room.opponentNickname;
  M.online.connected = room.seats[mySeat].connected;
  M.online.opponentConnected = connNow;
  M.online.busy = !room.seats[1].connected || !room.seats[2].connected || !!room.pending;

  const doSync=()=>{
    M._lastAppliedVersion=room.version;
    const newState = { board: room.board.slice(), sup: { 1:{...room.sup[1]}, 2:{...room.sup[2]} }, turn: room.turnSeat, over: room.over, winner: room.winner, cells: room.cells||[], words: room.words||[], moves: [] };
    ZFX.applyRemote(newState);
    if(M.online.hook) M.online.hook.unlockAfterConfirm();
    if(newState.over && !prevOver) showOnlineResult(M, room);
    drawBar(M);
  };
  if(room.lastMove && (!M._lastAppliedVersion || M._lastAppliedVersion<room.version) && room.lastMove.seat!==mySeat){
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce) doSync(); else setTimeout(doSync, 160);
  } else if(!room.lastMove || room.lastMove.seat===mySeat || (M._lastAppliedVersion||0)>=room.version){
    doSync();
  }
  if(room.status==='abandoned') client.showAbandoned($('gxResult'), M.online.opponentNickname, ()=>{ window.ZFA.toLobby(); });
  if(room.status==='active' && (wasStatus==='finished'||wasStatus==='abandoned')){ $('gxResult').classList.remove('show'); $('gxResult').innerHTML=''; }
  drawBar(M);
  const stage=$('gxGame').querySelector('.stage');
  if(room.pending){
    client.drawPendingBanner(stage, mySeat, M.online.opponentNickname, room.pending,
      accept=>client.sendMsg({t:'respond',code:room.code,token:room.myToken,requestId:room.pending.id,accept}),
      ()=>client.sendMsg({t:'cancelRequest',code:room.code,token:room.myToken,requestId:room.pending.id}));
  }
  else client.clearPendingBanner(stage);
  if(room.status==='lobby' && wasStatus==='active') client.showReturnedToLobby($('gxResult'), room);
}

function drawBar(M){
  const stage=$('gxGame').querySelector('.stage');
  client.drawBar(stage, { myNickname: M.online.myNickname, opponentNickname: M.online.opponentNickname, opponentConnected: M.online.opponentConnected, meTurn: M.hist[M.hist.length-1].turn===M.humanIs, selfReconnecting: client.selfReconnecting, over: M.hist[M.hist.length-1].over });
}
function showOnlineResult(M, room){
  const mySeat=M.humanIs, seatOther=other(mySeat), name=M.online.opponentNickname||'Your friend';
  const won = room.winner===mySeat;
  const title = room.winner===0 ? 'A draw' : (won?'You won!':`${esc(name)} won`);
  const word = room.lastMove && room.lastMove.word;
  const detail = room.note==='resigned' ? (won?`${esc(name)} left the match.`:'You left the match.')
    : room.winner===0 ? 'The board filled, or one drop spelled both words at once.'
    : `${word} was spelled — the word belongs to ${won?'you':esc(name)}, whoever dropped the letter that completed it.`;
  client.showResult($('gxResult'), { title, detail, mySeatScore: room.score[mySeat], otherScore: room.score[seatOther], opponentName: name, sound: room.winner===0?'ping':(won?'win':'lose'), onRematch: ()=>M.online.hook.requestRematch() });
}

/* ================= entering the live game ================= */
function enterLiveGame(room){
  client.closeDlg();
  const s0 = { board: room.board.slice(), sup: { 1:{...room.sup[1]}, 2:{...room.sup[2]} }, turn: room.turnSeat, over: room.over||false, winner: room.winner||0, cells: room.cells||[], words: room.words||[], moves: [] };
  const M = {
    def: ZFX.def('toot'), opt: { opp:'online' }, hist: [s0], humanIs: room.mySeat, assisted:false, hintMove:null,
    online: { code: room.code, mySeat: room.mySeat, myNickname: room.myNickname, opponentNickname: room.opponentNickname, connected:true, opponentConnected: room.seats[other(room.mySeat)].connected, busy: !(room.seats[1].connected&&room.seats[2].connected), hook: makeHook() },
    _lastAppliedVersion: room.version,
  };
  ZFX.setM(M);
  ZFX.enterLiveView('toot');
  $('gxMode').textContent = 'online friend';
  ZFX.redraw();
  drawBar(M);
  if(room.status==='finished') showOnlineResult(M, room);
  else if(room.status==='abandoned') client.showAbandoned($('gxResult'), M.online.opponentNickname, ()=>{ window.ZFA.toLobby(); });
}
function makeHook(){
  let moveSeq=0, locked=false;
  return {
    proposeMove(m){ if(locked) return; const M=ZFX.M; const s=M.hist[M.hist.length-1]; if(s.turn!==M.humanIs) return; locked=true; const room=client.room;
      client.sendMsg({ t:'move', code:room.code, token:room.myToken, moveId:`${room.mySeat}-${Date.now()}-${moveSeq++}`, version:M._lastAppliedVersion, ch:m.ch, col:m.col });
      setTimeout(()=>{ locked=false; }, 4000);
    },
    unlockAfterConfirm(){ locked=false; },
    requestUndo(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'undo'}); },
    requestRestart(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'restart'}); },
    requestRematch(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'rematch'}); },
  };
}

window.ZFOnlineToot = { open: openOnlineFlow };
function boot(){ client.tryAutoResume(code=>openOnlineFlow()); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
