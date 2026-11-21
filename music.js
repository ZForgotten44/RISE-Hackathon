/* music.js: one long shared soundtrack for the whole site, played through the natural song boundaries already
   present in the recording (quiet gaps between pieces) instead of looping the raw file or jumping to random
   timestamps. Each boundary gets a short fade-out/fade-in pair -- never two copies audible at once. Music has its
   own mute control and its own "zf-music-on" preference, entirely independent
   of sound.js's effects mute ("zf-sound") -- muting one must never touch the other. This file builds and owns
   that music button itself (mirroring sound.js's own soundsw), inserted right next to it. The two volumes are
   independent regardless of mute state, so effects always cut through over music.
   Since pages are separate loads (not a SPA), position and mute state are saved and picked back up
   on the next page rather than restarting the track.
   The source recording is split into a few files (FILES) because Cloudflare Workers static assets cap any
   one file at 25MiB; each cut lands on one of the same natural gaps, so no song is split across two files.
   Entering a different game switches to a different *file* (a shuffled rotation, see nextFile), starting on one
   of that file's own passage boundaries. "Which game the music belongs to" is persisted (GAMEKEY), so the switch
   happens whichever way the game was reached: an in-page route (arcade-wire.js), a fresh page load, a card on
   the homepage, a pasted URL, a party room changing game -- and a plain reload of the same game never switches.
   Some destinations have a fixed file instead (PINNED, see destOf): the homepage always plays zfgames-1, the /arcade
   catalogue zfgames-4 and every strategy / game-theory page zfgames-3, whichever way they are reached (a direct visit,
   a link, Back/Forward, a restored page). Each pinned file remembers where it was (FILEPOS), so coming back to it
   picks up there, and a pinned file that is already playing simply continues. While a pinned file is playing, its
   passages loop within that file rather than running on into the next one.
   Usage from sound.js: window.ZMusic.duck() briefly lowers music for an important result sound, then restores it.
   window.ZMusic.hold(true/false) keeps it lowered while a spoken demonstration plays. */
