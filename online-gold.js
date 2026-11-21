/* online-gold.js — the Gold Coin-specific adapter on top of online-rooms.js's shared room infrastructure: a simple
   click-to-place board editor (track length, one gold coin, any number of pennies), a compact preview, and driving
   a live online match through games2.js's generic gx framework (ZFX.setM/enterLiveView/applyRemote), reusing the
   offline board renderer (gRender, games4.js) unchanged -- every slide/collect already flows through ctx.play(m),
   which games2.js's play() already redirects into M.online.hook.proposeMove() whenever M.opt.opp==='online'.
   Gold Coin is in shell.js's GX_INPLACE set, so its mid-match "Customize board" reuses this same editor, exactly
   like Domineering's. */
(function(){
const $=id=>document.getElementById(id);
const RC=window.ZFRoomCore, esc=RC.esc;
const GCS=30, GPAD=8, GOLD_MIN=2, GOLD_MAX=60;

const client=RC.createClient({
  basePath:'/gold-coin',
  isLive: ()=>{ const g=$('gxGame'); return g && g.classList.contains('show') && window.ZFX && ZFX.current()==='gold' && ZFX.M && ZFX.M.opt.opp==='online'; },
  onSelfReconnecting(v){ const M=window.ZFX&&ZFX.M; if(M && M.online){ M.online.busy = v || !M.online.opponentConnected; drawBar(M); ZFX.redraw(); } },
  onKicked(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
  onLiveError(){ const M=window.ZFX&&ZFX.M; if(M&&M.online&&M.online.hook) M.online.hook.unlockAfterConfirm(); },
  onEnterLive: enterLiveGame,
  onOpenLobby: room => client.openLobbyScreen(room),
  onLobbyUpdate(){},
  onLiveState: applyLiveState,
  renderJoinPreview(body, m){
    const p=document.createElement('p'); p.className='on-status'; p.innerHTML=`${esc(m.hostNickname)} invited you to play The Gold Coin.`; body.appendChild(p);
    const prev=document.createElement('div'); prev.className='on-preview'; prev.style.padding='10px'; body.appendChild(prev);
    renderTrackPreview(prev, m.n, m.pens, m.gold);
    const rule=document.createElement('p'); rule.className='on-rule'; rule.innerHTML=`${m.n} spaces · ${m.variant==='rear'?'pennies may sit behind gold':'gold is farthest right'} · who starts: ${m.first==='guest'?'you':m.first==='random'?'random':esc(m.hostNickname)}`; body.appendChild(rule);
  },
  renderLobby(body, room, {onStart}){
    const isHost=room.mySeat===1, opp=room.seats[room.mySeat===1?2:1];
    body.innerHTML=`<div class="on-preview" id="zfPrev" style="padding:10px"></div>
      <p class="on-rule">${room.n} spaces · ${room.variant==='rear'?'pennies may sit behind gold':'gold is farthest right'}</p>
      <p class="on-status">You: ${esc(room.myNickname)} · ${esc(opp.nickname||'waiting…')}</p>
      ${isHost?'<div class="on-actions"><button type="button" class="start primary" data-role="start" id="zfStartGo" style="flex:1">Start game</button></div>':'<p class="on-status">Waiting for the host to start…</p>'}`;
    renderTrackPreview(body.querySelector('#zfPrev'), room.n, room.coins.filter(c=>c.kind==='penny').map(c=>c.pos), (room.coins.find(c=>c.kind==='gold')||{}).pos);
    if(isHost) body.querySelector('#zfStartGo').onclick=onStart;
  },
  onCreateFromError: showCreateScreen,
  onLeft(){ window.ZFA && ZFA.toLobby && ZFA.toLobby(); },
});

/* ---- a small, non-interactive track preview (join preview / lobby) ---- */
function renderTrackPreview(container, n, pens, gold){
  const cs=Math.max(10,Math.min(22,Math.floor(360/n))), W=n*cs, H=cs+8;
  let g=''; for(let p=0;p<n;p++) g+=`<rect x="${p*cs+1}" y="1" width="${cs-2}" height="${cs-2}" rx="3" fill="currentColor" fill-opacity="${p===gold||pens.includes(p)?0.32:0.12}"/>`;
  pens.forEach(p=>g+=`<circle cx="${p*cs+cs/2}" cy="${cs/2}" r="${cs*.32}" fill="currentColor" fill-opacity=".55"/>`);
  if(gold!=null) g+=`<circle cx="${gold*cs+cs/2}" cy="${cs/2}" r="${cs*.32}" fill="none" stroke="currentColor" stroke-width="2"/>`;
  container.innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:${W}px;height:${H}px;max-width:100%;color:var(--fg)" aria-hidden="true">${g}</svg>`;
}

/* ---- the interactive board builder used by both the create-room screen and mid-match "Customize board" ----
   Click a space to cycle empty -> penny -> (gold, if none placed yet) -> empty. Simpler than the offline workshop
   (no drag, no paste, no solver verdict), but enough for two people to agree on a starting position together. */
function buildBoardEditor(container, draft, variantRef, onChange){
  const draw=()=>{
    const n=draft.n; let g='';
    for(let p=0;p<n;p++){ const isGold=draft.gold===p, isPenny=draft.pens.includes(p);
      g+=`<rect data-p="${p}" x="${GPAD+p*GCS+1}" y="${GPAD+1}" width="${GCS-2}" height="${GCS-2}" rx="6" fill="currentColor" fill-opacity="${isGold||isPenny?0.32:0.12}" style="cursor:pointer" tabindex="0" role="button" aria-label="space ${p+1}${isGold?', gold coin':isPenny?', penny':', empty'}"/>`;
      if(isPenny) g+=`<circle cx="${GPAD+p*GCS+GCS/2}" cy="${GPAD+GCS/2}" r="${GCS*.3}" fill="currentColor" fill-opacity=".6" style="pointer-events:none"/>`;
      if(isGold) g+=`<circle cx="${GPAD+p*GCS+GCS/2}" cy="${GPAD+GCS/2}" r="${GCS*.3}" fill="none" stroke="currentColor" stroke-width="2.4" style="pointer-events:none"/>`;
    }
    const free=n-draft.pens.length-(draft.gold!=null?1:0);
    const badVariant = variantRef.v==='std' && draft.pens.some(p=>draft.gold!=null&&p>draft.gold);
    const warn = draft.gold==null ? 'Click a space to place the gold coin.' : badVariant ? 'With “Gold farthest right” rules no penny may stand to the right of the gold — choose “Pennies on both sides,” or move this penny.' : '';
    container.innerHTML=`<div style="display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;margin-bottom:10px">
        <label style="display:flex;align-items:center;gap:6px;font:600 13px var(--font-sans);color:var(--g6)">Track length <button type="button" class="cancel" data-a="-" style="min-height:32px;padding:0 10px">−</button><b style="min-width:2.5ch;text-align:center;color:var(--fg)">${n}</b><button type="button" class="cancel" data-a="+" style="min-height:32px;padding:0 10px">+</button></label>
      </div>
      <div style="display:flex;justify-content:center;overflow-x:auto"><svg viewBox="0 0 ${n*GCS+GPAD*2} ${GCS+GPAD*2}" style="width:min(100%,${n*GCS+GPAD*2}px);height:auto;color:var(--fg)">${g}</svg></div>
      <p class="gs-note" style="text-align:center;margin:8px 0 0">${warn||'Click a space: empty → penny → (gold, once) → empty. Whoever collects the gold coin wins.'}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:8px"><button type="button" class="cancel" data-p="clear">Clear all coins</button><button type="button" class="cancel" data-p="example">Example position</button></div>`;
    container.querySelectorAll('[data-p]').forEach(el=>{ const t=()=>{ const p=+el.dataset.p; if(draft.gold===p){ draft.gold=null; } else if(draft.pens.includes(p)){ draft.pens=draft.pens.filter(x=>x!==p); } else if(draft.gold==null){ draft.gold=p; } else { draft.pens=draft.pens.concat([p]); } commit(); };
      el.addEventListener('click',t); el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); t(); } }); });
    container.querySelector('[data-a="-"]').onclick=()=>resize(n-1); container.querySelector('[data-a="+"]').onclick=()=>resize(n+1);
    container.querySelector('[data-p="clear"]').onclick=()=>{ draft.pens=[]; draft.gold=null; commit(); };
    container.querySelector('[data-p="example"]').onclick=()=>{ const nn=Math.max(8,draft.n); draft.n=nn; draft.pens=[1,4]; draft.gold=nn-2; commit(); };
  };
  function resize(newN){ newN=Math.max(GOLD_MIN,Math.min(GOLD_MAX,newN)); draft.pens=draft.pens.filter(p=>p<newN); if(draft.gold>=newN) draft.gold=null; draft.n=newN; commit(); }
  function commit(){ onChange&&onChange(); draw(); }
  draw();
}

