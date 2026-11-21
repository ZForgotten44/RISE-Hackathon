/* online-pentago.js — the Pentago-specific adapter on top of online-rooms.js's shared room infrastructure: color
   choice (host picks white/black, resolved once on the server) and who-starts, a compact static board preview
   (the board is always the standard empty 6x6 — there is no genuine custom-position editor, so no "Build your
   board" entry exists here), and driving a live online match through games2.js's generic gx framework, reusing the
   same two-phase renderer (pRender, games3.js) offline Pentago uses. A turn is two server-accepted sub-moves
   (place, then rotate) — see server/room-server.js's PentagoRules for the phase/turn bookkeeping this mirrors. */
(function(){
const $=id=>document.getElementById(id);
const RC=window.ZFRoomCore, esc=RC.esc;

const client=RC.createClient({
  basePath:'/pentago',
  isLive: ()=>{ const g=$('gxGame'); return g && g.classList.contains('show') && window.ZFX && ZFX.current()==='pentago' && ZFX.M && ZFX.M.opt.opp==='online'; },
  onSelfReconnecting(v){ const M=window.ZFX&&ZFX.M; if(M && M.online){ M.online.busy = v || !M.online.opponentConnected; drawBar(M); ZFX.redraw(); } },
  onKicked(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
  // A rejected move (stale version, not actually your turn) must release the pending-move lock right away — the
  // resynced board (applied by online-rooms.js from the error's own state) is worthless if the next legal click
  // still gets swallowed by a lock that only clears on its own after a multi-second failsafe.
  onLiveError(){ const M=window.ZFX&&ZFX.M; if(M&&M.online&&M.online.hook) M.online.hook.unlockAfterConfirm(); },
  onEnterLive: enterLiveGame,
  onOpenLobby: room => client.openLobbyScreen(room),
  onLobbyUpdate(){},
  onLiveState: applyLiveState,
  renderJoinPreview(body, m){
    const p=document.createElement('p'); p.className='on-status'; p.innerHTML=`${esc(m.hostNickname)} invited you to play Pentago.`; body.appendChild(p);
    const prev=document.createElement('div'); prev.className='on-preview'; prev.style.padding='10px'; body.appendChild(prev);
    renderPgPreview(prev);
    const rule=document.createElement('p'); rule.className='on-rule'; rule.innerHTML=`6×6 board · you'll play <b>${m.guestColor}</b> · who starts: ${m.first==='guest'?'you':m.first==='random'?'random':esc(m.hostNickname)}`; body.appendChild(rule);
  },
  renderLobby(body, room, {onStart}){
    const isHost=room.mySeat===1, opp=room.seats[room.mySeat===1?2:1], myColor=room.color[room.mySeat];
    body.innerHTML=`<div class="on-preview" id="zfPrev" style="padding:10px"></div>
      <p class="on-rule">6×6 board · you play <b>${myColor}</b></p>
      <p class="on-status">You: ${esc(room.myNickname)} · ${esc(opp.nickname||'waiting…')}</p>
      ${isHost?'<div class="on-actions"><button type="button" class="start primary" data-role="start" id="zfStartGo" style="flex:1">Start game</button></div>':'<p class="on-status">Waiting for the host to start…</p>'}`;
    renderPgPreview(body.querySelector('#zfPrev'));
    if(isHost) body.querySelector('#zfStartGo').onclick=onStart;
  },
  onCreateFromError: showCreateScreen,
  onLeft(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
});

/* ---- a small, non-interactive board preview: the board is always the standard empty 6x6, so this never varies ---- */
function renderPgPreview(container){
  const Z=window.ZART, G=Z.pgGeom({cell:20}), u=Z.uid();
  let g=Z.pgDefs(u);
  for(let q=0;q<4;q++) g+=Z.pgFrame(G,q)+Z.pgQuadHoles(G,q,new Array(36).fill(0),u);
  container.innerHTML=`<svg viewBox="0 0 ${G.W} ${G.H}" style="width:${G.W}px;height:${G.H}px;max-width:100%;color:var(--fg)" aria-hidden="true">${g}</svg>`;
}

/* ================= entry point ================= */
function openOnlineFlow(){
  const urlRoom = new URL(location.href).searchParams.get('room');
  client.showChoiceScreen(showCreateScreen, ()=>client.showJoinCodeScreen());
  if(urlRoom) client.showJoinPreview(RC.normalizeCode(urlRoom));
}

function showCreateScreen(){
  let color='random', first='host', nick='';
  const attemptId = client.genAttemptId();
  const body=client.openDlg('Room settings');
  const draw=()=>{
    body.innerHTML=`<div class="on-field"><label>Your nickname (optional)</label><input type="text" id="zfNick" maxlength="18" placeholder="Player 1" value="${esc(nick)}"></div>
      <div class="on-preview" id="zfPrev" style="padding:10px"></div>
      <div class="on-setup-group"><div class="glabel">Your marbles</div><div class="gs-seg" id="zfColor" role="group"><button type="button" data-v="white" class="${color==='white'?'on':''}">White</button><button type="button" data-v="black" class="${color==='black'?'on':''}">Black</button><button type="button" data-v="random" class="${color==='random'?'on':''}">Random</button></div></div>
      <div class="on-setup-group"><div class="glabel">Who starts</div><div class="gs-seg" id="zfFirst" role="group"><button type="button" data-v="host" class="${first==='host'?'on':''}">You</button><button type="button" data-v="guest" class="${first==='guest'?'on':''}">Friend</button><button type="button" data-v="random" class="${first==='random'?'on':''}">Random</button></div></div>
      <div class="on-actions"><button type="button" class="start primary" id="zfCreateGo" style="flex:1">Create room</button></div>`;
    renderPgPreview(body.querySelector('#zfPrev'));
    body.querySelector('#zfNick').addEventListener('input', e=>{ nick=e.target.value; });
    body.querySelectorAll('#zfColor button').forEach(b=>b.onclick=()=>{ color=b.dataset.v; draw(); });
    body.querySelectorAll('#zfFirst button').forEach(b=>b.onclick=()=>{ first=b.dataset.v; draw(); });
    const tryCreate=async()=>{
      nick=body.querySelector('#zfNick').value.trim();
      const btn=body.querySelector('#zfCreateGo'); if(btn.disabled) return; btn.disabled=true; btn.textContent='Creating…';
      try{
        await client.connect(()=>{ btn.textContent='Waking up the server…'; }, ()=>{ btn.textContent='Still waking up…'; });
        client.onCreated=m=>{ const room={ mySeat:1, myToken:m.token, myNickname:nick||'Player 1' }; Object.assign(room, m.state); client.saveSeat(room.code, m.token, 1, nick||'Player 1'); client.lastIntent={t:'resume', code:room.code, token:room.myToken}; client.room=room; client.showWaitingScreen(); };
        client.onErrorScreen=e=>{ client.showCreateFailure(body, btn, e, 'Create room', {}); };
        client.sendMsg({ t:'create', game:'pentago', attemptId, nickname: nick, color, first });
      } catch(e){
        client.showCreateFailure(body, btn, e, 'Create room', { onRetry: tryCreate, onPlayLocally: ()=>{ client.closeDlg(); window.ZFX && ZFX.open && ZFX.open('pentago', false); } });
      }
    };
    body.querySelector('#zfCreateGo').onclick=tryCreate;
  };
  draw();
}

/* ================= reactive live-state handling ================= */
function other(seat){ return seat===1?2:1; }
function toEngineMove(lm){ return lm.t==='place' ? {t:'place',cell:lm.cell} : {t:'rot',q:lm.q,d:lm.d}; }
/* an independent, from-scratch line check (mirrors server/room-server.js's PentagoRules, kept separate on purpose)
   used only to word the end-of-game explanation ("full board" vs "both players completed a line at once") */
const PG_LINES=(()=>{ const at=(r,c)=>r*6+c, W=[], dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<6;r++)for(let c=0;c<6;c++)for(const [dr,dc] of dirs){ const w=[]; let ok=true;
    for(let k=0;k<5;k++){ const rr=r+dr*k,cc=c+dc*k; if(rr<0||rr>5||cc<0||cc>5){ ok=false; break; } w.push(at(rr,cc)); }
    if(ok) W.push(w); }
  return W; })();
function pgHasLine(cells,p){ return PG_LINES.some(w=>w.every(i=>cells[i]===p)); }
// pRender draws a highlight through every winning line once the game is over (shown.lines) — the offline engine
// tracks this itself as it plays out; an online state is built fresh from a server snapshot with no move-by-move
// history to derive it from, so it has to be recomputed the same way reasonFor() is: independently, from the cells.
function winningLines(cells){ const out=[]; for(const p of [1,2]) for(const w of PG_LINES) if(w.every(i=>cells[i]===p)) out.push(w); return out; }
function reasonFor(cells, lastMoveType, winner){
  if(winner) return lastMoveType==='place' ? 'placement' : 'rotation';
  if(lastMoveType==='rot' && pgHasLine(cells,1) && pgHasLine(cells,2)) return 'both';
  return 'full';
}

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
    if(room.version > (M.online._movesVersion||0)){
      // an undo/restart/rematch clears lastMove server-side — drop stale history rather than mis-highlight or
      // mis-animate a move that no longer happened, instead of trying to patch the array back to length.
      if(room.lastMove) M.online._moves.push(toEngineMove(room.lastMove)); else M.online._moves=[];
      M.online._movesVersion = room.version;
    }
    const newState = { cells: room.cells.slice(), turn: room.turnSeat, phase: room.phase, over: room.over, winner: room.winner,
      moves: M.online._moves.slice(), reason: reasonFor(room.cells, room.lastMove && room.lastMove.t, room.winner),
      lines: room.over ? winningLines(room.cells) : [] };
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
  if(room.pending) client.drawPendingBanner(stage, mySeat, M.online.opponentNickname, room.pending,
    accept=>client.sendMsg({t:'respond',code:room.code,token:room.myToken,requestId:room.pending.id,accept}),
    ()=>client.sendMsg({t:'cancelRequest',code:room.code,token:room.myToken,requestId:room.pending.id}));
  else client.clearPendingBanner(stage);
  if(room.status==='lobby' && wasStatus==='active') client.showReturnedToLobby($('gxResult'), room);
}

function drawBar(M){
  const stage=$('gxGame').querySelector('.stage');
  client.drawBar(stage, { myNickname: M.online.myNickname, opponentNickname: M.online.opponentNickname, opponentConnected: M.online.opponentConnected, meTurn: M.hist[M.hist.length-1].turn===M.humanIs, selfReconnecting: client.selfReconnecting, over: M.hist[M.hist.length-1].over });
}
function showOnlineResult(M, room){
  const mySeat=M.humanIs, seatOther=other(mySeat), name=M.online.opponentNickname||'Your friend';
  const draw = room.winner===0, won = room.winner===mySeat;
  const why={placement:'Five in a row made by the placement itself, before any turn.',rotation:'The turn lined up five marbles.',both:'The turn gave both players a line of five, so nobody wins.',full:'The board filled with no line of five.'}[reasonFor(room.cells, room.lastMove && room.lastMove.t, room.winner)];
  const title = room.note==='resigned' ? (won?'You won!':`${esc(name)} won`) : draw?'A draw':(won?'You won!':`${esc(name)} won`);
  const detail = room.note==='resigned' ? (won?`${esc(name)} left the match.`:'You left the match.') : why;
  client.showResult($('gxResult'), { title, detail, mySeatScore: room.score[mySeat], otherScore: room.score[seatOther], opponentName: name, sound: draw?'ping':(won?'win':'lose'), onRematch: ()=>M.online.hook.requestRematch() });
}

/* ================= entering the live game ================= */
function enterLiveGame(room){
  client.closeDlg();
  const colorOf = seat => room.color[seat]==='white' ? 1 : 2;
  const moves = room.lastMove ? [toEngineMove(room.lastMove)] : [];
  const s0 = { cells: room.cells.slice(), turn: room.turnSeat, phase: room.phase, over: room.over||false, winner: room.winner||0, moves,
    reason: reasonFor(room.cells, room.lastMove && room.lastMove.t, room.winner),
    lines: room.over ? winningLines(room.cells) : [] };
  const M = {
    def: ZFX.def('pentago'), opt: { opp:'online' }, hist: [s0], humanIs: room.mySeat, assisted:false, hintMove:null,
    online: { code: room.code, mySeat: room.mySeat, myNickname: room.myNickname, opponentNickname: room.opponentNickname, connected:true,
      opponentConnected: room.seats[other(room.mySeat)].connected, colorOf, busy: !(room.seats[1].connected&&room.seats[2].connected),
      hook: makeHook(), _moves: moves.slice(), _movesVersion: room.version,
      canUndo: ()=>M.hist[M.hist.length-1].phase==='place' },
    _lastAppliedVersion: room.version,
  };
  ZFX.setM(M);
  ZFX.enterLiveView('pentago');
  $('gxMode').textContent = 'online friend';
  ZFX.redraw();
  drawBar(M);
  // Entering here covers a genuinely live match too, but reconnecting (or just reloading the page) straight into a
  // match that already ended has no earlier "over" to transition from — the result/abandoned notice only ever fired
  // on that transition, so arriving here after the fact needs to show it directly instead of leaving a bare board.
  if(room.status==='finished') showOnlineResult(M, room);
  else if(room.status==='abandoned') client.showAbandoned($('gxResult'), M.online.opponentNickname, ()=>{ window.ZFA.toLobby(); });
}
function makeHook(){
  let moveSeq=0, locked=false;
  return {
    proposeMove(m){ if(locked) return; const M=ZFX.M; const s=M.hist[M.hist.length-1]; if(s.turn!==M.humanIs) return; locked=true; const room=client.room;
      const msg = m.t==='place' ? { mt:'place', cell:m.cell } : { mt:'rot', q:m.q, d:m.d };
      client.sendMsg(Object.assign({ t:'move', code:room.code, token:room.myToken, moveId:`${room.mySeat}-${Date.now()}-${moveSeq++}`, version:M._lastAppliedVersion }, msg));
      setTimeout(()=>{ locked=false; }, 4000);
    },
    unlockAfterConfirm(){ locked=false; },
    requestUndo(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'undo'}); },
    requestRestart(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'restart'}); },
    requestRematch(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'rematch'}); },
  };
}

window.ZFOnlinePentago = { open: openOnlineFlow };
function boot(){ client.tryAutoResume(code=>openOnlineFlow()); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