(function(){
  /* any embedded copy of the site (the ZF Games window in /about, or a desktop inside that) stays quiet: the page around it
     already plays the music, and two copies would play over each other */
  let framed=true; try{ framed=window.top!==window; }catch(e){}
  try{ if(framed){ const no=()=>{}; window.ZMusic={duck:no,hold:no,enterGame:no,yieldTo:no,yielded:()=>false,state:()=>({}),isPlaying:()=>false,isOn:()=>false,setOn:no,toggle:no,_debug:()=>({})}; return; } }catch(e){}
  let yielded=false;   /* see yieldTo */
  const FILES=['/audio/zfgames-1.mp3','/audio/zfgames-2.mp3','/audio/zfgames-3.mp3','/audio/zfgames-4.mp3'];
  const POSKEY='zf-music-pos', MUSICKEY='zf-music-on', GAMEKEY='zf-music-game', ROTKEY='zf-music-rot', NEXTKEY='zf-music-next', FILEPOSKEY='zf-music-filepos';
  /* [file index, local start, local end] seconds of each piece -- the recording's own quiet gaps, found once
     with ffmpeg's silencedetect (merging the one gap too short to be a real boundary) and re-timed to each
     piece's position within whichever of the split files it now lives in. */
  const TRACKS=[[0,0,180.62],[0,182.49,360.74],[0,361.84,512.31],[0,514.6,805.01],[0,806.31,989.23],
    [0,990.78,1162.52],[1,0.77,124.68],[1,130.29,337.92],[1,341.69,518.11],[1,520.63,619.79],
    [1,620.93,798.81],[1,801.05,905.41],[1,908.11,1098.33],[2,2.27,190.77],[2,193.33,424.85],
    [2,427.12,525.31],[2,526.17,758.97],[2,761.06,874.91],[2,878.53,1104.04],[3,0.42,118.77],
    [3,119.34,328.38],[3,329.65,538.69],[3,539.98,786.57],[3,790.21,817.15],[3,817.77,1000.79]];
  const FADE=1.3, RESUME_FADE=1.2, MUTE_FADE=.25, DUCK_MS=150, DUCK_HOLD=450, RESTORE_MS=900;
  const NAV_FADE=400, PREP_WAIT=4000, NEXT_TTL=60000, ATTEMPT_WAIT=6000;
  const VOL_LOUD=.5, VOL_GAME=.22, DUCK_TO=.35;

  const lsGet=k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } };
  const lsSet=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  const isMuted=()=>{ try{ return localStorage.getItem(MUSICKEY)==='off'; }catch(e){ return false; } };
  /* a game's key is its route's first path segment (/nim, /duck-court?room=AB12 -> "nim", "duck-court");
     the homepage and the /arcade catalogue have none */
  const keyOf=path=>{ const p=String(path).replace(/^\/+|\/+$/g,''); return (p===''||p==='arcade'||p==='arcade.html'||p==='index.html')?null:p.split('/')[0]; };
  const inGame=()=>keyOf(location.pathname)!==null;
  /* the strategy and game-theory pages (shared.js's 'strategy' and 'stories' tags; listed here because this file loads
     before shared.js) */
  const STRATEGY=new Set(['gold-coin','nim','chomp','4x4-tic-tac-toe','3d-tic-tac-toe','recursive-tic-tac-toe','notakto','sim','pentago','toot-otto','connect-four','quarto','domineering','last-message','crowded-room','take-two','can-you-force-it']);
  const PINNED={home:0,arcade:3,strategy:2};                     // file indexes: zfgames-1, zfgames-4, zfgames-3
  /* where a path's music belongs: {key, file}. key is what "entering somewhere new" is compared on (all strategy
     pages share one, so moving between them never restarts anything); file is the pinned file, or null for a game
     that keeps the shuffled rotation (arcade games, party games). */
  const destOf=path=>{ const p=String(path).replace(/^\/+|\/+$/g,'');
    if(p===''||p==='index.html') return {key:'@home',file:PINNED.home};
    if(p==='arcade'||p==='arcade.html') return {key:'@arcade',file:PINNED.arcade};
    const k=p.split('/')[0]; return STRATEGY.has(k)?{key:'@strategy',file:PINNED.strategy}:{key:k,file:null}; };
  let curDest=destOf(location.pathname);
  const contextVol=()=>inGame()?VOL_GAME:VOL_LOUD;
  const validIdx=i=>Number.isInteger(i)&&i>=0&&i<TRACKS.length;

  /* shuffled rotation through the files: a persisted bag of the files not yet used this round, never handing out
     the file that's playing now. When the bag runs dry it's refilled with every *other* file in a fresh random
     order, so a round visits the other three before any can come back, and no entry ever repeats the file
     it's replacing. The passage within the chosen file is one of its own boundaries from TRACKS, never a
     synthesized timestamp, so its intro and the transitions after it play as recorded. */
  function nextFile(cur){
    let bag=lsGet(ROTKEY); if(!Array.isArray(bag)) bag=[];
    bag=bag.filter(f=>Number.isInteger(f)&&f>=0&&f<FILES.length&&f!==cur);
    if(!bag.length){ bag=FILES.map((_,i)=>i).filter(i=>i!==cur);
      for(let i=bag.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]]; } }
    const f=bag.shift(); lsSet(ROTKEY,bag); return f;
  }
  function entryTrack(curFile){ const f=nextFile(curFile), ps=TRACKS.map((t,i)=>t[0]===f?i:-1).filter(i=>i>=0); return ps[Math.floor(Math.random()*ps.length)]; }
  const passagesOf=f=>TRACKS.map((t,i)=>t[0]===f?i:-1).filter(i=>i>=0);
  /* the spot a pinned file resumes from: where it was last heard, or else one of its own passage starts */
  function resumeIn(f){ const m=lsGet(FILEPOSKEY), r=m&&m[f];
    if(r&&validIdx(r.idx)&&TRACKS[r.idx][0]===f&&isFinite(r.t)) return {idx:r.idx,t:Math.max(TRACKS[r.idx][1],Math.min(r.t,TRACKS[r.idx][2]-.5))};
    const ps=passagesOf(f), i=ps[Math.floor(Math.random()*ps.length)]; return {idx:i,t:TRACKS[i][1]}; }
  /* the destination's starting spot, given the file playing now: null means "keep playing what's playing" */
  function pickFor(d,curFile){ if(d.file===null) { const i=entryTrack(curFile); return {idx:i,t:TRACKS[i][1]}; }
    return d.file===curFile?null:resumeIn(d.file); }

  let saved=lsGet(POSKEY);
  let idx=(saved&&validIdx(saved.idx))?saved.idx:0;
  let startLocal=(saved&&isFinite(saved.t))?Math.max(TRACKS[idx][1],Math.min(saved.t,TRACKS[idx][2]-.5)):TRACKS[idx][1];
  /* a fresh page load landing on a game other than the one the music belongs to is itself "entering a different
     game": decide the new file *before* the <audio> element exists, so the page fetches only the new file instead
     of starting the old one and abandoning it. A pick already made by the click that led here (see the nav fade
     below) is honored so the file the old page began fetching is the one that plays. A reload of the same game,
     or a page with no game (home, /arcade), keeps the saved file and position. */
  let seenKey=curDest.key;
  if(curDest.key!==lsGet(GAMEKEY)){
    const nx=lsGet(NEXTKEY), curFile=TRACKS[idx][0];
    const pick=(nx&&nx.key===curDest.key&&Date.now()-nx.at<NEXT_TTL&&(nx.keep||validIdx(nx.idx)))?(nx.keep?null:{idx:nx.idx,t:isFinite(nx.t)?nx.t:TRACKS[nx.idx][1]}):pickFor(curDest,curFile);
    if(pick){ idx=pick.idx; startLocal=pick.t; }
    lsSet(GAMEKEY,curDest.key); lsSet(POSKEY,{idx,t:startLocal});
  }
  if(lsGet(NEXTKEY)!==null) lsSet(NEXTKEY,null);

  function makeAudio(i,t){
    const a=new Audio(FILES[TRACKS[i][0]]); a.preload=isMuted()?'metadata':'auto'; a.volume=0;
    const seed=()=>{ try{ a.currentTime=t; }catch(e){} };
    a.addEventListener('loadedmetadata',seed,{once:true}); seed();
    a.addEventListener('error',()=>onAudioError(a));
    return a;
  }
  /* a file that fails to load or decode (a dropped connection, a CDN hiccup) would otherwise leave a dead element
     that every later play() refuses: replace it with a fresh one at the same spot, a few times with a growing
     wait, and ask to play again when sound is on. discard() clearing an old element's src also fires 'error';
     that element is no longer the live one, so it's ignored. */
  let loadFails=0;
  function onAudioError(a){
    if(a!==audio||!a.error) return;
    playing=false; attempting=false;
    if(loadFails>=3){ loadError=true; paintMusicBtns(); return; } const wait=1500*Math.pow(2,loadFails++), tok=swapTok;
    setTimeout(()=>{ if(a!==audio||tok!==swapTok) return; const t=isFinite(a.currentTime)&&a.currentTime>0?a.currentTime:startLocal;
      audio=makeAudio(idx,t); rFrom=rTo=0; try{ a.removeAttribute('src'); }catch(e){} if(!isMuted()) tryStart(); },wait);
  }
  /* an element that's being replaced stops fetching too, not just playing */
  function discard(a){ if(!a) return; try{ a.pause(); a.removeAttribute('src'); a.load(); }catch(e){} }
  let audio=makeAudio(idx,startLocal);

  /* a single volume ramp at a time -- fade-out-then-seek-then-fade-in never overlaps two copies of the file */
  let rFrom=0,rTo=0,rStart=0,rDur=1;
  function rampTo(target,ms){ rFrom=audio.volume; rTo=target; rStart=performance.now(); rDur=Math.max(1,ms); }
  function tickVolume(){ const f=Math.min(1,(performance.now()-rStart)/rDur), e=f*f*(3-2*f); audio.volume=rFrom+(rTo-rFrom)*e; }
  function targetVolume(){ return held||duckedUntil>performance.now()?contextVol()*DUCK_TO:contextVol(); }
  let duckedUntil=0, held=false;
  function duck(){ if(!playing||transitioning) return; duckedUntil=performance.now()+DUCK_MS+DUCK_HOLD; rampTo(contextVol()*DUCK_TO,DUCK_MS);
    setTimeout(()=>{ if(playing&&!transitioning) rampTo(targetVolume(),RESTORE_MS); },DUCK_MS+DUCK_HOLD); }
  /* hold(true) keeps the music lowered for as long as something spoken is playing (the /about Voxa call); hold(false) restores it */
  function hold(on){ held=!!on; if(playing&&!transitioning) rampTo(targetVolume(),on?400:RESTORE_MS); }

  // Mobile browsers can silently reject audio.play() even after it looked like music was already running (the tab
  // was backgrounded and the OS revoked the audio session, autoplay policy re-evaluated after a source change,
  // etc). Every direct play() call routes through here so a rejection always corrects `playing` back to false --
  // otherwise the next real tap's tryStart() would see playing===true and skip retrying, leaving music silent
  // with no way to recover short of muting and unmuting. A settle that arrives after the element was swapped out
  // (see swapTo/bookmark) is about an element nobody hears any more, so it's ignored.
  function tryPlayRaw(){ const el=audio, p=el.play(); if(p&&p.then){ p.then(()=>{ if(el!==audio) return; playing=true; everPlayed=true; }).catch(()=>{ if(el===audio) playing=false; }); } }
  /* the single place that actually calls audio.play() from a cold stop (as opposed to tryPlayRaw's "already
     playing, resuming after a src change" case): used by tryStart() (any tap/key/touch anywhere) and by
     enterGame() (entering a game is itself "an appropriate tap" -- see below), so both share one attempting/
     playing state machine and one rejection handler instead of two copies that could disagree. */
  /* A play() promise can also stay pending indefinitely (a stalled fetch, a browser that neither starts nor refuses);
     after ATTEMPT_WAIT the attempt stops blocking, so the next interaction asks again instead of being ignored. */
  /* force: a real user gesture is happening right now, so ask again even if an earlier ask (the one made on page load)
     is still waiting for an answer; browsers only honour play() inside the gesture itself. A refusal is told apart
     from a load failure: NotAllowedError means the browser wants a tap first (blocked), anything else is the file. */
  function attemptPlay(onOk,force){
    if(attempting&&!force) return; attempting=true;
    const el=audio, tok=++attemptTok; let p;
    try{ p=el.play(); }catch(e){ attempting=false; playing=false; return; }
    setTimeout(()=>{ if(tok===attemptTok&&attempting&&el===audio&&el.paused){ attempting=false; paintMusicBtns(); } },ATTEMPT_WAIT);
    paintMusicBtns();
    (p&&p.then?p:Promise.resolve()).then(()=>{ if(el!==audio) return; if(tok===attemptTok) attempting=false; playing=true; everPlayed=true; blocked=false; loadError=false; loadFails=0; if(onOk) onOk(); paintMusicBtns(); }).catch(err=>{ if(el!==audio||tok!==attemptTok) return; attempting=false; playing=false;
      if(err&&err.name==='NotAllowedError') blocked=true; paintMusicBtns(); });
  }
  /* move to the next track, crossing into the next split file when the piece lives there; the fade-in (if any)
     starts only once the new file can actually make sound, never while it's still loading -- otherwise the
     volume ramp would finish silently during the fetch and the piece would start too loud. */
  function advance(fadeIn){
    const pin=curDest.file, cf=TRACKS[idx][0];
    if(pin!==null&&cf===pin){ const ps=passagesOf(pin); idx=ps[(ps.indexOf(idx)+1)%ps.length]; }    // a pinned file loops its own passages
    else idx=(idx+1)%TRACKS.length;
    const [f,s]=TRACKS[idx], file=FILES[f];
    if(!audio.src.endsWith(file)){
      const onReady=()=>{ try{ audio.currentTime=s; }catch(e){} if(fadeIn) rampTo(targetVolume(),FADE*1000); };
      audio.addEventListener('loadedmetadata',onReady,{once:true});
      audio.src=file; if(playing) tryPlayRaw();
    } else { try{ audio.currentTime=s; }catch(e){} if(fadeIn) rampTo(targetVolume(),FADE*1000); }
  }

  /* ---- entering a game. Every switch (and every natural-boundary fade) carries a token; a newer switch bumps it,
     so a stale timer from an older one can never swap in, seek, or restart anything. */
  let swapTok=0, prepared=null, pendingPos=null;
  /* not audible (muted, or a browser that hasn't allowed playback yet): just move the bookmark to the new file and
     boundary so it's what plays the moment sound is allowed -- never unmuting to do it. */
  function bookmark(newIdx,t){
    savePos(); swapTok++; discard(prepared); prepared=null; pendingPos=null; transitioning=false;
    discard(audio); attempting=false; playing=false;
    idx=newIdx; audio=makeAudio(idx,isFinite(t)?t:TRACKS[idx][1]); rTo=rFrom=0; savePos();
    // Sound is on but nothing was audible yet -- most likely a mobile browser blocked the page's silent autoplay
    // before any interaction. Entering a game is itself "an appropriate tap" to unlock playback from (MDN:
    // https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), so ask right away on the new file.
    if(!isMuted()) tryStart();
  }
  /* audible: load the destination into a second, silent element and wait until it's actually seeked to its
     boundary and able to play *before* fading the current piece away, so the fetch happens under the old music
     rather than as a silent gap after it. Only then: fade out, swap elements, fade in -- still never two
     audible at once. A slow network gets PREP_WAIT before it goes ahead anyway, and then the fade-in waits for
     the new element to actually start playing, the same rule advance() follows. */
  function swapTo(newIdx,t){
    savePos(); const tok=++swapTok, s=isFinite(t)?t:TRACKS[newIdx][1];
    discard(prepared); const next=prepared=makeAudio(newIdx,s); next.preload='auto';
    pendingPos={idx:newIdx,t:s}; savePos(); transitioning=true;
    let begun=false;
    const begin=()=>{ if(begun||tok!==swapTok) return; begun=true; rampTo(0,FADE*1000);
      setTimeout(()=>{ if(tok!==swapTok) return;
        const live=playing&&!isMuted(); discard(audio); audio=next; prepared=null; idx=newIdx; pendingPos=null;
        audio.volume=0; rFrom=rTo=0; transitioning=false; if(next.error){ onAudioError(next); savePos(); return; }   // it failed while it was being prepared
        if(live){ tryPlayRaw(); const fadeIn=()=>{ if(audio===next) rampTo(targetVolume(),FADE*1000); };
          if(next.readyState>=3) fadeIn(); else next.addEventListener('playing',fadeIn,{once:true}); }
        else { playing=false; attempting=false; }
        savePos(); },FADE*1000); };
    const ready=()=>{ if(next.readyState>=3&&!next.seeking) begin(); };
    next.addEventListener('canplay',ready); next.addEventListener('seeked',ready);
    setTimeout(begin,PREP_WAIT);
  }
  /* once per *different* game: the key is compared with the persisted one, so arcade-wire.js's route(), the
     address watcher below, a reload and a duplicate call all agree and only the first arrival switches. */
  function enterDest(path){
    const d=destOf(path||location.pathname); seenKey=destOf(location.pathname).key; curDest=d;
    if(d.key===lsGet(GAMEKEY)){ if(!isMuted()) tryStart(); return; }
    lsSet(GAMEKEY,d.key);
    const pick=pickFor(d,TRACKS[pendingPos?pendingPos.idx:idx][0]);
    if(!pick){ if(pendingPos&&prepared){ /* already fading toward this file: let it land */ } if(!isMuted()) tryStart(); return; }
    if(isMuted()||!playing) bookmark(pick.idx,pick.t); else swapTo(pick.idx,pick.t);
  }
  /* arcade-wire.js calls this when a game opens in-page; its path decides the destination */
  function enterGame(){ enterDest(location.pathname); }
  let transitioning=false;
  function maybeTransition(){
    if(transitioning) return; const tr=TRACKS[idx], ct=audio.currentTime;
    if(ct>=tr[2]){ advance(false); return; }
    if(ct>=tr[2]-FADE){ const tok=swapTok; transitioning=true; rampTo(0,FADE*1000);
      setTimeout(()=>{ if(tok!==swapTok) return; advance(true); transitioning=false; savePos(); },FADE*1000); } }

  let lastSave=0;
  function savePos(){ lsSet(POSKEY,pendingPos||{idx,t:audio.currentTime});
    if(!pendingPos&&audio&&audio.currentTime>0){ const f=TRACKS[idx][0]; if(Object.values(PINNED).includes(f)){ const m=lsGet(FILEPOSKEY)||{}; m[f]={idx,t:audio.currentTime}; lsSet(FILEPOSKEY,m); } } }
  function maybeSave(){ const now=Date.now(); if(now-lastSave>3000){ lastSave=now; savePos(); } }

  let playing=false, attempting=false, everPlayed=false, attemptTok=0, blocked=false, loadError=false;
  /* an element the browser or the phone paused behind our back (a call, a backgrounded tab) is not playing, whatever
     `playing` last said, so the next tap or return to the tab starts it again */
  function tryStart(gesture){
    if(isMuted()||yielded) return;
    if(playing&&!audio.paused) return; if(audio.paused&&!attempting) playing=false;
    if(attempting&&!gesture) return;
    attemptPlay(()=>rampTo(targetVolume(),RESUME_FADE*1000),!!gesture);
  }
  /* Browsers only count some events as the user gesture that may start audible playback: a mouse pointerdown, a
     keydown, and on touch screens only the *end* of a tap (pointerup/touchend/click). A play() made from touchstart
     or a touch pointerdown is refused, so listening only to those left phones silent on every tap until the music
     button's own click happened to succeed (the "mute, then unmute" workaround). Listening to all of them means the
     first ordinary tap, click or key starts the music; every listener is passive and on capture, so the tap still
     does whatever it was for. Once music is playing (or muted) each call returns immediately. */
  /* Only the events a browser treats as activation are used to ask with force: a touch's pointerdown/touchstart is
     refused by every phone browser, so on touch screens the ask comes from the end of the tap. A touch that scrolls
     the page is not activation in any browser, so a scroll alone cannot start music. */
  const onGesture=e=>{ if(e.type==='pointerdown'&&e.pointerType!=='mouse') return; if(e.type==='keydown'&&e.key==='Escape') return; tryStart(true); };
  ['pointerdown','pointerup','touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,onGesture,{capture:true,passive:true}));
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) savePos(); else tryStart(); });
  addEventListener('pagehide',savePos); addEventListener('beforeunload',savePos);

  /* ---- leaving this page for another game's page (a homepage card or its Play, a link to another game): pages
     are separate loads, so the switch itself happens on arrival (see pageKey above). While music is actually
     audible, the click is held for a short fade-out instead of a hard cut, the destination's file is picked now
     (and handed over via NEXTKEY) and starts fetching during that fade. Muted, silent, modified clicks, new-tab
     links and anything the page already handled (the arcade's own cards route in-page and preventDefault) pass
     straight through untouched. Once a fade has started, further game-link clicks are swallowed, so a double click
     can't start a second transition or a second navigation. */
  let navigating=false, warm=null;
  const isGameKey=k=>!!(k&&window.ZF&&Array.isArray(ZF.GAMES)&&ZF.GAMES.some(g=>g.slug===k));
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    const a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
    if(!a||(a.target&&a.target!=='_self')||a.hasAttribute('download')) return;
    let u; try{ u=new URL(a.href,location.href); }catch(err){ return; }
    if(u.origin!==location.origin) return;
    const key=keyOf(u.pathname), d=destOf(u.pathname);
    if(key!==null&&!isGameKey(key)) return;                                  // home, the catalogue, or a game page
    const np=x=>x.replace(/\/+$/,'').replace(/\/index\.html$/,'').replace(/\.html$/,'');
    if(np(u.pathname)===np(location.pathname)) return;                       // same page (#games, #about ...): the music just carries on
    if(navigating){ e.preventDefault(); return; }
    if(d.key===lsGet(GAMEKEY)||!playing||audio.paused||isMuted()) return;
    e.preventDefault(); navigating=true;
    const pick=pickFor(d,TRACKS[idx][0]); savePos();
    lsSet(NEXTKEY,pick?{key:d.key,idx:pick.idx,t:pick.t,at:Date.now()}:{key:d.key,keep:true,at:Date.now()});
    if(pick) try{ warm=new Audio(FILES[TRACKS[pick.idx][0]]); warm.preload='auto'; warm.volume=0; }catch(err){}
    rampTo(0,NAV_FADE); setTimeout(()=>{ location.href=u.href; },NAV_FADE);
  });

  // Browser Back/Forward often restores a page from the bfcache instead of reloading it: the whole page (this
  // script included) is frozen exactly as it was and handed back, audio element included -- and browsers pause
  // that audio element on the way into the freeze. Nothing else here ever re-checks that, so a bfcache restore
  // left the track paused with the mute control still showing "on" over real silence until some unrelated later
  // tap happened to call tryStart(). event.persisted is the standard signal that this show is a bfcache restore
  // (a plain reload never sets it), so this is the one place that resumes playback right on the restore itself.
  // The restored page's own file is the one playing again, so it (and this page's game) become the bookmark, and
  // a page frozen mid nav-fade gets its volume back instead of resuming at zero.
  addEventListener('pageshow',e=>{ if(!e.persisted) return;
    navigating=false; discard(warm); warm=null; if(lsGet(NEXTKEY)!==null) lsSet(NEXTKEY,null);
    /* the restored page's own element is playing the right file for this page only if nothing moved on meanwhile:
       re-decide against this page's destination (a pinned page that was frozen mid-switch gets its own file back) */
    curDest=destOf(location.pathname); seenKey=curDest.key;
    if(curDest.file!==null&&TRACKS[idx][0]!==curDest.file){ lsSet(GAMEKEY,curDest.key); const r=resumeIn(curDest.file); bookmark(r.idx,r.t); return; }
    lsSet(GAMEKEY,curDest.key); savePos();
    playing=audio.paused?false:playing; if(playing&&!isMuted()) rampTo(targetVolume(),RESUME_FADE*1000); tryStart(); });

  /* the address can change without a page load in ways arcade-wire.js never sees (a party room's host switching
     the room to another game rewrites /wrong-pond?room=.. to /duck-court?room=..); watching the path's game key
     catches those too, and for routes arcade-wire.js did announce it's a no-op (same key as already entered). */
  function watchAddress(){ const k=destOf(location.pathname).key; if(k===seenKey) return; seenKey=k; enterDest(location.pathname); }

  /* another player on the page (the Music app on /about) has the floor: the soundtrack pauses without touching the visitor's
     music preference, and picks up again when that player stops */
  function yieldTo(on){ on=!!on; if(on===yielded) return; yielded=on; if(on){ if(playing||attempting||!audio.paused) stopMusic(); } else if(!isMuted()) tryStart(true); paintMusicBtns(); }
  function stopMusic(){ playing=false; attempting=false; rampTo(0,MUTE_FADE*1000); setTimeout(()=>{ try{ audio.pause(); }catch(err){} },MUTE_FADE*1000+20); }
  function setMusicOn(v,quiet){ v=!!v; try{ localStorage.setItem(MUSICKEY,v?'on':'off'); }catch(e){} if(v) tryStart(true); else stopMusic(); paintMusicBtns(); if(!quiet) document.dispatchEvent(new CustomEvent('zf-music',{detail:{on:v}})); }

  /* ---- the music button: same shape/behavior as sound.js's own soundsw, built here so this file owns its
     entire on/off story instead of splitting it across two files that would need to agree on markup. Inserted
     immediately before each soundsw so the header reads, left to right, music then effects then theme -- and it
     reuses the soundsw class wholesale for sizing/shape/tooltip so no new CSS has to be kept in sync with it. */
  /* a single simple note (one head, one stem, one short flag), centred in the button. Muted, it is dimmed and
     crossed by the same diagonal slash as the effects speaker (sound.js's MUTE_SLASH, copied here so this file
     still works on its own). */
  const NOTE='<circle cx="9" cy="17.5" r="3" fill="currentColor"/><path d="M12 17.5V5l6 1.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
  const SLASH='<path class="mute-gap" d="M4 4l16 16" fill="none" stroke-width="5" stroke-linecap="round"/><path d="M4 4l16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  const MICON_ON='<svg viewBox="0 0 24 24" aria-hidden="true">'+NOTE+'</svg>';
  const MICON_OFF='<svg viewBox="0 0 24 24" aria-hidden="true"><g opacity=".55">'+NOTE+'</g>'+SLASH+'</svg>';
  /* on but not sounding yet: the same note, dimmed and without the slash, so it never claims music is playing */
  const MICON_WAIT='<svg viewBox="0 0 24 24" aria-hidden="true"><g opacity=".45">'+NOTE+'</g></svg>';
  const musicBtns=[];
  /* off: the person muted it. on: actually audible. waiting: the browser wants a tap first. loading: asked, the file is
     still coming. error: the file would not load. */
  function musicState(){ if(isMuted()) return 'off'; if(playing&&!audio.paused) return 'on'; if(loadError) return 'error'; if(blocked) return 'waiting'; return 'loading'; }
  const TIPS={on:'Music on',off:'Music muted',waiting:'Music starts when you tap',loading:'Music loading',error:'Music could not load'};
  let painted='';
  function paintMusicBtns(){ const st=musicState(); if(st===painted&&musicBtns.every(b=>b.innerHTML)) return; painted=st;
    musicBtns.forEach(b=>{ b.innerHTML=st==='on'?MICON_ON:st==='off'?MICON_OFF:MICON_WAIT; b.setAttribute('aria-label','Music'); b.setAttribute('data-tip',TIPS[st]); b.setAttribute('aria-pressed',st==='off'?'false':'true'); b.dataset.state=st; }); }
  /* while music is on but not sounding, the button starts it (its own tap is the gesture the browser wants) instead of
     muting it, so nobody has to mute and unmute to hear music */
  /* the state is read when the press begins: the page-wide gesture listeners may already have started the music by the time
     the click lands, and that click must not then mute it */
  function musicClick(e){ const b=e.currentTarget, was=b._was||musicState(); b._was=null;
    if(was!=='on'&&was!=='off'){ loadError=false; loadFails=0; tryStart(true); paintMusicBtns(); return; } setMusicOn(was==='off'); }
  const notePress=e=>{ e.currentTarget._was=musicState(); };
  function buildMusicBtns(){ document.querySelectorAll('.soundsw:not(.musicsw)').forEach(sw=>{ if(sw.previousElementSibling&&sw.previousElementSibling.classList.contains('musicsw')) return; const b=document.createElement('button'); b.type='button'; b.className='soundsw musicsw'; b.addEventListener('click',musicClick); b.addEventListener('pointerdown',notePress); b.addEventListener('keydown',notePress); sw.parentNode.insertBefore(b,sw); musicBtns.push(b); }); painted=''; paintMusicBtns(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',buildMusicBtns); else buildMusicBtns();

  /* ask on load, as early as the script runs: Chrome, Edge and Android browsers allow it once this site has had a tap
     (in this visit, or often from earlier visits); Safari and Firefox usually refuse until the first tap on each page,
     and then the gesture listeners take over */
  tryStart();
  setInterval(()=>{ watchAddress(); paintMusicBtns(); if(audio.paused) return; tickVolume(); maybeTransition(); maybeSave(); },100);

  window.ZMusic={ duck, hold, enterGame, yieldTo, yielded:()=>yielded, state:musicState, isPlaying:()=>playing&&!audio.paused, isOn:()=>!isMuted(), setOn:setMusicOn, toggle:()=>setMusicOn(isMuted()), _debug:()=>({dest:curDest.key,pinned:curDest.file,currentTime:audio.currentTime,volume:audio.volume,paused:audio.paused,idx,fileIdx:TRACKS[idx][0],file:audio.src,game:lsGet(GAMEKEY),rotation:lsGet(ROTKEY),switching:!!pendingPos,muted:isMuted(),inGame:inGame()}) };
})();