/* the same validity check the offline board uses (gold-engine.js check): '' when the board can be played, else why not */
function boardProblem(draft, variant){ if(draft.gold==null) return 'Place the gold coin first: click an empty space.';
  const e=(window.ZF_E&&ZF_E.GOLD)?ZF_E.GOLD.check({n:draft.n,pens:draft.pens,gold:draft.gold,variant}):[]; const m=e[0]||'';
  return m.startsWith('In the standard game')?'With “Gold farthest right” rules no penny may stand to the right of the gold. Move that penny, or choose “Pennies on both sides”.':m; }
/* keep a Create/Propose button's enabled state and its reason (shown right below it) in step with the board */
function gateButton(body, btnSel, draft, variantRef){ const btn=body.querySelector(btnSel); if(!btn) return ()=>''; let why=body.querySelector('.on-why');
  if(!why){ why=document.createElement('p'); why.className='gs-note on-why'; why.setAttribute('aria-live','polite'); why.style.cssText='text-align:center;margin:8px 0 0;min-height:1.4em'; btn.parentNode.insertAdjacentElement('afterend',why); }
  const sync=()=>{ const m=boardProblem(draft, variantRef.v); btn.disabled=!!m; btn.title=m; why.textContent=m; return m; }; sync(); return sync; }

/* ================= entry point ================= */
function openOnlineFlow(){
  const urlRoom = new URL(location.href).searchParams.get('room');
  client.showChoiceScreen(showCreateScreen, ()=>client.showJoinCodeScreen());
  if(urlRoom) client.showJoinPreview(RC.normalizeCode(urlRoom));
}

