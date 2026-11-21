/* online-notakto.js — the Notakto-specific adapter on top of online-rooms.js's shared room infrastructure: board-count
   setup (3/5/7), a compact multi-board preview, and driving a live online match through games2.js's generic gx
   framework (ZFX.setM/enterLiveView/applyRemote), reusing the same board renderer (nkRender, games3.js) offline
   Notakto uses -- online play never touches nkRender itself; every click already flows through ctx.play(), which
   games2.js's play() already redirects into M.online.hook.proposeMove() whenever M.opt.opp==='online'. */
(function(){
const $=id=>document.getElementById(id);
const RC=window.ZFRoomCore, esc=RC.esc;

const client=RC.createClient({
  basePath:'/notakto',
  isLive: ()=>{ const g=$('gxGame'); return g && g.classList.contains('show') && window.ZFX && ZFX.current()==='notakto' && ZFX.M && ZFX.M.opt.opp==='online'; },
  onSelfReconnecting(v){ const M=window.ZFX&&ZFX.M; if(M && M.online){ M.online.busy = v || !M.online.opponentConnected; drawBar(M); ZFX.redraw(); } },
  onKicked(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
  onLiveError(){ const M=window.ZFX&&ZFX.M; if(M&&M.online&&M.online.hook) M.online.hook.unlockAfterConfirm(); },
  onEnterLive: enterLiveGame,
  onOpenLobby: room => client.openLobbyScreen(room),
  onLobbyUpdate(){},
  onLiveState: applyLiveState,
  renderJoinPreview(body, m){
    const p=document.createElement('p'); p.className='on-status'; p.innerHTML=`${esc(m.hostNickname)} invited you to play Notakto.`; body.appendChild(p);
    const prev=document.createElement('div'); prev.className='on-preview'; prev.style.padding='10px'; body.appendChild(prev);
    renderBoardsPreview(prev, m.n);
    const rule=document.createElement('p'); rule.className='on-rule'; rule.innerHTML=`${m.n} board${m.n===1?'':'s'} · everyone plays X · who starts: ${m.first==='guest'?'you':m.first==='random'?'random':esc(m.hostNickname)}`; body.appendChild(rule);
  },
  renderLobby(body, room, {onStart}){
    const isHost=room.mySeat===1, opp=room.seats[room.mySeat===1?2:1];
    body.innerHTML=`<div class="on-preview" id="zfPrev" style="padding:10px"></div>
      <p class="on-rule">${room.n} board${room.n===1?'':'s'} · everyone plays X</p>
      <p class="on-status">You: ${esc(room.myNickname)} · ${esc(opp.nickname||'waiting…')}</p>
      ${isHost?'<div class="on-actions"><button type="button" class="start primary" data-role="start" id="zfStartGo" style="flex:1">Start game</button></div>':'<p class="on-status">Waiting for the host to start…</p>'}`;
    renderBoardsPreview(body.querySelector('#zfPrev'), room.n);
    if(isHost) body.querySelector('#zfStartGo').onclick=onStart;
  },
  onCreateFromError: showCreateScreen,
  onLeft(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
});

/* ---- a small, non-interactive multi-board preview (join preview / lobby) ---- */
function renderBoardsPreview(container, n, boards){
  const cs=26, gap=10, cols=Math.min(n,4), rows=Math.ceil(n/cols);
  const bw=cs*3, W=cols*bw+(cols-1)*gap, H=rows*bw+(rows-1)*gap;
  let g='';
  for(let b=0;b<n;b++){ const bx=(b%cols)*(bw+gap), by=Math.floor(b/cols)*(bw+gap); const mask=boards?boards[b]:0;
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){ const filled=!!(mask&(1<<(r*3+c)));
      g+=`<rect x="${bx+c*cs+1}" y="${by+r*cs+1}" width="${cs-2}" height="${cs-2}" rx="3" fill="currentColor" fill-opacity="${filled?0.4:0.14}"/>`; } }
  container.innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:${W}px;height:${H}px;max-width:100%;color:var(--fg)" aria-hidden="true">${g}</svg>`;
}

/* ================= entry point ================= */
function openOnlineFlow(){
  const urlRoom = new URL(location.href).searchParams.get('room');
  client.showChoiceScreen(showCreateScreen, ()=>client.showJoinCodeScreen());
  if(urlRoom) client.showJoinPreview(RC.normalizeCode(urlRoom));
}

function showCreateScreen(){
  let boards=3, first='host';
  const attemptId = client.genAttemptId();
  const body=client.openDlg('Room settings');
  const draw=()=>{
    body.innerHTML=`<div class="on-field"><label>Your nickname (optional)</label><input type="text" id="zfNick" maxlength="18" placeholder="Player 1"></div>
      <div class="on-setup-group"><div class="glabel">Boards</div><div class="gs-seg" id="zfBoards" role="group"><button type="button" data-v="3" class="${boards===3?'on':''}">Three</button><button type="button" data-v="5" class="${boards===5?'on':''}">Five</button><button type="button" data-v="7" class="${boards===7?'on':''}">Seven</button></div></div>
      <div id="zfPrev" class="on-preview"></div>
      <div class="on-setup-group"><div class="glabel">Who starts</div><div class="gs-seg" id="zfFirst" role="group"><button type="button" data-v="host" class="${first==='host'?'on':''}">You</button><button type="button" data-v="guest" class="${first==='guest'?'on':''}">Friend</button><button type="button" data-v="random" class="${first==='random'?'on':''}">Random</button></div></div>
      <div class="on-actions"><button type="button" class="start primary" id="zfCreateGo" style="flex:1">Create room</button></div>`;
    renderBoardsPreview(body.querySelector('#zfPrev'), boards);
    body.querySelectorAll('#zfBoards button').forEach(b=>b.onclick=()=>{ boards=+b.dataset.v; draw(); });
    body.querySelectorAll('#zfFirst button').forEach(b=>b.onclick=()=>{ first=b.dataset.v; draw(); });
    const tryCreate=async()=>{
      const nick=body.querySelector('#zfNick').value.trim();
      const btn=body.querySelector('#zfCreateGo'); if(btn.disabled) return; btn.disabled=true; btn.textContent='Creating…';
      try{
        await client.connect(()=>{ btn.textContent='Waking up the server…'; }, ()=>{ btn.textContent='Still waking up…'; });
        client.onCreated=m=>{ const room={ mySeat:1, myToken:m.token, myNickname:nick||'Player 1' }; Object.assign(room, m.state); client.saveSeat(room.code, m.token, 1, nick||'Player 1'); client.lastIntent={t:'resume', code:room.code, token:room.myToken}; client.room=room; client.showWaitingScreen(); };
        client.onErrorScreen=e=>{ client.showCreateFailure(body, btn, e, 'Create room', {}); };
        client.sendMsg({ t:'create', game:'notakto', attemptId, nickname: nick, boards, first });
      } catch(e){
        client.showCreateFailure(body, btn, e, 'Create room', { onRetry: tryCreate, onPlayLocally: ()=>{ client.closeDlg();
          try{ const p=JSON.parse(localStorage.getItem('zfx-prefs')||'{}'); p.notakto=Object.assign({}, p.notakto, {boards:String(boards)}); localStorage.setItem('zfx-prefs', JSON.stringify(p)); }catch(err){}
          window.ZFX && ZFX.open && ZFX.open('notakto', false);
        } });
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
    const newState = { boards: room.boards.slice(), closed: room.closed.slice(), turn: room.turnSeat, over: room.over, winner: room.winner, loser: room.over?other(room.winner):0,
      lastLine: room.lastMove ? { b: room.lastMove.b, mask: 0 } : null, moves: [] };
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
  const title = won?'You won!':`${esc(name)} won`;
  const detail = room.note==='resigned' ? (won?`${esc(name)} left the match.`:'You left the match.') : `${won?esc(name):'You'} closed the last open board.`;
  client.showResult($('gxResult'), { title, detail, mySeatScore: room.score[mySeat], otherScore: room.score[seatOther], opponentName: name, sound: won?'win':'lose', onRematch: ()=>M.online.hook.requestRematch(), onCustomize: ()=>{ const d=ZFX.def('notakto'); d&&d.onlineCustomize&&d.onlineCustomize(); } });
}

/* ================= entering the live game ================= */
function enterLiveGame(room){
  client.closeDlg();
  const s0 = { boards: room.boards.slice(), closed: room.closed.slice(), turn: room.turnSeat, over: room.over||false, winner: room.winner||0, loser: room.over?other(room.winner):0, lastLine: null, moves: [] };
  const M = {
    def: ZFX.def('notakto'), opt: { opp:'online' }, hist: [s0], humanIs: room.mySeat, assisted:false, hintMove:null,
    online: { code: room.code, mySeat: room.mySeat, myNickname: room.myNickname, opponentNickname: room.opponentNickname, connected:true, opponentConnected: room.seats[other(room.mySeat)].connected, busy: !(room.seats[1].connected&&room.seats[2].connected), hook: makeHook() },
    _lastAppliedVersion: room.version,
  };
  ZFX.setM(M);
  ZFX.enterLiveView('notakto');
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
      client.sendMsg({ t:'move', code:room.code, token:room.myToken, moveId:`${room.mySeat}-${Date.now()}-${moveSeq++}`, version:M._lastAppliedVersion, b:m.b, c:m.c });
      setTimeout(()=>{ locked=false; }, 4000);
    },
    unlockAfterConfirm(){ locked=false; },
    requestUndo(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'undo'}); },
    requestRestart(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'restart'}); },
    requestRematch(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'rematch'}); },
    requestCustomize(boards, first){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'customize',boards,first}); },
  };
}

