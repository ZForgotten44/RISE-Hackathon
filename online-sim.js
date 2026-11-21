/* online-sim.js — the Sim-specific adapter on top of online-rooms.js's shared room infrastructure: board-size and
   rules (classic/reverse) setup, a compact dots-and-edges preview, and driving a live online match through
   games2.js's generic gx framework (ZFX.setM/enterLiveView/applyRemote), reusing the offline board renderer
   (simRender, games2.js) unchanged -- every edge claim already flows through ctx.play(e), which games2.js's play()
   already redirects into M.online.hook.proposeMove() whenever M.opt.opp==='online'. */
(function(){
const $=id=>document.getElementById(id);
const RC=window.ZFRoomCore, esc=RC.esc;

function simGeom(n){ const edges=[]; for(let i=0;i<n;i++)for(let j=i+1;j<n;j++) edges.push([i,j]); return edges; }
function simPos(n){ const V=[]; for(let i=0;i<n;i++){ const a=-Math.PI/2+i*2*Math.PI/n; V.push([250+210*Math.cos(a),250+210*Math.sin(a)]); } return V; }

const client=RC.createClient({
  basePath:'/sim',
  isLive: ()=>{ const g=$('gxGame'); return g && g.classList.contains('show') && window.ZFX && ZFX.current()==='sim' && ZFX.M && ZFX.M.opt.opp==='online'; },
  onSelfReconnecting(v){ const M=window.ZFX&&ZFX.M; if(M && M.online){ M.online.busy = v || !M.online.opponentConnected; drawBar(M); ZFX.redraw(); } },
  onKicked(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
  onLiveError(){ const M=window.ZFX&&ZFX.M; if(M&&M.online&&M.online.hook) M.online.hook.unlockAfterConfirm(); },
  onEnterLive: enterLiveGame,
  onOpenLobby: room => client.openLobbyScreen(room),
  onLobbyUpdate(){},
  onLiveState: applyLiveState,
  renderJoinPreview(body, m){
    const p=document.createElement('p'); p.className='on-status'; p.innerHTML=`${esc(m.hostNickname)} invited you to play Sim.`; body.appendChild(p);
    const prev=document.createElement('div'); prev.className='on-preview'; prev.style.padding='10px'; body.appendChild(prev);
    renderDotsPreview(prev, m.n);
    const rule=document.createElement('p'); rule.className='on-rule'; rule.innerHTML=`${m.n} dots · ${m.reverse?'Reverse Sim (completing a triangle wins)':'Classic (completing a triangle loses)'} · who starts: ${m.first==='guest'?'you':m.first==='random'?'random':esc(m.hostNickname)}`; body.appendChild(rule);
  },
  renderLobby(body, room, {onStart}){
    const isHost=room.mySeat===1, opp=room.seats[room.mySeat===1?2:1];
    body.innerHTML=`<div class="on-preview" id="zfPrev" style="padding:10px"></div>
      <p class="on-rule">${room.n} dots · ${room.reverse?'Reverse Sim':'Classic'}</p>
      <p class="on-status">You: ${esc(room.myNickname)} · ${esc(opp.nickname||'waiting…')}</p>
      ${isHost?'<div class="on-actions"><button type="button" class="start primary" data-role="start" id="zfStartGo" style="flex:1">Start game</button></div>':'<p class="on-status">Waiting for the host to start…</p>'}`;
    renderDotsPreview(body.querySelector('#zfPrev'), room.n);
    if(isHost) body.querySelector('#zfStartGo').onclick=onStart;
  },
  onCreateFromError: showCreateScreen,
  onLeft(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
});

/* ---- a small, non-interactive dots-and-edges preview (join preview / lobby) ---- */
function renderDotsPreview(container, n){
  const S=150, V=[]; for(let i=0;i<n;i++){ const a=-Math.PI/2+i*2*Math.PI/n; V.push([S/2+S*.42*Math.cos(a),S/2+S*.42*Math.sin(a)]); }
  let g=''; for(let i=0;i<n;i++)for(let j=i+1;j<n;j++) g+=`<line x1="${V[i][0].toFixed(1)}" y1="${V[i][1].toFixed(1)}" x2="${V[j][0].toFixed(1)}" y2="${V[j][1].toFixed(1)}" stroke="currentColor" stroke-opacity=".18" stroke-width="1.5"/>`;
  V.forEach(([x,y])=>g+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="currentColor"/>`);
  container.innerHTML=`<svg viewBox="0 0 ${S} ${S}" style="width:${S}px;height:${S}px;max-width:100%;color:var(--fg)" aria-hidden="true">${g}</svg>`;
}

/* ================= entry point ================= */
function openOnlineFlow(){
  const urlRoom = new URL(location.href).searchParams.get('room');
  client.showChoiceScreen(showCreateScreen, ()=>client.showJoinCodeScreen());
  if(urlRoom) client.showJoinPreview(RC.normalizeCode(urlRoom));
}

function showCreateScreen(){
  let n=6, reverse=false, first='host';
  const attemptId = client.genAttemptId();
  const body=client.openDlg('Room settings');
  const draw=()=>{
    body.innerHTML=`<div class="on-field"><label>Your nickname (optional)</label><input type="text" id="zfNick" maxlength="18" placeholder="Player 1"></div>
      <div class="on-setup-group"><div class="glabel">Board</div><div class="gs-seg" id="zfBoard" role="group"><button type="button" data-v="6" class="${n===6?'on':''}">Six dots</button><button type="button" data-v="7" class="${n===7?'on':''}">Seven dots</button></div></div>
      <div id="zfPrev" class="on-preview"></div>
      <div class="on-setup-group"><div class="glabel">Rules</div><div class="gs-seg" id="zfRules" role="group"><button type="button" data-v="classic" class="${!reverse?'on':''}">Classic</button><button type="button" data-v="reverse" class="${reverse?'on':''}">Reverse Sim</button></div></div>
      <div class="on-setup-group"><div class="glabel">Who starts</div><div class="gs-seg" id="zfFirst" role="group"><button type="button" data-v="host" class="${first==='host'?'on':''}">You</button><button type="button" data-v="guest" class="${first==='guest'?'on':''}">Friend</button><button type="button" data-v="random" class="${first==='random'?'on':''}">Random</button></div></div>
      <div class="on-actions"><button type="button" class="start primary" id="zfCreateGo" style="flex:1">Create room</button></div>`;
    renderDotsPreview(body.querySelector('#zfPrev'), n);
    body.querySelectorAll('#zfBoard button').forEach(b=>b.onclick=()=>{ n=+b.dataset.v; draw(); });
    body.querySelectorAll('#zfRules button').forEach(b=>b.onclick=()=>{ reverse=b.dataset.v==='reverse'; draw(); });
    body.querySelectorAll('#zfFirst button').forEach(b=>b.onclick=()=>{ first=b.dataset.v; draw(); });
    const tryCreate=async()=>{
      const nick=body.querySelector('#zfNick').value.trim();
      const btn=body.querySelector('#zfCreateGo'); if(btn.disabled) return; btn.disabled=true; btn.textContent='Creating…';
      try{
        await client.connect(()=>{ btn.textContent='Waking up the server…'; }, ()=>{ btn.textContent='Still waking up…'; });
        client.onCreated=m=>{ const room={ mySeat:1, myToken:m.token, myNickname:nick||'Player 1' }; Object.assign(room, m.state); client.saveSeat(room.code, m.token, 1, nick||'Player 1'); client.lastIntent={t:'resume', code:room.code, token:room.myToken}; client.room=room; client.showWaitingScreen(); };
        client.onErrorScreen=e=>{ client.showCreateFailure(body, btn, e, 'Create room', {}); };
        client.sendMsg({ t:'create', game:'sim', attemptId, nickname: nick, n, reverse, first });
      } catch(e){
        client.showCreateFailure(body, btn, e, 'Create room', { onRetry: tryCreate, onPlayLocally: ()=>{ client.closeDlg();
          try{ const p=JSON.parse(localStorage.getItem('zfx-prefs')||'{}'); p.sim=Object.assign({}, p.sim, {board:String(n), rules:reverse?'reverse':'classic'}); localStorage.setItem('zfx-prefs', JSON.stringify(p)); }catch(err){}
          window.ZFX && ZFX.open && ZFX.open('sim', false);
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
    const newState = { n: room.n, reverse: room.reverse, own: room.own.slice(), turn: room.turnSeat, over: room.over, winner: room.winner, tri: room.tri, moves: [] };
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
  // the seat that completed the triangle is whoever made the winning move -- room.lastMove.seat -- never derived
  // from room.winner: in normal Sim the completer is the LOSER (other(winner)), so reading it off winner directly
  // named the winner as the one who "loses," backwards, exactly for the classic (non-reverse) case.
  const completer = room.lastMove ? room.lastMove.seat : (room.reverse ? room.winner : other(room.winner));
  const completerIsMe = completer===mySeat;
  const detail = room.note==='resigned' ? (won?`${esc(name)} left the match.`:'You left the match.')
    : room.reverse ? `${completerIsMe?'You':esc(name)} completed a triangle of ${completer===1?'solid':'dashed'} edges first, and in Reverse Sim that wins.`
    : `${completerIsMe?'You':esc(name)} completed a triangle of ${completer===1?'solid':'dashed'} edges, so ${completerIsMe?'you lose':esc(name)+' loses'}.`;
  client.showResult($('gxResult'), { title, detail, mySeatScore: room.score[mySeat], otherScore: room.score[seatOther], opponentName: name, sound: won?'win':'lose', onRematch: ()=>M.online.hook.requestRematch() });
}

/* ================= entering the live game ================= */
function enterLiveGame(room){
  client.closeDlg();
  const s0 = { n: room.n, reverse: room.reverse, own: room.own.slice(), turn: room.turnSeat, over: room.over||false, winner: room.winner||0, tri: room.tri||null, moves: [] };
  const M = {
    def: ZFX.def('sim'), opt: { opp:'online' }, hist: [s0], humanIs: room.mySeat, assisted:false, hintMove:null,
    online: { code: room.code, mySeat: room.mySeat, myNickname: room.myNickname, opponentNickname: room.opponentNickname, connected:true, opponentConnected: room.seats[other(room.mySeat)].connected, busy: !(room.seats[1].connected&&room.seats[2].connected), hook: makeHook() },
    _lastAppliedVersion: room.version,
  };
  ZFX.setM(M);
  ZFX.enterLiveView('sim');
  $('gxMode').textContent = 'online friend';
  ZFX.redraw();
  drawBar(M);
  if(room.status==='finished') showOnlineResult(M, room);
  else if(room.status==='abandoned') client.showAbandoned($('gxResult'), M.online.opponentNickname, ()=>{ window.ZFA.toLobby(); });
}
function makeHook(){
  let moveSeq=0, locked=false;
  return {
    proposeMove(e){ if(locked) return; const M=ZFX.M; const s=M.hist[M.hist.length-1]; if(s.turn!==M.humanIs) return; locked=true; const room=client.room;
      client.sendMsg({ t:'move', code:room.code, token:room.myToken, moveId:`${room.mySeat}-${Date.now()}-${moveSeq++}`, version:M._lastAppliedVersion, e });
      setTimeout(()=>{ locked=false; }, 4000);
    },
    unlockAfterConfirm(){ locked=false; },
    requestUndo(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'undo'}); },
    requestRestart(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'restart'}); },
    requestRematch(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'rematch'}); },
  };
}

window.ZFOnlineSim = { open: openOnlineFlow };
function boot(){ client.tryAutoResume(code=>openOnlineFlow()); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