function showCreateScreen(){
  const draft = { n:11, pens:[1,4], gold:9 };
  const variantRef = { v:'rear' };
  let first='host';
  const attemptId = client.genAttemptId();
  const body=client.openDlg('Room settings');
  const draw=()=>{
    body.innerHTML=`<div class="on-field"><label>Your nickname (optional)</label><input type="text" id="zfNick" maxlength="18" placeholder="Player 1"></div>
      <div class="on-setup-group"><div class="glabel">Rules</div><div class="gs-seg" id="zfVariant" role="group"><button type="button" data-v="rear" class="${variantRef.v==='rear'?'on':''}">Pennies on both sides</button><button type="button" data-v="std" class="${variantRef.v==='std'?'on':''}">Gold farthest right</button></div></div>
      <div id="zfBoardEditor"></div>
      <div class="on-setup-group"><div class="glabel">Who starts</div><div class="gs-seg" id="zfFirst" role="group"><button type="button" data-v="host" class="${first==='host'?'on':''}">You</button><button type="button" data-v="guest" class="${first==='guest'?'on':''}">Friend</button><button type="button" data-v="random" class="${first==='random'?'on':''}">Random</button></div></div>
      <div class="on-actions"><button type="button" class="start primary" id="zfCreateGo" style="flex:1">Create room</button></div>`;
    let gate=()=>''; buildBoardEditor(body.querySelector('#zfBoardEditor'), draft, variantRef, ()=>gate());
    body.querySelectorAll('#zfVariant button').forEach(b=>b.onclick=()=>{ variantRef.v=b.dataset.v; draw(); });
    body.querySelectorAll('#zfFirst button').forEach(b=>b.onclick=()=>{ first=b.dataset.v; draw(); });
    gate=gateButton(body, '#zfCreateGo', draft, variantRef);
    const tryCreate=async()=>{
      if(boardProblem(draft, variantRef.v)){ gate(); return; }
      const nick=body.querySelector('#zfNick').value.trim();
      const btn=body.querySelector('#zfCreateGo'); if(btn.disabled) return; btn.disabled=true; btn.textContent='Creating…';
      try{
        await client.connect(()=>{ btn.textContent='Waking up the server…'; }, ()=>{ btn.textContent='Still waking up…'; });
        client.onCreated=m=>{ const room={ mySeat:1, myToken:m.token, myNickname:nick||'Player 1' }; Object.assign(room, m.state); client.saveSeat(room.code, m.token, 1, nick||'Player 1'); client.lastIntent={t:'resume', code:room.code, token:room.myToken}; client.room=room; client.showWaitingScreen(); };
        client.onErrorScreen=e=>{ client.showCreateFailure(body, btn, e, 'Create room', {}); };
        client.sendMsg({ t:'create', game:'gold', attemptId, nickname: nick, n:draft.n, pens:draft.pens, gold:draft.gold, variant:variantRef.v, first });
      } catch(e){
        client.showCreateFailure(body, btn, e, 'Create room', { onRetry: tryCreate, onPlayLocally: ()=>{ client.closeDlg();
          try{ const p=JSON.parse(localStorage.getItem('zfx-prefs')||'{}'); p.gold=Object.assign({}, p.gold, {position:'custom', custom:JSON.stringify({n:draft.n,pens:draft.pens,gold:draft.gold}), variant:variantRef.v}); localStorage.setItem('zfx-prefs', JSON.stringify(p)); }catch(err){}
          window.ZFX && ZFX.open && ZFX.open('gold', false);
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
    // moves only drives the offline renderer's slide/collect animation (one entry, the move just accepted, is
    // all it ever looks at via s.moves[s.moves.length-1]); taken comes straight from the server's own snapshot,
    // so a reconnect or a late join still shows an accurate "who took what" tray.
    const moves = cur.moves?cur.moves.slice():[];
    // a later update (a rematch request, a reconnect) carries the same lastMove again: add it once, or the board
    // replays the collect animation against a coin that is already gone
    const lm=room.lastMove, prevMv=moves[moves.length-1];
    if(lm && lm.mt && !(prevMv && prevMv.t===lm.mt && prevMv.id===lm.id && prevMv.to===lm.to && prevMv.by===lm.seat)) moves.push({ t:lm.mt, id:lm.id, to:lm.to, by:lm.seat });
    const newState = { n: room.n, variant: room.variant, coins: room.coins.map(c=>({...c})), turn: room.turnSeat, over: room.over, winner: room.winner, taken: (room.taken||[]).slice(), moves };
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
    if(room.pending.kind==='customize' && room.pending.payload){
      const banner=stage.querySelector('#zfOnPending');
      if(banner && !banner.querySelector('.on-preview')){
        const p=room.pending.payload;
        const prev=document.createElement('div'); prev.className='on-preview'; prev.style.cssText='padding:10px;margin-bottom:10px';
        renderTrackPreview(prev, p.n, p.pens, p.gold);
        banner.insertAdjacentElement('afterbegin', prev);
      }
    }
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
  const detail = room.note==='resigned' ? (won?`${esc(name)} left the match.`:'You left the match.') : `${won?'You':esc(name)} collected the gold coin.`;
  client.showResult($('gxResult'), { title, detail, mySeatScore: room.score[mySeat], otherScore: room.score[seatOther], opponentName: name, sound: won?'win':'lose', onRematch: ()=>M.online.hook.requestRematch(), onCustomize: ()=>{ const d=ZFX.def('gold'); d&&d.onlineCustomize&&d.onlineCustomize(); } });
}

/* ================= entering the live game ================= */
function enterLiveGame(room){
  client.closeDlg();
  const s0 = { n: room.n, variant: room.variant, coins: room.coins.map(c=>({...c})), turn: room.turnSeat, over: room.over||false, winner: room.winner||0, taken: (room.taken||[]).slice(), moves: [] };
  const M = {
    def: ZFX.def('gold'), opt: { opp:'online', variant: room.variant }, hist: [s0], humanIs: room.mySeat, assisted:false, hintMove:null,
    online: { code: room.code, mySeat: room.mySeat, myNickname: room.myNickname, opponentNickname: room.opponentNickname, connected:true, opponentConnected: room.seats[other(room.mySeat)].connected, busy: !(room.seats[1].connected&&room.seats[2].connected), hook: makeHook() },
    _lastAppliedVersion: room.version,
  };
  ZFX.setM(M);
  ZFX.enterLiveView('gold');
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
      // m.t is the offline move's own type ('collect'/'slide'); the envelope's own t is always 'move', so the
      // move's type rides in mt instead -- reusing t here would silently overwrite 'move' (see room-server.js).
      client.sendMsg({ t:'move', code:room.code, token:room.myToken, moveId:`${room.mySeat}-${Date.now()}-${moveSeq++}`, version:M._lastAppliedVersion, mt:m.t, id:m.id, to:m.to });
      setTimeout(()=>{ locked=false; }, 4000);
    },
    unlockAfterConfirm(){ locked=false; },
    requestUndo(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'undo'}); },
    requestRestart(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'restart'}); },
    requestRematch(){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'rematch'}); },
    requestCustomize(n, pens, gold, variant, first){ const room=client.room; if(room.pending) return; client.sendMsg({t:'request',code:room.code,token:room.myToken,kind:'customize',n,pens,gold,variant,first}); },
  };
}