/* ================= mid-match "Customize board" proposal (change board count) ================= */
function showCustomizeScreen(){
  const M=window.ZFX&&ZFX.M; if(!M||!M.online) return;
  let boards=M.hist[0].boards.length, first='host';
  const body=client.openDlg('Propose a new board count');
  const draw=()=>{
    body.innerHTML=`<div class="on-setup-group"><div class="glabel">Boards</div><div class="gs-seg" id="zfBoards" role="group"><button type="button" data-v="3" class="${boards===3?'on':''}">Three</button><button type="button" data-v="5" class="${boards===5?'on':''}">Five</button><button type="button" data-v="7" class="${boards===7?'on':''}">Seven</button></div></div>
      <div id="zfPrev" class="on-preview"></div>
      <div class="on-setup-group"><div class="glabel">Who starts</div><div class="gs-seg" id="zfFirst" role="group"><button type="button" data-v="host" class="${first==='host'?'on':''}">You</button><button type="button" data-v="guest" class="${first==='guest'?'on':''}">Friend</button><button type="button" data-v="random" class="${first==='random'?'on':''}">Random</button></div></div>
      <p class="gs-note">Applying this proposes a new board count to your friend — nothing changes until they agree.</p>
      <div class="on-actions"><button type="button" class="start primary" id="zfProposeGo" style="flex:1">Propose this board</button></div>`;
    renderBoardsPreview(body.querySelector('#zfPrev'), boards);
    body.querySelectorAll('#zfBoards button').forEach(b=>b.onclick=()=>{ boards=+b.dataset.v; draw(); });
    body.querySelectorAll('#zfFirst button').forEach(b=>b.onclick=()=>{ first=b.dataset.v; draw(); });
    body.querySelector('#zfProposeGo').onclick=()=>{ client.closeDlg(); M.online.hook.requestCustomize(boards, first); };
  };
  draw();
}

window.ZFOnlineNotakto = { open: openOnlineFlow, customize: showCustomizeScreen };
function boot(){ client.tryAutoResume(code=>openOnlineFlow()); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