/* ================= mid-match "Customize board" proposal ================= */
function showCustomizeScreen(){
  const M=window.ZFX&&ZFX.M; if(!M||!M.online) return;
  const cur=M.hist[0];
  const draft = { n: cur.n, pens: cur.coins.filter(c=>c.kind==='penny').map(c=>c.pos), gold: (cur.coins.find(c=>c.kind==='gold')||{}).pos };
  const variantRef = { v: cur.variant||'std' };
  let first='host';
  const body=client.openDlg('Propose a new board');
  const draw=()=>{
    body.innerHTML=`<div class="on-setup-group"><div class="glabel">Rules</div><div class="gs-seg" id="zfVariant" role="group"><button type="button" data-v="rear" class="${variantRef.v==='rear'?'on':''}">Pennies on both sides</button><button type="button" data-v="std" class="${variantRef.v==='std'?'on':''}">Gold farthest right</button></div></div>
      <div id="zfBoardEditor"></div>
      <div class="on-setup-group"><div class="glabel">Who starts</div><div class="gs-seg" id="zfFirst" role="group"><button type="button" data-v="host" class="${first==='host'?'on':''}">You</button><button type="button" data-v="guest" class="${first==='guest'?'on':''}">Friend</button><button type="button" data-v="random" class="${first==='random'?'on':''}">Random</button></div></div>
      <p class="gs-note">Applying this proposes a new board to your friend — nothing changes until they agree.</p>
      <div class="on-actions"><button type="button" class="start primary" id="zfProposeGo" style="flex:1">Propose this board</button></div>`;
    let gate=()=>''; buildBoardEditor(body.querySelector('#zfBoardEditor'), draft, variantRef, ()=>gate());
    body.querySelectorAll('#zfVariant button').forEach(b=>b.onclick=()=>{ variantRef.v=b.dataset.v; draw(); });
    body.querySelectorAll('#zfFirst button').forEach(b=>b.onclick=()=>{ first=b.dataset.v; draw(); });
    gate=gateButton(body, '#zfProposeGo', draft, variantRef);
    body.querySelector('#zfProposeGo').onclick=()=>{ if(boardProblem(draft, variantRef.v)){ gate(); return; } client.closeDlg(); M.online.hook.requestCustomize(draft.n, draft.pens, draft.gold, variantRef.v, first); };
  };
  draw();
}

window.ZFOnlineGold = { open: openOnlineFlow, customize: showCustomizeScreen };
function boot(){ client.tryAutoResume(code=>openOnlineFlow()); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
