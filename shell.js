/* shell.js: one shell for every playable game in the arcade.
   Each game keeps its own board and engine. This file gives them the same header, status place, icon toolbar beside the board,
   a rules drawer that never leaves the board, a compact Settings dialog, a separate "Customize board" entry point, and one result.
   Settings and board setup are two different tasks and stay in two different places: Settings never scrolls to, opens, or
   redirects into board building, and it never touches the board underneath. */
(function(){
const $=id=>document.getElementById(id);
const I=(d)=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS={
  settings:I('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>'),
  undo:I('<path d="M9 6 4.5 10.5 9 15"/><path d="M4.5 10.5H14a5.5 5.5 0 0 1 0 11h-2"/>'),
  restart:I('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>'),
  plus:I('<path d="M12 5v14M5 12h14"/>'),
  hint:I('<path d="M9.5 17.5h5M10 20.5h4"/><path d="M12 3.5a5.5 5.5 0 0 0-3.4 9.8c.6.5.9 1.2.9 2v.2h5v-.2c0-.8.3-1.5.9-2A5.5 5.5 0 0 0 12 3.5Z"/>'),
  rules:I('<path d="M12 6.5C10.3 5.2 7.8 4.7 4.5 5v12.5c3.3-.3 5.8.2 7.5 1.5 1.7-1.3 4.2-1.8 7.5-1.5V5c-3.3-.3-5.8.2-7.5 1.5Z"/><path d="M12 6.5V19"/>'),
  close:I('<path d="M6 6l12 12M18 6 6 18"/>'),
  next:I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  trophy:I('<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4l.5 3h-5Z"/>'),
  pencil:I('<path d="M4 20l1-4.2L15.6 5.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19 4 20Z"/><path d="M14 7l3 3"/>')
};
/* the guide duck in a lesson or a trainer: the shared vector with its eyes (party-duck.js ZPDuck.guide) */
const guideHTML=()=>`<span class="ls-gd" aria-hidden="true">${window.ZPDuck&&ZPDuck.guide?ZPDuck.guide({label:'',moods:true}).replace(/ role="img" aria-label="[^"]*"/,''):'<img src="/author-duck.png" alt="" width="346" height="330" draggable="false">'}</span>`;
window.ZFGuideHTML=guideHTML;
const DEFS=[
  {root:'game',undo:'undoBtn',restart:'restartBtn',more:'rematchBtn',hint:'hintBtn',settings:'settingsBtn',rules:'rules',hist:'hist',status:'status',result:'result',back:'backBtn',setup:'setup',board:null,start:null,ai:()=>window.maybeAI&&window.match&&maybeAI()},
  {root:'nimGame',undo:'nUndo',restart:'nRestart',more:'nRematch',hint:'nHint',settings:'nSettings',rules:'nRules',hist:'nHist',status:'nStatus',result:'nResult',back:'nBack',setup:'nimSetup',board:'nBoard',start:'nStart',ai:()=>ZFA.nimAI&&ZFA.nimAI(),key:'nim'},
  {root:'chGame',undo:'cUndo',restart:'cRestart',more:'cRematch',hint:'cHint',settings:'cSettings',rules:'cRules',hist:'cHist',status:'cStatus',result:'cResult',back:'cBack',setup:'chSetup',board:'cBoard',start:'cStart',ai:()=>ZFA.chAI&&ZFA.chAI(),key:'chomp'},
  {root:'gxGame',undo:'gxUndo',restart:'gxRestart',more:null,hint:'gxHint',settings:'gxSettings',rules:'gxRulesBody',hist:null,status:'gxStatus',result:'gxResult',back:'gxBack',setup:'gxSetup',board:'gxBoard',start:'gxStart',ai:()=>ZFX.resume&&ZFX.resume(),extra:['gxRetry','gxNext']}
];
const CSS=`
/* the end-of-match result dialog */
.zr-dlg .gdialog-card{max-width:400px}
.zr-dlg .gdialog-head h3{font:600 13px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5)}
.zr-dlg .gdialog-body{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding-top:6px}
.zr-sym{position:relative;width:76px;height:76px;color:var(--fg)}.zr-sym svg{width:100%;height:100%}
.zr-sym.duck{width:84px;height:96px;display:flex;align-items:flex-end;justify-content:center}.zr-sym.duck .pd{width:84px;height:96px}.zr-sym.duck .pd{animation:zrPop .55s cubic-bezier(.3,1.6,.5,1) both}
.zr-sym.win svg{animation:zrPop .55s cubic-bezier(.3,1.6,.5,1) both}
.zr-sym i{position:absolute;left:50%;top:44%;width:7px;height:7px;border-radius:2px;background:var(--fg);opacity:0;animation:zrBit 1.1s ease-out .15s both}
.zr-sym i:nth-of-type(odd){background:#c9a63f}
.zr-sym i:nth-of-type(1){--x:-48px;--y:-34px}.zr-sym i:nth-of-type(2){--x:46px;--y:-38px}.zr-sym i:nth-of-type(3){--x:-56px;--y:8px}.zr-sym i:nth-of-type(4){--x:56px;--y:4px}.zr-sym i:nth-of-type(5){--x:-26px;--y:-52px}.zr-sym i:nth-of-type(6){--x:28px;--y:-54px}
@keyframes zrPop{from{transform:scale(.4) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}
@keyframes zrBit{0%{opacity:0;transform:translate(-50%,-50%)}25%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(160deg)}}
.zr-t{margin:2px 0 0;font:800 clamp(28px,7vw,34px)/1.1 var(--font-sans);letter-spacing:-.02em;color:var(--fg);overflow-wrap:anywhere}
.zr-score:empty{display:none}.zr-score .zm-score{font-size:14px;gap:6px}.zr-score .zm-score b{font-size:18px}
.zr-d{margin:0;max-width:34ch;font:400 15px/1.45 var(--font-sans);color:var(--g6)}.zr-d:empty{display:none}
.zr-acts{display:flex;flex-direction:column;gap:8px;width:100%;margin-top:8px}
.zr-acts button{min-height:50px;border-radius:14px;font:600 16px var(--font-sans);cursor:pointer}
.zr-main{border:none;background:var(--fg);color:var(--bg)}
.zr-second{border:1.5px solid var(--g4);background:transparent;color:var(--fg)}
.zr-pend{display:flex;flex-direction:column;gap:6px;width:100%;margin-top:6px;padding-top:12px;border-top:1px solid var(--g3)}.zr-pend[hidden],.zr-acts[hidden]{display:none}.zr-pend .zr-d{color:var(--fg);font-weight:600;align-self:center}
.zr-look{margin-top:2px;border:none;background:none;color:var(--g6);font:600 14px var(--font-sans);text-decoration:underline;text-underline-offset:3px;cursor:pointer;min-height:40px}
.zr-acts button:focus-visible,.zr-look:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.gt.zr-again{width:auto;padding:0 14px;gap:6px;font:600 14px var(--font-sans)}.gt.zr-again[hidden]{display:none}
@media (prefers-reduced-motion:reduce){.zr-sym.win svg,.zr-sym.duck .pd{animation:none}}
/* shell: header, stage, toolbar */
.wrap{padding-top:22px}
.game{margin-top:8px}
.topbar{border-bottom:none;padding:2px 0 6px;margin-bottom:2px;gap:12px}
.topbar>button{display:none}
.topbar h2{font:800 clamp(36px,3.6vw,44px)/1.08 var(--font-sans);letter-spacing:-.025em;margin:0}
.topbar .back,.topbar>a,.topbar .backlink{opacity:.7}
@media (max-width:600px){.topbar h2{font-size:clamp(26px,7.4vw,32px)}}
.stage>.zf-credit{order:9;margin:18px auto 4px;max-width:60ch;text-align:center;font:400 14px/1.6 var(--font-sans);color:var(--g6);padding:12px 18px;border-radius:14px;background:var(--surf2)}
.zf-credit a{color:var(--fg);border-bottom:1px solid var(--g4);text-decoration:none}.zf-credit a:hover,.zf-credit a:focus-visible{border-bottom-color:var(--fg);outline:none}
.zf-credit .cr-l{display:block;font:700 11.5px var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--g5);margin-bottom:4px}.zf-credit .cr-go{font-weight:600;white-space:nowrap}
.zf-credit[hidden]{display:none}
#gdBody .cr-by{font-size:13.5px;color:var(--g5)}#gdBody a{color:var(--fg)}
.topbar .modetag{border:none;background:var(--surf2);border-radius:999px;padding:5px 11px;color:var(--g6)}
.stage{min-height:0;gap:10px;justify-content:flex-start}
.stage>*{order:3}
.stage>.status{order:0;margin:0;min-height:30px}
.stage>.result{order:0}
.stage>.gtools{order:1}
.stage.over>.status{display:none}
.game .toolbar,.game .panels{display:none!important}
.status .who{font-size:19px}
.status .cond{border:none;background:var(--surf3);border-radius:999px;padding:4px 11px;color:var(--fg)}
.result{border:none;background:var(--surf2);border-radius:16px;padding:14px 22px;margin:0 auto;max-width:560px;font-size:14.5px;line-height:1.45;color:var(--g6)}
.result b{font-size:22px;margin:0 0 3px;color:var(--fg)}
.result .record{display:none}
.stage .kbd{display:none;font:500 12.5px var(--font-sans);color:var(--g5);max-width:46ch;text-align:center}
.stage.firstvisit .kbd{display:block}
.gtools{display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap;position:sticky;top:calc(var(--hh,79px) + 8px);z-index:6;padding:5px;border-radius:18px;background:color-mix(in srgb,var(--bg) 80%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.gt{position:relative;width:46px;height:46px;padding:0;border:none;border-radius:13px;background:var(--surf2);color:var(--fg);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,transform .15s}
.gt:hover:not(:disabled){background:var(--surf3)}
.gt:active:not(:disabled){transform:scale(.94)}
.gt:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.gt:disabled{opacity:.3;cursor:not-allowed}
.gt[hidden]{display:none}
.gt::after{content:attr(data-label);position:absolute;bottom:calc(100% + 9px);left:50%;transform:translateX(-50%) translateY(3px);background:var(--fg);color:var(--bg);padding:5px 10px;border-radius:9px;font:600 12.5px var(--font-sans);letter-spacing:0;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .12s,transform .12s;z-index:9}
.gt:hover::after,.gt:focus-visible::after,.gt.hold::after{opacity:1;transform:translateX(-50%)}
.gt.txt{width:auto;padding:0 16px;font:600 14px var(--font-sans)}
.gt.txt::after{display:none}
.gt.sep{margin-left:8px}
/* ---- the tutorial: one shared "how to play" for the entry page's Learn how to play and the in-game Rules button ----
   Laptop: a spacious centred modal. Phone: the whole screen, with Back on top and Previous / progress / Next at the bottom. */
#gdrawer{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:24px;visibility:hidden;opacity:0;transition:opacity .18s,visibility 0s .18s}
#gdrawer.open{visibility:visible;opacity:1;transition:opacity .18s}
#gscrim{position:absolute;inset:0;background:rgba(0,0,0,.5)}
#gdrawer .gt-card{position:relative;display:flex;flex-direction:column;width:min(1000px,100%);height:min(880px,100%);background:var(--bg);color:var(--fg);border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.4);overflow:hidden;transform:translateY(8px) scale(.99);transition:transform .2s}
#gdrawer.open .gt-card{transform:none}
#gdrawer .gt-head{position:static;display:flex;align-items:center;gap:12px;padding:14px 18px 14px 22px;border-bottom:1px solid var(--g2);flex:none;background:var(--bg)}
#gdrawer .gt-head h3{flex:1;min-width:0;margin:0;font:700 20px/1.25 var(--font-sans);letter-spacing:-.01em}
#gdrawer .gt-head h3 small{display:block;font:600 11.5px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--g5);margin-bottom:2px}
#gdrawer .gt-backbtn{display:none;align-items:center;gap:6px;min-height:44px;padding:0 14px 0 10px;border:none;border-radius:12px;background:var(--surf2);color:var(--fg);font:600 15px var(--font-sans);cursor:pointer;flex:none}
#gdrawer .gt-backbtn svg{width:20px;height:20px}
#gdrawer .gt-backbtn:hover{background:var(--surf3)}
#gdrawer .gd-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:22px clamp(18px,4vw,48px) 28px;font:400 16px/1.6 var(--font-sans);color:var(--g6)}
#gdrawer .gd-body b{color:var(--fg)}
#gdrawer .gd-body p{margin:0 0 13px}
#gdrawer .gd-body h4{font:700 12px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5);margin:22px 0 8px}
#gdrawer .gd-hist{font:500 13px/1.9 var(--font-mono);color:var(--g6)}
#gdrawer .gt-step{max-width:820px;margin:0 auto}
#gdrawer .gt-kick{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px}
#gdrawer .gt-kind{display:inline-flex;align-items:center;gap:8px;font:700 12px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--g6);background:var(--surf2);border-radius:999px;padding:7px 12px}
#gdrawer .gt-kind::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--fg)}
#gdrawer .gt-kind.practice::before{border-radius:2px}
#gdrawer .gt-skip{border:none;background:transparent;color:var(--g6);font:600 14px var(--font-sans);padding:8px 4px;min-height:40px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--g4)}
#gdrawer .gt-skip:hover,#gdrawer .gt-skip:focus-visible{color:var(--fg);text-decoration-color:var(--fg)}
#gdrawer .gd-body .ls-title{margin:4px 0 6px;font:800 clamp(24px,2.6vw,30px)/1.15 var(--font-sans);color:var(--fg);letter-spacing:-.015em;text-transform:none}
#gdrawer .ls-text{margin:0 0 8px;font-size:17px;max-width:62ch}
#gdrawer .ls-stage{padding:clamp(18px,3vw,32px) 12px;margin:14px 0 10px;min-height:min(220px,28vh);--ls-w:calc(440px * var(--ls-k,1))}
#gdrawer .ls-note{max-width:56ch;margin:0 auto;font-size:16px}
#gdrawer .gt-acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0 0}
#gdrawer .gt-acts:empty{display:none}
#gdrawer .gt-written{margin:30px auto 0;max-width:820px;border-top:1px solid var(--g2);padding-top:6px}
#gdrawer .gt-written>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;min-height:44px;font:600 15px var(--font-sans);color:var(--fg)}
#gdrawer .gt-written>summary::-webkit-details-marker{display:none}
#gdrawer .gt-written>summary::before{content:"";width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg);transition:transform .15s;margin:0 4px}
#gdrawer .gt-written[open]>summary::before{transform:rotate(45deg)}
#gdrawer .gt-written .gt-wbody{padding:6px 0 4px}
#gdrawer .gt-foot{flex:none;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:14px 22px;border-top:1px solid var(--g2);background:var(--bg)}
#gdrawer .gt-foot .ls-btn{min-height:50px;padding:0 24px;font-size:16px;border-radius:13px}
#gdrawer .gt-foot #lsPrev{justify-self:start}
#gdrawer .gt-foot #lsNext{justify-self:end;min-width:120px}
#gdrawer .gt-foot .ls-btn:disabled{opacity:.35;cursor:default}
#gdrawer .gt-prog{display:flex;flex-direction:column;align-items:center;gap:7px;font:700 13px var(--font-mono);letter-spacing:.06em;color:var(--g6)}
#gdrawer .gt-dots{display:flex;gap:6px}
#gdrawer .gt-dots i{width:7px;height:7px;border-radius:50%;background:var(--g4);transition:background .15s,transform .15s}
#gdrawer .gt-dots i.on{background:var(--fg);transform:scale(1.25)}
#gdrawer .gt-dots i.done{background:var(--g6)}
#gdrawer.solo .gt-foot{display:none}
#gdrawer .gt-head .gt-hskip{flex:none;min-height:44px;padding:0 14px;border:none;border-radius:12px;background:transparent;color:var(--g6);font:600 15px var(--font-sans);cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--g4)}
#gdrawer .gt-head .gt-hskip:hover,#gdrawer .gt-head .gt-hskip:focus-visible{color:var(--fg);background:var(--surf2);text-decoration-color:var(--fg)}
#gdrawer .gt-head .gt-hskip:disabled{visibility:hidden}
#gdrawer.solo .gt-hskip{display:none}
#gdrawer .gt-foot #lsPlay{justify-self:end;min-width:132px}
/* two ways in (a game that registers ZFImprove[slug]): Learn the rules, or Improve your play */
#gdrawer.paths .gt-foot,#gdrawer.paths .gt-hskip,#gdrawer.improve .gt-foot,#gdrawer.improve .gt-hskip{display:none}
#gdrawer .gp-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;max-width:760px;margin:6px auto 0}
#gdrawer .gp-card{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;padding:20px 20px 18px;min-height:132px;border:1.5px solid var(--g3);border-radius:18px;background:var(--surf);color:var(--fg);font:inherit;cursor:pointer}
#gdrawer .gp-card:hover,#gdrawer .gp-card:focus-visible{border-color:var(--fg)}#gdrawer .gp-card:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
#gdrawer .gp-card b{font:800 21px/1.2 var(--font-sans);letter-spacing:-.01em}
#gdrawer .gp-card span{font:400 15.5px/1.45 var(--font-sans);color:var(--g6)}
#gdrawer .gp-card small{margin-top:auto;font:700 11.5px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5)}
#gdrawer .gp-back{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 12px 0 8px;margin:0 0 10px;border:none;border-radius:10px;background:var(--surf2);color:var(--fg);font:600 14px var(--font-sans);cursor:pointer}
#gdrawer .gp-back svg{width:18px;height:18px}
#gdrawer .gt-foot #lsPlay[hidden],#gdrawer .gt-foot #lsNext[hidden]{display:none}
/* the duck guide: Mansy's duck beside the one thing to notice on this step */
#gdrawer .ls-guide{display:flex;align-items:flex-start;justify-content:center;gap:10px;max-width:60ch;margin:0 auto}
#gdrawer .ls-guide .ls-gd,.ls-guide .ls-gd{flex:none;display:block;width:60px;aspect-ratio:346/330;margin-top:-6px;transform-origin:50% 90%;line-height:0}
.ls-guide .ls-gd>.pd,.ls-guide .ls-gd>img{display:block;width:100%;height:100%}
#gdrawer .ls-guide .ls-gd.nod{animation:lsNod .42s ease-in-out}
@keyframes lsNod{40%{transform:rotate(-7deg) translateY(-2px)}}
#gdrawer .ls-guide .ls-note{margin:0;text-align:left;position:relative;padding:9px 12px;border-radius:12px;background:var(--surf2);min-height:0}
#gdrawer .ls-guide .ls-note:empty{visibility:hidden}
@media (prefers-reduced-motion:reduce){#gdrawer .ls-guide .ls-gd.nod{animation:none}}
@media (max-width:700px){
  #gdrawer{padding:0;align-items:stretch}
  #gdrawer .gt-card{width:100%;height:100vh;height:100dvh;border-radius:0;box-shadow:none;transform:none}
  #gdrawer .gt-head{padding:calc(10px + env(safe-area-inset-top)) 12px 10px 10px;gap:10px}
  #gdrawer .gt-head h3{font-size:18px}
  #gdrawer .gd-body{padding:16px 18px 24px}
  #gdrawer .ls-stage{margin:12px -6px 8px;padding:16px 6px;--ls-w:calc(360px * var(--ls-k,1))}
  #gdrawer .ls-text{font-size:16.5px}
  #gdrawer .gt-foot{padding:10px 14px calc(10px + env(safe-area-inset-bottom));gap:8px}
  #gdrawer .gt-foot .ls-btn{padding:0 16px;min-height:52px}
  #gdrawer .gt-foot #lsNext{min-width:104px}
}
/* short windows (a 1080p screen at 125% or 150% display scaling, a laptop window with tabs and a dock): the chrome
   tightens, the text keeps its size, and fitStage() shrinks the illustration until the try controls are in view */
@media (min-width:701px) and (max-height:820px){
  #gdrawer{padding:12px}
  #gdrawer .gt-head{padding:9px 14px 9px 20px}
  #gdrawer .gd-body{padding:14px clamp(18px,3vw,40px) 18px}
  #gdrawer .gd-body .ls-title{font-size:clamp(21px,2.2vw,26px)}
  #gdrawer .ls-stage{padding:12px;margin:10px 0 8px}
  #gdrawer .gt-acts{margin-top:8px}
  #gdrawer .gt-written{margin-top:18px}
  #gdrawer .gt-foot{padding:9px 20px}
  #gdrawer .gt-foot .ls-btn{min-height:44px}
}
/* wide but short windows: the explanation sits beside the illustration instead of above it, so the board gets the
   window's height rather than what is left under the text */
@media (min-width:900px) and (max-height:740px) and (min-aspect-ratio:3/2){
  #gdrawer .gt-step{display:grid;grid-template-columns:minmax(250px,.8fr) minmax(0,1.2fr);grid-template-rows:auto auto auto auto 1fr;grid-template-areas:"kick stage" "title stage" "text stage" "note stage" "acts stage";column-gap:clamp(20px,3vw,36px);max-width:1040px}
  #gdrawer .gt-kick{grid-area:kick}
  #gdrawer .gd-body .ls-title{grid-area:title}
  #gdrawer .ls-text{grid-area:text}
  #gdrawer .ls-stage{grid-area:stage;align-self:start;margin:0}
  #gdrawer .ls-note{grid-area:note;margin:10px 0 0;text-align:left}
  #gdrawer .gt-acts{grid-area:acts;justify-content:flex-start;align-self:start}
}
@media (max-width:700px) and (max-height:640px){
  #gdrawer .gd-body{padding:12px 16px 16px}
  #gdrawer .gd-body .ls-title{font-size:21px}
  #gdrawer .ls-stage{padding:10px 6px;margin:8px -6px 6px}
  #gdrawer .gt-foot .ls-btn{min-height:46px}
}
html.gt-lock,html.gt-lock body{overflow:hidden}
/* the entry page's way in: a clear button under the short description */
.e-learn{display:inline-flex;align-items:center;gap:10px;margin-top:16px;min-height:48px;padding:0 20px 0 16px;border:1.5px solid var(--g4);border-radius:999px;background:var(--surf2);color:var(--fg);font:700 15.5px var(--font-sans);cursor:pointer;transition:background .15s,border-color .15s}
.e-learn:hover{background:var(--surf3);border-color:var(--g5)}
.e-learn:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
.e-learn svg{width:21px;height:21px;flex:none}
.e-rules[hidden]{display:none}
/* the in-game Rules control keeps its book icon and says Rules wherever there is room */
.gt.lbl{width:auto;padding:0 15px 0 12px;gap:7px;font:600 14.5px var(--font-sans)}
.gt.lbl::after{display:none}
@media (max-width:440px){.gt.lbl{width:44px;padding:0}.gt.lbl span{display:none}.gt.lbl::after{display:block}}
/* Customize board: the pencil entry sits below the board, above credits. It never opens as part of Settings. */
.gcustomize-entry{order:4;display:flex;justify-content:center;width:100%;margin:6px 0 0}
.gcustomize-entry[hidden]{display:none}
.gcustomize-entry button{display:inline-flex;align-items:center;gap:9px;min-height:46px;padding:0 20px;border:1.5px solid var(--g4);border-radius:999px;background:var(--surf2);color:var(--fg);font:700 14.5px var(--font-sans);cursor:pointer;transition:background .15s,border-color .15s}
.gcustomize-entry button:hover{background:var(--surf3);border-color:var(--g5)}
.gcustomize-entry button:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.gcustomize-entry svg{width:19px;height:19px;flex:none}
.themesw{border-color:var(--g5)}
.game.show,.entry.show{animation:gfade .28s ease-out}
@keyframes gfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (max-width:640px){.gt{width:44px;height:44px}.gtools{gap:4px}}

/* ---- dialogs shared by Settings and the generic Customize builder ---- */
.gdialog{position:fixed;inset:0;z-index:85;display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;pointer-events:none;transition:opacity .2s}
.gdialog.open{opacity:1;pointer-events:auto}
.gdialog-scrim{position:fixed;inset:0;background:rgba(0,0,0,.4)}
/* the inert "not started yet" preview: the real board, rendered and visible, but non-interactive until Start game */
/* This wraps the board for any game still on the old Start-overlay entry (Gold Coin, Crowded Room, Last Message —
   entryReady games never create it). As a flex child of .stage (a column flex container, so align-items:center
   sizes children to content instead of stretching them), it shrank to whatever width the board's own inline style
   happened to produce instead of filling the space .stage actually has — on Gold Coin that meant a coin track
   capped near its own min-width instead of using the room a wide viewport offers. */
.gx-preview-wrap{position:relative;width:100%;display:flex;flex-direction:column;align-items:center}
.gx-start-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);border-radius:16px;z-index:5}
.gx-start-overlay button{min-height:56px;padding:0 40px;border:none;border-radius:16px;background:var(--fg);color:var(--bg);font:700 17px var(--font-sans);cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.3)}
.gx-start-overlay button:hover{opacity:.92}
.gdialog-card{position:relative;background:var(--bg);color:var(--fg);border-radius:20px;box-shadow:0 30px 70px rgba(0,0,0,.35);width:100%;max-height:88vh;max-height:88dvh;display:flex;flex-direction:column;transform:translateY(10px) scale(.98);transition:transform .2s}
.gdialog.open .gdialog-card{transform:none}
.gsettings-card{max-width:420px}
.gcustom-card{max-width:760px}
.gdialog-head{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--g2)}
.gdialog-head h3{font:700 19px var(--font-sans);margin:0;flex:1}
.gdialog-body{padding:18px 20px calc(22px + env(safe-area-inset-bottom));overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.gs-row{margin-top:16px}
.gs-row:first-child{margin-top:0}
.gs-label{font:700 11.5px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5);margin-bottom:8px}
.gs-seg{display:flex;flex-wrap:wrap;gap:6px}
.gs-seg button{min-height:42px;padding:0 16px;border:none;border-radius:11px;background:var(--surf2);color:var(--fg);font:600 14px var(--font-sans);cursor:pointer}
.gs-seg button{transition:background-color .12s ease,color .12s ease}
.gs-seg button:active:not(:disabled){background:var(--g3)}
.gs-seg button.on,.gs-seg button.on:active{background:var(--fg);color:var(--bg)}
.gs-seg button:disabled{opacity:.4;cursor:not-allowed}
.gs-note{margin:8px 0 0;font:500 13px/1.5 var(--font-sans);color:var(--g5)}
.gs-row.gs-opt{display:flex;align-items:center;justify-content:space-between;gap:14px}
.gs-olabel{font:600 15px var(--font-sans);color:var(--fg)}
.gs-empty{font:500 14.5px/1.5 var(--font-sans);color:var(--g5);text-align:center;padding:8px 0}
.gs-restart{margin-top:16px;min-height:46px;width:100%;border:none;border-radius:12px;background:var(--surf3);color:var(--fg);font:700 14px var(--font-sans);cursor:pointer}
.gc-actions{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
.gc-actions .start{flex:1;min-width:180px;min-height:50px}
.gc-actions .cancel{min-height:50px;padding:0 22px;border:1.5px solid var(--g4);border-radius:12px;background:transparent;color:var(--fg);font:600 14.5px var(--font-sans);cursor:pointer}
.gc-actions .cancel:hover{background:var(--surf2)}
@media (max-width:600px){.gdialog{padding:0;align-items:flex-end}.gdialog-card{max-height:92vh;max-height:92dvh;border-radius:20px 20px 0 0}}
@media (max-width:600px) and (orientation:landscape){.gdialog-card{max-height:96vh;max-height:96dvh}.gdialog-head{padding:10px 16px}}

/* ---- editing a board in place: the board keeps its size and position, only its purpose changes ---- */
.editbar{order:2;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;width:100%;margin:2px 0 4px}
.edittag{display:inline-flex;align-items:center;gap:8px;font:700 12px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g6);background:var(--surf3);border-radius:999px;padding:7px 14px}
.edittag::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--fg)}
.editactions{display:flex;gap:8px}
.editactions .play{min-height:42px;padding:0 18px;border:none;border-radius:11px;background:var(--fg);color:var(--bg);font:700 14px var(--font-sans);cursor:pointer}
.editactions .play:disabled{opacity:.4;cursor:not-allowed}
.editwhy{font:500 14px/1.45 var(--font-sans);color:var(--g6);text-align:center;max-width:52ch;margin:10px auto 0;min-height:1.4em}
.editactions .cancel{min-height:42px;padding:0 16px;border:1.5px solid var(--g4);border-radius:11px;background:transparent;color:var(--fg);font:600 14px var(--font-sans);cursor:pointer}
`;
const st=document.createElement('style'); st.id='shell-css'; st.textContent=CSS; document.head.appendChild(st);
function setHeaderVar(){ const h=document.querySelector('header'); if(h) document.documentElement.style.setProperty('--hh',h.offsetHeight+'px'); }
setHeaderVar(); addEventListener('resize',setHeaderVar); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(setHeaderVar);

/* entering a game used to scrollIntoView({block:'start'}), which aligns the game's own top edge with the very top of the
   viewport — exactly where the sticky header also wants to sit, so the header ended up covering the game's title.
   This scrolls to the same place, minus the header's real height. */
window.gameScrollTo=function(el){ if(!el) return; const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches; const hh=(document.querySelector('header')||{offsetHeight:0}).offsetHeight;
  const y=Math.max(0,el.getBoundingClientRect().top+scrollY-hh-10); window.scrollTo({top:y,behavior:reduce?'auto':'smooth'}); };


/* ---- the tutorial ----
   One component for both ways in: Learn how to play on a game's entry page, and the Rules button during play. It reads
   the same ZLessons steps either way, so the two can never drift apart. Opening it never starts, changes or leaves a
   match: practice boards are their own little states, the live game is only paused (and resumed on close), and an
   online room keeps its connection. */
const BACK_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const drawer=document.createElement('div'); drawer.id='gdrawer'; drawer.setAttribute('role','dialog'); drawer.setAttribute('aria-modal','true'); drawer.setAttribute('aria-labelledby','gdTitle');
/* Back, Next, Skip and Close stay in the same places on every step: Skip and Close in the header, Back and Next in the
   footer. The last step's Next becomes Play now. */
drawer.innerHTML=`<div id="gscrim"></div><div class="gt-card"><header class="gt-head"><button type="button" class="gt-backbtn" id="gdBack">${BACK_ICON}<span>Back</span></button><h3 id="gdTitle" tabindex="-1"></h3><button type="button" class="gt-hskip" id="lsSkip">Skip</button><button type="button" class="gt gt-x" data-label="Close" aria-label="Close" id="gdClose">${ICONS.close}</button></header><div class="gd-body" id="gdBody"></div><footer class="gt-foot"><button type="button" class="ls-btn ghost" id="lsPrev">Back</button><div class="gt-prog"><span class="gt-dots" aria-hidden="true"></span><span class="ls-count" aria-live="polite"></span></div><button type="button" class="ls-btn" id="lsNext">Next</button><button type="button" class="ls-btn" id="lsPlay" hidden>Play now</button></footer></div>`;
document.body.appendChild(drawer); const scrim=drawer.querySelector('#gscrim');
let lastFocus=null, tutFrom=null;
const active=()=>DEFS.find(d=>$(d.root)&&$(d.root).classList.contains('show'));
const lessonAt={};
const slugNow=()=>location.pathname.replace(/^\/+|\/+$/g,'').replace(/\.html$/,'');
function pauseGame(){ try{ if(typeof cancelAI==='function') cancelAI(); if(window.ZFX&&ZFX.pause) ZFX.pause(); }catch(e){} }
const KIND={goal:'The goal',watch:'Your turn',try:'Try it yourself',cant:'Not allowed',end:'How it ends',rule:'How it works',more:'Going further'};
/* older step lists (Save the Duckie, One More Bridge) only have titles; read a kind from them */
const kindOf=st=>st.kind||(/goal/i.test(st.title)?'goal':/^try/i.test(st.title)?'try':/complication|careful|never/i.test(st.title)?'cant':'rule');
const isPractice=st=>st.practice!==undefined?!!st.practice:['try','cant'].includes(kindOf(st));
const entryShown=()=>document.querySelector('.entry.show');
/* from: 'entry' (no match behind it) or 'game' (a live board behind it, paused while this is open) */
let rulesOpts=null;
if(window.ZF&&ZF.modal) ZF.modal.reopen('gdrawer',()=>{ if(!rulesOpts) return false; openRules(rulesOpts); return drawer.classList.contains('open'); });
function openRules(opts){ opts=opts||{}; rulesOpts=opts; if(window.ZFReact) ZFReact.close(); if(window.ZFHintDuck) ZFHintDuck.hide(); const d=active(); const entry=!d||opts.from==='entry'?entryShown():null; if(!d&&!entry) return;
  tutFrom=entry?'entry':'game';
  let name='', written='', moves='';
  if(entry){ const t=entry.querySelector('.e-title'); name=t?(t.getAttribute('aria-label')||t.textContent):''; const wb=entry.querySelector('.e-rules-body'); written=wb?wb.innerHTML:''; }
  else { const h2=document.querySelector('#'+d.root+' .topbar h2'); name=h2?h2.textContent:''; const rules=$(d.rules), hist=d.hist&&$(d.hist); written=rules?(rules.children.length?rules.innerHTML:`<p>${rules.textContent}</p>`):''; moves=(hist&&hist.textContent.trim()?`<h4>Moves so far</h4><div class="gd-hist">${hist.innerHTML}</div>`:''); pauseGame(); }
  const further=(window.ZF&&ZF.creditHTML(slugNow(),true))||''; const full=written+(further?`<h4>Credits</h4>${further}`:'');
  /* the same four-line summary as the entry page, with the full rules one step further in */
  const writtenAll=(window.ZFRules&&ZFRules.html(slugNow(),full))||full;
  $('gdTitle').innerHTML=`<small>How to play</small>${name}`;
  $('gdBack').querySelector('span').textContent=entry?'Back':'Back to game';
  const slug=slugNow(), steps=window.ZLessons&&ZLessons.get(slug), better=window.ZFImprove&&ZFImprove[slug];
  stopImprove(); drawer.classList.remove('paths','improve');
  const rules=()=>{ drawer.classList.remove('paths','improve'); if(!steps||!steps.length){ drawer.classList.add('solo'); $('gdBody').innerHTML=`<div class="gt-step">${writtenAll}${moves}</div>`; }
    else { drawer.classList.remove('solo'); buildLesson(steps,slug,writtenAll,moves); }
    if(better) addPathsBack(()=>paths()); fitStage(); };
  /* a game with a strategy trainer offers two ways in; the rules stay one tap away inside each */
  const paths=()=>{ stopImprove(); drawer.classList.remove('solo','improve'); drawer.classList.add('paths');
    $('gdBody').innerHTML=`<div class="gp-wrap"><div class="gp-list"><button type="button" class="gp-card" data-path="rules"><b>Learn the rules</b><span>${better.rulesSub||'How a turn works and how a game ends, one move at a time.'}</span><small>Lessons</small></button><button type="button" class="gp-card" data-path="improve"><b>Improve your play</b><span>${better.sub}</span><small>${better.tag||'Practice'}</small></button></div></div>`;
    $('gdBody').querySelector('[data-path="rules"]').onclick=rules;
    $('gdBody').querySelector('[data-path="improve"]').onclick=improve;
    try{ $('gdBody').querySelector('.gp-card').focus({preventScroll:true}); }catch(e){} };
  const improve=()=>{ stopImprove(); drawer.classList.remove('solo','paths'); drawer.classList.add('improve'); const body=$('gdBody'); body.innerHTML=''; body.scrollTop=0;
    try{ improveNow=better.mount(body,{back:paths,close:closeRules,written:writtenAll})||null; }catch(e){ console.error(e); body.textContent='The trainer could not load.'; }
    addPathsBack(paths); };
  if(better&&opts.path!=='rules'){ if(opts.path==='improve') improve(); else paths(); } else rules();
  lastFocus=document.activeElement; drawer.classList.add('open'); document.documentElement.classList.add('gt-lock'); fitStage();
  setTimeout(()=>{ try{ $('gdTitle').focus({preventScroll:true}); }catch(e){} },30); }
/* a step teaches by doing: a goal, a move played out, a practice board, a restriction, the ending. Nothing advances by itself. */
function buildLesson(steps,slug,written,moves){ const body=$('gdBody');
  const core=steps.filter(s=>kindOf(s)!=='more'), extra=steps.filter(s=>kindOf(s)==='more');
  let list=core, part='core', idx=0, cur=null, auto=0, tok=0;   // tok: a late note from a step already left is dropped
  const saved=lessonAt[slug]; if(saved&&!(saved.part!=='more'&&saved.idx>=list.length-1)){   // resume mid-tutorial; one closed on its last step starts over
    if(saved.part==='more'&&extra.length){ list=extra; part='more'; } idx=Math.min(saved.idx,list.length-1); }
  body.innerHTML=`<div class="gt-step"><div class="gt-kick"><span class="gt-kind"></span></div><h4 class="ls-title"></h4><p class="ls-text"></p><div class="ls-stage" id="lsStage"></div><div class="ls-guide">${guideHTML()}<div class="ls-note" id="lsNote" aria-live="polite"></div></div><div class="gt-acts"><button type="button" class="ls-btn ghost" id="lsAgain">Try again</button><button type="button" class="ls-btn ghost" id="lsShow">Show me</button><button type="button" class="ls-btn ghost" id="lsMore">Explore the strategy</button></div></div><details class="gt-written"><summary>Read the written rules</summary><div class="gt-wbody">${written}${moves}</div></details>`;
  const $$=id=>drawer.querySelector('#'+id), stage=$$('lsStage'), note=$$('lsNote'), guide=body.querySelector('.ls-guide .ls-gd');
  const nod=()=>{ guide.classList.remove('nod'); void guide.offsetWidth; guide.classList.add('nod'); };
  const lastPractice=()=>{ let k=-1; list.forEach((s,i)=>{ if(isPractice(s)) k=i; }); return k; };
  const show=()=>{ clearTimeout(auto); const st=list[idx]; lessonAt[slug]={part,idx}; const kind=kindOf(st);
    const kEl=body.querySelector('.gt-kind'); kEl.textContent=st.kick||KIND[kind]||KIND.rule; kEl.classList.toggle('practice',isPractice(st));
    $('lsPrev').disabled=idx===0&&part==='core'; $('lsSkip').disabled=idx>=list.length-1;
    const n=list.length; $('lsPrev').closest('.gt-foot').querySelector('.ls-count').textContent=part==='more'?`Strategy ${idx+1} of ${n}`:`${idx+1} of ${n}`;
    drawer.querySelector('.gt-dots').innerHTML=list.map((_,i)=>`<i class="${i===idx?'on':i<idx?'done':''}"></i>`).join('');
    body.querySelector('.ls-title').textContent=st.title; body.querySelector('.ls-text').innerHTML=st.text; stage.innerHTML=''; note.innerHTML=''; note.classList.remove('ok'); stage.classList.remove('done');
    let againOk=false; const t=++tok, live=()=>t===tok&&drawer.classList.contains('open');
    const api={ note:h=>{ if(!live()) return; if(note.innerHTML!==h){ note.innerHTML=h; if(h) nod(); } }, ok:()=>{ if(!live()) return; if(againOk) $$('lsAgain').style.display=''; note.classList.add('ok'); stage.classList.add('done'); if(window.ZS) ZS.play('ping'); }, reset:()=>{}, again:()=>{ if(live()) show(); } };
    try{ cur=st.mount(stage,api)||{}; }catch(e){ console.error(e); cur={}; note.textContent='This example could not load.'; }
    const watch=kind==='watch'&&cur&&cur.show;
    /* one clear control: Watch example (or Watch again once it has played), hidden while it plays; Try again; or none */
    const sb=$$('lsShow'); sb.style.display=(cur&&cur.show)?'':'none'; sb.style.visibility=''; sb.disabled=false; sb.textContent='Watch example';
    /* Try again only once there is something to undo; before that, a step with an example offers only Watch example */
    againOk=(isPractice(st)||kind==='end'||!!cur.reset)&&!watch; $$('lsAgain').style.display=againOk&&!cur.show?'':'none';
    const last=idx===list.length-1; $$('lsMore').style.display=(part==='core'&&last&&extra.length)?'':'none';
    $('lsNext').hidden=last; $('lsPlay').hidden=!last; $('lsNext').textContent='Next';
    body.scrollTop=0; fitStage();
    if(watch) auto=setTimeout(()=>{ if(drawer.classList.contains('open')&&list[idx]===st) play(); },650); };
  const play=async()=>{ if(!cur||!cur.show) return; const t=tok, sb=$$('lsShow'); if(cur.reset) cur.reset(); sb.disabled=true; sb.style.visibility='hidden';
    try{ await cur.show(); }catch(e){} if(t!==tok) return; sb.disabled=false; sb.style.visibility=''; sb.textContent='Watch again'; };
  $('lsPrev').onclick=()=>{ if(idx>0){ idx--; show(); } else if(part==='more'){ list=core; part='core'; idx=core.length-1; show(); } };
  $('lsNext').onclick=()=>{ if(idx<list.length-1){ idx++; show(); } };
  $('lsPlay').onclick=()=>{ lessonAt[slug]=null; playNow(); };
  $('lsSkip').onclick=()=>{ idx=list.length-1; show(); try{ $('lsPlay').focus({preventScroll:true}); }catch(e){} };
  $$('lsAgain').onclick=()=>{ if(cur&&cur.reset&&!isPractice(list[idx])) cur.reset(); else show(); };
  $$('lsShow').onclick=play;
  $$('lsMore').onclick=()=>{ list=extra; part='more'; idx=0; show(); };
  show(); }
/* The tutorial is sized by the browser window it is in, never by the screen. The text keeps its size; the illustration
   (practice board, pieces, real game board) scales down, to 55% at most, until the step's try controls (Try again,
   Show me) sit inside the visible body. Only past that does the body scroll, so nothing is clipped. It is measured
   again whenever the body changes size: a resize, a change of display scaling or browser zoom, a move to another
   monitor. Lessons draw through --ls-k (lessons.js), so no canvas or transform is rescaled behind their back. */
let fitK=1;
function fitStage(){ const body=$('gdBody'), st=$('lsStage'); if(!body||!st||!drawer.classList.contains('open')) return;
  const acts=body.querySelector('.gt-acts'), step=body.querySelector('.gt-step');
  const need=()=>{ const b=body.getBoundingClientRect().bottom-body.scrollTop; let m=st.getBoundingClientRect().bottom;
    [acts&&acts.offsetHeight?acts:null,$('lsNote')].forEach(e=>{ if(e) m=Math.max(m,e.getBoundingClientRect().bottom); }); return m+12-b; };
  const inner=()=>{ const cs=getComputedStyle(st); return st.offsetHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom); };
  fitK=1; st.style.setProperty('--ls-k','1'); [...st.children].forEach(c=>{ c.style.zoom=''; });
  for(let i=0;i<4;i++){ const over=need(), h=inner(); if(over<=1||h<=40) break;
    const k=Math.max(.55,fitK*(h-over)/h); if(Math.abs(k-fitK)<.01) break; fitK=k; st.style.setProperty('--ls-k',k.toFixed(3)); }
  /* a game's own demo board (Quarto's, Gold Coin's ...) has fixed sizes of its own: it is zoomed as a whole instead,
     which keeps its layout and its hit areas together */
  const over=need(); if(over>1){ const h=inner(); if(h>40){ const z=Math.max(.6,(h-over)/h); if(z<.99) [...st.children].forEach(c=>{ c.style.zoom=z.toFixed(3); }); } }
  if(step) step.classList.toggle('gt-fitted',fitK<1); }
let fitR=0; const refit=()=>{ cancelAnimationFrame(fitR); fitR=requestAnimationFrame(fitStage); };
if('ResizeObserver' in window) new ResizeObserver(refit).observe($('gdBody')); else addEventListener('resize',refit);
/* display scaling or browser zoom changes the device-pixel ratio, sometimes without a resize */
(function watchDpr(){ const mq=matchMedia(`(resolution: ${devicePixelRatio}dppx)`); const on=()=>{ refit(); watchDpr(); }; if(mq.addEventListener) mq.addEventListener('change',on,{once:true}); })();
/* Play now: closes the tutorial and starts the game from its entry page (its own Start button), or returns to the match */
function playNow(){ const from=tutFrom, entry=entryShown(); closeRules();
  if(from!=='entry'||!entry) return;
  const go=[...entry.querySelectorAll('#startBtn,#nStart,#cStart,#gxStart,button.start,[data-act="start"]')].find(b=>b.offsetParent&&!b.disabled);
  if(go) setTimeout(()=>go.click(),30); }
/* the Improve your play view, while open: stopped (its analysis cancelled) whenever the drawer closes or changes path */
let improveNow=null;
function stopImprove(){ if(improveNow&&improveNow.stop) try{ improveNow.stop(); }catch(e){} improveNow=null; }
function addPathsBack(fn){ const body=$('gdBody'); if(body.querySelector('.gp-back')) return; const b=document.createElement('button'); b.type='button'; b.className='gp-back'; b.innerHTML=`${BACK_ICON}<span>Choose a path</span>`; b.onclick=fn; body.insertBefore(b,body.firstChild); }
function closeRules(){ const was=drawer.classList.contains('open'); stopImprove(); drawer.classList.remove('open','paths','improve'); document.documentElement.classList.remove('gt-lock');
  const st=$('lsStage'); if(st) st.innerHTML='';   // stop any practice animation
  if(lastFocus&&lastFocus.focus) try{ lastFocus.focus({preventScroll:true}); }catch(e){}
  if(was&&tutFrom==='game'){ const d=active(); if(d) setTimeout(()=>{ try{ d.ai(); }catch(e){} },30); } tutFrom=null; }
$('gdClose').onclick=closeRules; $('gdBack').onclick=closeRules; scrim.onclick=()=>{ closeRules(); };
document.addEventListener('keydown',e=>{ if(e.key!=='Escape') return; if(document.getElementById('gsettings').classList.contains('open')) closeSettings(); else if(document.getElementById('gcustom').classList.contains('open')) closeCustomDialog(); else closeRules(); });
/* Learn how to play: every strategy and mind game's entry page gets the same tutorial the Rules button opens. The short
   description stays; the old inline "Full rules" box becomes the written-rules section inside the tutorial. */
const BOOK=ICONS.rules.replace('width="22" height="22"','width="21" height="21"');
document.querySelectorAll('section.entry').forEach(sec=>{ if(sec.id==='partySetup'||sec.id==='pondSetup'||sec.id==='tailSetup'||sec.id==='emmSetup') return; const box=sec.querySelector('.e-rules'); if(!box) return;
  box.hidden=true; const b=document.createElement('button'); b.type='button'; b.className='e-learn'; b.innerHTML=`${BOOK}<span>How to play</span>`;
  b.onclick=()=>openRules({from:'entry'}); box.insertAdjacentElement('beforebegin',b); });

/* ================= Settings: compact, general preferences only. Never touches the board underneath. ================= */
const settingsDlg=document.createElement('div'); settingsDlg.id='gsettings'; settingsDlg.className='gdialog'; settingsDlg.setAttribute('role','dialog'); settingsDlg.setAttribute('aria-modal','true'); settingsDlg.setAttribute('aria-label','Settings');
settingsDlg.innerHTML=`<div class="gdialog-scrim"></div><div class="gdialog-card gsettings-card"><div class="gdialog-head"><h3>Settings</h3><button type="button" class="gt" data-label="Close" aria-label="Close settings" id="gsClose">${ICONS.close}</button></div><div class="gdialog-body" id="gsBody"></div></div>`;
document.body.appendChild(settingsDlg);
function closeSettings(){ settingsDlg.classList.remove('open'); }
$('gsClose').onclick=closeSettings; settingsDlg.querySelector('.gdialog-scrim').onclick=closeSettings;

function segRow(container,label,list,val,onPick,note){
  const row=document.createElement('div'); row.className='gs-row';
  row.innerHTML=`<div class="gs-label">${label}</div><div class="gs-seg" role="group" aria-label="${label}">${list.map(([v,l])=>`<button type="button" data-v="${v}" class="${v===val?'on':''}" aria-pressed="${v===val}">${l}</button>`).join('')}</div>${note?`<p class="gs-note">${note}</p>`:''}`;
  row.querySelectorAll('button').forEach(b=>b.onclick=()=>{ row.querySelectorAll('button').forEach(x=>{ x.classList.toggle('on',x===b); x.setAttribute('aria-pressed',x===b); }); onPick(b.dataset.v); });
  container.appendChild(row); return row;
}
function switchRow(container,label,val,onPick){
  const row=document.createElement('div'); row.className='gs-row gs-opt';
  row.innerHTML=`<span class="gs-olabel">${label}</span><button type="button" class="sw" role="switch" aria-checked="${!!val}" aria-label="${label}"><span class="sw-knob"></span></button>`;
  const sw=row.querySelector('.sw'); sw.onclick=()=>{ const v=sw.getAttribute('aria-checked')!=='true'; sw.setAttribute('aria-checked',v); onPick(v); };
  container.appendChild(row); return row;
}
/* Every game's Settings shows the same shape — Players, Difficulty, Who starts, Hints — but reads and writes that game's own
   preference object and (when a match is live) its own live match, so a change here is felt at once without a restart. */
function fillSettingsOldGame(body, d, entry){
  const cur=window.__gameCur&&window.__gameCur(); const live=window.__gameMatch&&window.__gameMatch(); const G=(window.__gameDefs&&window.__gameDefs())[cur.game]||{diffs:[['medium','Medium']]};
  const liveOn=()=>live&&!live.over;
  const rerender=()=>{ body.innerHTML=''; fillSettingsOldGame(body, d, entry); };
  segRow(body,'Players',[['ai','Computer'],['2p','Two players']],cur.opp,v=>{ cur.opp=v; if(liveOn()){ window.cancelAI&&cancelAI(); live.opp=v; if(window.renderStatus) renderStatus(); window.maybeAI&&maybeAI(); } rerender(); });
  if(cur.opp==='ai'){ segRow(body,'Difficulty',G.diffs,cur.diff,v=>{ cur.diff=v; if(liveOn()){ window.cancelAI&&cancelAI(); live.diff=v; window.maybeAI&&maybeAI(); } },G.note);
    segRow(body,'Who starts?',[['human','You'],['ai','Computer'],['random','Random']],cur.first,v=>cur.first=v,'Applies the next time you start a new game.'); }
  switchRow(body,'Hints',cur.mode==='practice',v=>{ cur.mode=v?'practice':'challenge'; if(liveOn()){ live.mode=cur.mode; const hb=$('hintBtn'); if(hb) hb.style.display=(cur.mode==='practice'&&live.opp==='ai')?'':'none'; } });
  if(entry) appendStartButton(body, d);
}
function fillSettingsNim(body, d, entry){
  const nimP=window.__nimPrefs&&window.__nimPrefs(); const nm=window.__nimState&&window.__nimState(); if(!nimP) return;
  const liveOn=()=>nm&&!nm.over&&!nm.preview;
  const rerender=()=>{ body.innerHTML=''; fillSettingsNim(body, d, entry); };
  if(nm&&nm.opp==='online'&&!nm.preview){
    segRow(body,'Players',[['ai','Computer'],['2p','Two players'],['online','Online friend']],'online',()=>{});
    body.lastElementChild.querySelectorAll('.gs-seg button:not([data-v="online"])').forEach(b=>b.disabled=true);
    body.appendChild(Object.assign(document.createElement('p'),{className:'gs-note',textContent:`Playing online with ${(nm.online&&nm.online.opponentNickname)||'your friend'} — use Leave room (in the room bar below the board) to end this match.`}));
    return;
  }
  segRow(body,'Players',[['ai','Computer'],['2p','Two players'],['online','Online friend']],nimP.opp,v=>{ if(v==='online'){ closeSettings(); window.ZFOnlineNim&&ZFOnlineNim.open(); return; } nimP.opp=v; if(liveOn()){ window.cancelAI&&cancelAI(); nm.opp=v; ZFA.nimAI&&ZFA.nimAI(); } rerender(); });
  if(nimP.opp==='ai'){ segRow(body,'Difficulty',[['easy','Easy'],['medium','Medium'],['hard','Hard'],['perfect','Perfect']],nimP.diff,v=>{ nimP.diff=v; if(liveOn()){ window.cancelAI&&cancelAI(); nm.diff=v; ZFA.nimAI&&ZFA.nimAI(); } },'Perfect never gives up a forced win. From a position that is already lost for it, no engine can force a win — it still plays a legal move.');
    segRow(body,'Who starts?',[['human','You'],['ai','Computer'],['random','Random']],nimP.first,v=>nimP.first=v,'Applies the next time you start a new game.'); }
  switchRow(body,'Hints',nimP.mode==='practice',v=>{ nimP.mode=v?'practice':'challenge'; if(liveOn()){ nm.mode=nimP.mode; const hb=$('nHint'); if(hb) hb.style.display=(nimP.mode==='practice'&&nm.opp==='ai')?'':'none'; } });
  if(entry) appendStartButton(body, d);
}
function fillSettingsChomp(body, d, entry){
  const chP=window.__chompPrefs&&window.__chompPrefs(); const cm=window.__chompState&&window.__chompState(); if(!chP) return;
  const liveOn=()=>cm&&!cm.over&&!cm.preview;
  const rerender=()=>{ body.innerHTML=''; fillSettingsChomp(body, d, entry); };
  segRow(body,'Players',[['ai','Computer'],['2p','Two players']],chP.opp,v=>{ chP.opp=v; if(liveOn()){ window.cancelAI&&cancelAI(); cm.opp=v; ZFA.chAI&&ZFA.chAI(); } rerender(); });
  if(chP.opp==='ai'){ const canPerfect=window.CHOMP&&CHOMP.exactCovered&&CHOMP.exactCovered(chP.R,chP.C);
    const list=[['easy','Easy'],['medium','Medium'],['hard','Hard'],['expert','Expert'],['perfect','Perfect']];
    segRow(body,'Difficulty',list,chP.diff,v=>{ chP.diff=v; if(liveOn()){ window.cancelAI&&cancelAI(); cm.diff=v; ZFA.chAI&&ZFA.chAI(); } },canPerfect?'Perfect uses the exact solver for this board size.':'Perfect is unavailable for this board size; Expert (bounded search, no guarantee) is the strongest available.');
    if(!canPerfect){ const b=body.querySelector('.gs-seg button[data-v="perfect"]'); if(b) b.disabled=true; }
    segRow(body,'Who starts?',[['human','You'],['ai','Computer'],['random','Random']],chP.first,v=>chP.first=v,'Applies the next time you start a new game.'); }
  switchRow(body,'Hints',chP.mode==='practice',v=>{ chP.mode=v?'practice':'challenge'; if(liveOn()){ cm.mode=chP.mode; const hb=$('cHint'); if(hb) hb.style.display=(chP.mode==='practice'&&cm.opp==='ai')?'':'none'; } });
  if(entry) appendStartButton(body, d);
}
function fillSettingsGx(body, d, entry){
  const id=window.ZFX&&ZFX.current&&ZFX.current(); const gdef=id&&ZFX.def(id); const draft=window.ZFX&&ZFX.draftOpt&&ZFX.draftOpt(); if(!gdef||!draft) return;
  const M=ZFX.M; const liveOn=()=>M&&!M.previewOnly&&!(M.hist&&M.hist[M.hist.length-1]&&M.hist[M.hist.length-1].over);
  const rerender=()=>{ body.innerHTML=''; fillSettingsGx(body, d, entry); };
  // puzzle-set choice only makes sense before starting — a live match (or one already resumed) keeps its own mode
  if(gdef.puzzleSets && entry && !liveOn()){
    segRow(body,'Mode',[['play','Play a match'],['puzzle','Puzzles']],draft.mode||'play',v=>{ draft.mode=v; if(v==='puzzle'&&!draft.set) draft.set=gdef.puzzleSets[0].id; rerender(); });
    if(draft.mode==='puzzle'){ segRow(body,'Puzzle set',gdef.puzzleSets.map(x=>[x.id,x.name]),draft.set||gdef.puzzleSets[0].id,v=>draft.set=v);
      appendStartButton(body, d); return; }
  }
  const isCustom=!!gdef.custom, isPuzzle=draft.mode==='puzzle';
  if(isPuzzle){ body.innerHTML='<p class="gs-empty">Puzzle mode has its own set of options — open Customize to change it.</p>'; if(entry) appendStartButton(body, d); return; }
  if(isCustom){ /* fully custom games hide player/difficulty entirely, same as their own setup screen */ }
  else if(gdef.online && M && M.opt.opp==='online' && !M.previewOnly){
    segRow(body,'Players',[['ai','Computer'],['2p','Two players'],['online','Online friend']],'online',()=>{});
    body.lastElementChild.querySelectorAll('.gs-seg button:not([data-v="online"])').forEach(b=>b.disabled=true);
    body.appendChild(Object.assign(document.createElement('p'),{className:'gs-note',textContent:`Playing online with ${(M.online&&M.online.opponentNickname)||'your friend'} — use Leave room (in the room bar below the board) to end this match.`}));
    return;
  }
  else { const playersList=[['ai','Computer'],['2p','Two players']]; if(gdef.online) playersList.push(['online','Online friend']);
    segRow(body,'Players',playersList,draft.opp,v=>{ if(v==='online'){ closeSettings(); gdef.online(); return; } draft.opp=v; if(liveOn()){ ZFX.cancelPending&&ZFX.cancelPending(); ZFX.setLive&&ZFX.setLive({opp:v}); ZFX.rethink&&ZFX.rethink(); } rerender(); });
    if(draft.opp==='ai'){ const list=typeof gdef.diffsFor==='function'?gdef.diffsFor(draft):gdef.diffs; segRow(body,'Difficulty',list,draft.diff,v=>{ draft.diff=v; if(liveOn()){ ZFX.cancelPending&&ZFX.cancelPending(); ZFX.setLive&&ZFX.setLive({diff:v}); ZFX.rethink&&ZFX.rethink(); } },typeof gdef.diffNoteFor==='function'?gdef.diffNoteFor(draft):gdef.diffNote);
      if(gdef.firstChoice!==false) segRow(body,'Who starts?',[['human','You'],['ai','Computer'],['random','Random']],draft.first,v=>draft.first=v,'Applies the next time you start a new game.'); } }
  if(!gdef.noHints) switchRow(body,'Hints',draft.hints,v=>{ draft.hints=v; if(liveOn()){ ZFX.setLive&&ZFX.setLive({hints:v}); const hb=$('gxHint'); if(hb) hb.style.display=(v&&draft.opp==='ai'&&gdef.hint)?'':'none'; } });
  if(!body.children.length) body.innerHTML='<p class="gs-empty">This game has no general preferences of its own — try Customize below the board.</p>';
  if(entry) appendStartButton(body, d);
}
function openSettings(d, entry){ const body=$('gsBody'); body.innerHTML='';
  if(d.root==='game') fillSettingsOldGame(body, d, entry); else if(d.root==='nimGame') fillSettingsNim(body, d, entry); else if(d.root==='chGame') fillSettingsChomp(body, d, entry); else if(d.root==='gxGame') fillSettingsGx(body, d, entry);
  /* the move timer and the match score, for every game with a matchup (turn-timer.js, match.js) */
  if(!entry&&window.ZFMatch&&ZFMatch.current()&&ZFMatch.current().root===d.root){ const cv=ZFMatch.current(); if(window.ZFTimer) ZFTimer.settingsRow(body); if(cv.opp==='ai'&&window.ZFCoach) ZFCoach.settingsRow(body); ZFMatch.settingsRow(body); }
  settingsDlg.classList.toggle('entry', !!entry);
  settingsDlg.classList.add('open'); $('gsClose').focus(); }
/* a fresh, not-yet-started game shows this same dialog with one addition — a Start game button — instead of a
   different "setup screen": one settings surface, whether you're about to start or already mid-game. */
function appendStartButton(body, d){
  const wrap=document.createElement('div'); wrap.className='gs-row'; wrap.style.marginTop='8px';
  wrap.innerHTML=`<button type="button" class="start" style="width:100%;min-height:54px" id="gsEntryStart">Start game</button>`;
  body.appendChild(wrap);
  const btn=wrap.querySelector('#gsEntryStart'); const orig=d.start&&$(d.start);
  if(orig){ proxy(btn, orig); btn.addEventListener('click',()=>closeSettings()); }
}
/* the inert "not started" board preview, shared by every game: the real board rendered non-interactively, with an
   obvious way to start sitting right on top of it once the settings dialog is closed. */
function ensureStartOverlay(d, onStart){
  const boardEl=$(d.board); if(!boardEl) return null;
  let wrap=boardEl.parentNode;
  if(!wrap || !wrap.classList || !wrap.classList.contains('gx-preview-wrap')){
    wrap=document.createElement('div'); wrap.className='gx-preview-wrap';
    boardEl.parentNode.insertBefore(wrap, boardEl); wrap.appendChild(boardEl);
  }
  let ov=wrap.querySelector('.gx-start-overlay');
  if(!ov){ ov=document.createElement('div'); ov.className='gx-start-overlay'; ov.innerHTML='<button type="button">Start game</button>'; wrap.appendChild(ov); }
  ov.querySelector('button').onclick=onStart;
  ov.style.display='flex';
  return ov;
}
function hideStartOverlay(d){ const boardEl=$(d.board); const wrap=boardEl&&boardEl.parentNode; const ov=wrap&&wrap.classList&&wrap.classList.contains('gx-preview-wrap')?wrap.querySelector('.gx-start-overlay'):null; if(ov) ov.style.display='none'; }

/* ================= Customize board / challenge: a second, separate entry, always below the board. =================
   Bespoke games (Nim, Chomp, Domineering, The Gold Coin) own their own editor and are triggered directly.
   Everything else with configurable board options gets this generic dialog: it edits an independent draft and only
   ever touches the live match when "Play this board" is pressed. */
const customDlg=document.createElement('div'); customDlg.id='gcustom'; customDlg.className='gdialog'; customDlg.setAttribute('role','dialog'); customDlg.setAttribute('aria-modal','true');
customDlg.innerHTML=`<div class="gdialog-scrim"></div><div class="gdialog-card gcustom-card"><div class="gdialog-head"><h3 id="gcTitle">Customize board</h3><button type="button" class="gt" data-label="Close" aria-label="Close" id="gcClose">${ICONS.close}</button></div><div class="gdialog-body" id="gcBody"></div></div>`;
document.body.appendChild(customDlg);
function closeCustomDialog(){ customDlg.classList.remove('open'); }
$('gcClose').onclick=closeCustomDialog; customDlg.querySelector('.gdialog-scrim').onclick=closeCustomDialog;
function openGenericGxCustomize(label){
  const id=ZFX.current(); const gdef=ZFX.def(id); const M=ZFX.M; if(!gdef||!M) return;
  const draft=Object.assign({},M.opt);
  $('gcTitle').textContent=label; const body=$('gcBody'); body.innerHTML='';
  /* watchArea holds everything that can change the draft; actions (Play/Cancel) lives outside it, so recheck()
     writing to the Play button's own attributes can never re-trigger the observer that calls recheck(). */
  const watchArea=document.createElement('div'); body.appendChild(watchArea);
  const demoHost=document.createElement('div'); demoHost.style.cssText='display:flex;justify-content:center;margin-bottom:18px'; watchArea.appendChild(demoHost);
  /* A "try a move" teaching exercise belongs in Rules, not here — this dialog arranges a starting state, it doesn't
     teach. Whatever a game's demo() shows, strip its interactivity and its own reset/practice affordances so it
     reads as a plain illustration. Games with a real board editor (Domineering, The Gold Coin) use the in-place
     path instead and never reach this function. */
  const renderDemo=()=>{ demoHost.innerHTML=''; try{ gdef.demo&&gdef.demo(demoHost,draft); }catch(e){}
    demoHost.querySelectorAll('.gx-tag,.gx-btn').forEach(x=>x.style.display='none');
    demoHost.querySelectorAll('button,[tabindex],a').forEach(x=>{ x.style.pointerEvents='none'; x.tabIndex=-1; });
    demoHost.style.pointerEvents='none'; };
  renderDemo();
  (gdef.options||[]).forEach(o=>{ segRow(watchArea,o.label,o.values,draft[o.key],v=>{ draft[o.key]=v; if(gdef.onOption){ try{ gdef.onOption(draft,demoHost); }catch(e){} } renderDemo(); }); });
  const actions=document.createElement('div'); actions.className='gc-actions';
  actions.innerHTML=`<button type="button" class="start play">Play this board</button><button type="button" class="cancel">Cancel</button>`;
  body.appendChild(actions);
  const playBtn=actions.querySelector('.play');
  const recheck=()=>{ const m=gdef.canStart?gdef.canStart(draft):''; playBtn.disabled=!!m; playBtn.title=m||''; };
  recheck(); const obs=new MutationObserver(recheck); obs.observe(watchArea,{subtree:true,childList:true,attributes:true});
  actions.querySelector('.play').onclick=()=>{ obs.disconnect(); Object.assign(M.opt,draft); ZFX.newGame(); closeCustomDialog(); };
  actions.querySelector('.cancel').onclick=()=>{ obs.disconnect(); closeCustomDialog(); };
  customDlg.classList.add('open'); }
/* Games whose existing demo/workshop function already IS a full board editor (Domineering's hole painter, The Gold
   Coin's workshop) get to edit the live board in place instead of a dialog: the board itself becomes the editor,
   keeping its size and position, and everything pauses until "Play this board" or "Cancel". */
function openInplaceGxCustomize(){
  const id=ZFX.current(); const gdef=ZFX.def(id); const M=ZFX.M; if(!gdef||!M||!gdef.demo) return;
  ZFX.pause&&ZFX.pause();
  const draft=Object.assign({},M.opt);
  const root=$('gxGame'); const stage=root.querySelector('.stage'); const boardEl=$('gxBoard'); const statusEl=$('gxStatus'); const toolbar=stage.querySelector('.gtools');
  const oldStatusHTML=statusEl.innerHTML; statusEl.innerHTML='<span class="cond">Editing — build the position you want to play.</span>';
  boardEl.style.display='none'; if(toolbar) toolbar.style.visibility='hidden';
  const bar=document.createElement('div'); bar.className='editbar'; bar.innerHTML=`<span class="edittag">Editing board</span>`; boardEl.insertAdjacentElement('beforebegin',bar);
  const editHost=document.createElement('div'); editHost.className='ch-edithost'; boardEl.insertAdjacentElement('afterend',editHost);
  const actions=document.createElement('div'); actions.className='editactions'; actions.style.cssText='width:100%;justify-content:center;margin-top:14px';
  actions.innerHTML=`<button type="button" class="play">Play this board</button><button type="button" class="cancel">Cancel</button>`; editHost.insertAdjacentElement('afterend',actions);
  const customizeWrap=stage.querySelector('.gcustomize-entry'); if(customizeWrap) customizeWrap.style.display='none';
  try{ gdef.demo(editHost,draft); }catch(e){}
  const playBtn=actions.querySelector('.play');
  /* why Play is unavailable, in words, right beside it (not only in a hover tooltip) */
  const why=document.createElement('div'); why.className='editwhy'; why.setAttribute('aria-live','polite'); actions.insertAdjacentElement('afterend',why);
  const recheck=()=>{ const m=gdef.canStart?gdef.canStart(draft):''; playBtn.disabled=!!m; playBtn.title=m||''; if(why.textContent!==(m||'')) why.textContent=m||''; return m; };
  recheck(); const obs=new MutationObserver(recheck); obs.observe(editHost,{subtree:true,childList:true,attributes:true,characterData:true});
  function cleanup(){ obs.disconnect(); bar.remove(); editHost.remove(); actions.remove(); why.remove(); boardEl.style.display=''; statusEl.innerHTML=oldStatusHTML; if(toolbar) toolbar.style.visibility=''; if(customizeWrap) customizeWrap.style.display=''; }
  playBtn.onclick=()=>{ if(recheck()) return; Object.assign(M.opt,draft); ZFX.newGame(); cleanup(); };
  actions.querySelector('.cancel').onclick=()=>{ cleanup(); ZFX.redraw&&ZFX.redraw(); };
}
/* which gx games have a "Customize" entry at all, and what kind: only games that actually have configurable board
   content get one — nothing is invented for games that don't. */
const GX_INPLACE={gold:1,domineering:1};
function gxCustomizeInfo(){ const id=ZFX.current&&ZFX.current(); const gdef=id&&ZFX.def(id); if(!gdef) return null;
  if(gdef.optsInline) return null;   // options live inline in Settings instead of a separate Customize dialog
  const M=ZFX.M; if(M&&M.opt&&M.opt.mode==='puzzle') return null;   // puzzle mode has its own set of options, not a board to edit
  if(GX_INPLACE[id]) return {kind:'inplace',label:'Customize board'};
  if(gdef.options&&gdef.options.length){ const scenario=!!gdef.custom; return {kind:'dialog',label:scenario?'Customize challenge':'Customize board'}; }
  return null; }

/* a game lost on time (turn-timer.js): the same result dialog, with the score and the same next steps */
function timeUp(root,o){ const d=DEFS.find(x=>x.root===root); if(!d) return; if(drawer.classList.contains('open')) closeRules(); closeSettings(); if(window.ZFHintDuck) ZFHintDuck.hide();
  const dl=ensureResDlg(); dl.querySelector('.zr-sym').innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="35" r="20" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M32 35V23M32 35l8 5M26 9h12M32 9v6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  dl.querySelector('.zr-sym').className='zr-sym draw'; dl.querySelector('.zr-t').textContent=o.title; dl.querySelector('.zr-d').textContent=o.detail||'';
  const sc=dl.querySelector('.zr-score'); sc.innerHTML=window.ZFMatch?ZFMatch.scoreLine():''; if(window.ZFMatch) ZFMatch.refresh();
  dl.querySelector('.zr-look').textContent='Look at the board';
  const box=dl.querySelector('.zr-acts'); box.innerHTML=''; box.hidden=false; dl.querySelector('.zr-pend').hidden=true;
  const add=(label,fn,main)=>{ const b=document.createElement('button'); b.type='button'; b.className=main?'zr-main':'zr-second'; b.textContent=label; b.onclick=()=>{ closeResult(); fn(); }; box.appendChild(b); };
  add('Play again',()=>{ const el=$(d.more||d.restart); if(el&&!el.disabled) el.click(); else if(d.root==='gxGame'&&window.ZFX) ZFX.newGame(); },true);
  add('Settings',()=>{ const s2=$(d.settings); if(s2&&s2.onclick) s2.onclick(); else openSettings(d); });
  resDlgFor=d; if(d.resultBtn) d.resultBtn.hidden=true; dl.classList.add('open');
  const f=box.querySelector('button'); if(f) try{ f.focus({preventScroll:true}); }catch(e){} }
window.ZFShell={
  openRules,closeRules,active,timeUp,
  back(){ const d=active(); if(d){ $(d.back).click(); return true; } return false; },
  openSettings:()=>{ const d=active(); if(d) openSettings(d); },
  /* fresh entry: same Settings dialog, plus a Start game button — called by each game's own "just opened, not
     started yet" entry point, once its inert board preview is already showing behind it. */
  openEntrySettings:()=>{ const d=active(); if(d) openSettings(d, true); },
  ensureStartOverlay:(rootKey,onStart)=>{ const d=DEFS.find(x=>x.root===rootKey); if(d) return ensureStartOverlay(d,onStart); },
  hideStartOverlay:(rootKey)=>{ const d=DEFS.find(x=>x.root===rootKey); if(d) hideStartOverlay(d); },
  closeSettings, closeCustomDialog,
  // Exposed for gxSetup (games2.js): the entry screen needs the exact same "does this game have a board/challenge
  // to customize, and what should the button say" check the live board's own Customize entry already makes, and
  // the same click behavior — reusing that button's own onclick (built once, in build()) rather than duplicating
  // the inplace/dialog/online branching here a second time.
  gxCustomizeInfo,
  openGxCustomize(){ const d=DEFS.find(x=>x.root==='gxGame'); if(d&&d.customizeBtn) d.customizeBtn.click(); },
  /* the same dialog chrome, for a bespoke board editor (Nim, Chomp, Domineering, The Gold Coin) to fill in itself */
  openCustomShell(title){ $('gcTitle').textContent=title; $('gcBody').innerHTML=''; customDlg.classList.add('open'); return $('gcBody'); },
  segRow, switchRow,
};

/* ================= toolbar + customize entry ================= */
const mk=(label,icon,cls)=>{ const b=document.createElement('button'); b.type='button'; b.className='gt'+(cls?' '+cls:''); b.setAttribute('data-label',label); b.setAttribute('aria-label',label); b.innerHTML=icon; hold(b); return b; };
function hold(b){ let t=null,held=false; b.addEventListener('pointerdown',e=>{ if(e.pointerType!=='touch') return; held=false; t=setTimeout(()=>{ held=true; b.classList.add('hold'); },420); }); const end=()=>{ clearTimeout(t); if(b.classList.contains('hold')) setTimeout(()=>b.classList.remove('hold'),1400); };
  b.addEventListener('pointerup',end); b.addEventListener('pointercancel',end); b.addEventListener('pointerleave',()=>clearTimeout(t)); b.addEventListener('click',e=>{ if(held){ e.preventDefault(); e.stopImmediatePropagation(); held=false; } },true); }
function proxy(btn,orig,hideWhenNone){ const sync=()=>{ btn.disabled=orig.disabled; btn.hidden=orig.style.display==='none'||orig.hidden; }; sync(); new MutationObserver(sync).observe(orig,{attributes:true,attributeFilter:['disabled','style','hidden']}); btn.addEventListener('click',()=>orig.click()); }
function build(d){ const root=$(d.root); if(!root) return; const stage=root.querySelector('.stage'); const status=$(d.status);
  d.settingsBtn=$(d.settings);
  const bar=document.createElement('div'); bar.className='gtools'; bar.setAttribute('role','toolbar'); bar.setAttribute('aria-label','Game controls');
  const bSet=mk('Settings',ICONS.settings), bUndo=mk('Undo',ICONS.undo), bRes=mk('Restart',ICONS.restart), bNew=mk('New game',ICONS.plus), bHint=mk('Hint',ICONS.hint), bRules=mk('How to play',ICONS.rules,'lbl'); bRules.insertAdjacentHTML('beforeend','<span>How to play</span>');
  // Every root's own static Settings button (settingsBtn/nSettings/cSettings/gxSettings) already has its own
  // onclick — arcade-main.js/arcade-games.js/games2.js each wire it to that game's real "go to settings" flow,
  // which for nim/chomp/4x4/ult/cube (and any gxGame with entryReady) is the inline setup screen, not this popup.
  // This visible toolbar button used to bypass that entirely and always open the popup here — defeating an
  // otherwise-complete migration away from it, since a live user could never actually reach the new screen this
  // way. Delegate to the static button's own handler when it has one; only a root with no such handler (none of
  // the four currently ship without one, but a future one might) falls back to this generic popup.
  bSet.addEventListener('click',()=>{ const orig=$(d.settings); if(orig&&orig.onclick){ orig.onclick(); return; } openSettings(d); });
  bRules.addEventListener('click',()=>openRules({from:'game'}));
  proxy(bUndo,$(d.undo)); proxy(bRes,$(d.restart)); proxy(bHint,$(d.hint));
  if(d.more){ proxy(bNew,$(d.more)); } else bNew.addEventListener('click',()=>ZFX.newGame&&ZFX.newGame());
  bar.append(bSet,bUndo,bRes,bNew,bHint,bRules);
  /* Origins & stories (origins.js): a quiet, labelled entry right beside How to play; it opens only when pressed */
  if(window.ZFOrigins){ const bO=ZFOrigins.button(); bO.classList.add('gt-origins'); bar.appendChild(bO); }
  (d.extra||[]).forEach(id=>{ const o=$(id); if(!o) return; const t=document.createElement('button'); t.type='button'; t.className='gt txt sep'; t.textContent=o.textContent.trim()==='next puzzle'?'Next puzzle':'Retry'; t.setAttribute('aria-label',t.textContent); proxy(t,o); bar.appendChild(t); });
  stage.insertBefore(bar,status?status.nextSibling:stage.firstChild);
  /* Customize board: its own visible entry, directly below the board, above credits — never inside Settings. */
  if(d.key==='nim'||d.key==='chomp'){ const wrap=document.createElement('div'); wrap.className='gcustomize-entry'; const b=document.createElement('button'); b.type='button'; b.innerHTML=`${ICONS.pencil}<span>Customize board</span>`;
    b.onclick=()=>{ if(d.key==='nim') ZFA.nimCustomize&&ZFA.nimCustomize(); else ZFA.chCustomize&&ZFA.chCustomize(); }; wrap.appendChild(b); stage.appendChild(wrap); d.customizeBtn=b; }
  else if(d.root==='gxGame'){ const wrap=document.createElement('div'); wrap.className='gcustomize-entry'; wrap.hidden=true; const b=document.createElement('button'); b.type='button';
    b.onclick=()=>{ const M=ZFX.M; if(M&&M.opt&&M.opt.opp==='online'){ const gdef=ZFX.def(ZFX.current()); if(gdef&&gdef.onlineCustomize) gdef.onlineCustomize(); return; } const info=gxCustomizeInfo(); if(!info) return; if(info.kind==='inplace') openInplaceGxCustomize(); else openGenericGxCustomize(info.label); };
    wrap.appendChild(b); stage.appendChild(wrap); d.customizeBtn=b; d.customizeWrap=wrap;
    const sync=()=>{ const info=gxCustomizeInfo(); wrap.hidden=!info; if(info){ b.innerHTML=`${ICONS.pencil}<span>${info.label}</span>`; } };
    new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']}); d.syncCustomize=sync; }
  const res=$(d.result); const sync=()=>stage.classList.toggle('over',res.classList.contains('show')); sync(); new MutationObserver(sync).observe(res,{attributes:true,attributeFilter:['class']});
  /* the end of a match opens the result dialog once; after closing it, the Result button in the toolbar brings it back */
  const bRes2=mk('Result',ICONS.trophy,'txt sep zr-again'); bRes2.insertAdjacentHTML('beforeend','<span>Result</span>'); bRes2.hidden=true; bRes2.addEventListener('click',()=>openResult(d,true)); bar.appendChild(bRes2); d.resultBtn=bRes2;
  let was=res.classList.contains('show');
  new MutationObserver(()=>{ const on=res.classList.contains('show'); if(on===was) return; was=on;
    if(on) setTimeout(()=>openResult(d,false),reduceMotion()?0:650); else { bRes2.hidden=true; if(resDlgFor===d) closeResult(); } }).observe(res,{attributes:true,attributeFilter:['class']});
  /* the one-line instruction is shown to a first-time visitor and then stays out of the way */
  const key='zf-seen-'+d.root; let seen=false; try{ seen=!!localStorage.getItem(key); }catch(e){} if(!seen){ stage.classList.add('firstvisit'); stage.addEventListener('pointerdown',function once(){ stage.classList.remove('firstvisit'); try{ localStorage.setItem(key,'1'); }catch(e){} stage.removeEventListener('pointerdown',once); }); }
}
/* ================= the end-of-match result dialog =================
   Strategy games only (party games have their own standings). It names the winner the same way on both screens:
   a nickname online ("Mansy won!"), "Player 2 won!" on one device, "You won!" or "The computer won!" against the
   computer, "It’s a draw." for a draw. It opens by itself once per finished match (a room update re-sending the same
   result never reopens it), can be closed to look at the final position, and the toolbar's Result button reopens it.
   Its actions are the game's own buttons, so an online rematch or a new board still needs the other player's OK. */
const reduceMotion=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const matchId=new WeakMap(); let matchN=0; const idOf=o=>{ if(!o) return 0; if(!matchId.has(o)) matchId.set(o,++matchN); return matchId.get(o); };
function resultInfo(d){
  let st=null, opp, humanIs, online, winner, draw=false, len=0;
  if(d.root==='game'){ const m=window.__gameMatch&&__gameMatch(); if(!m||!m.over) return null; st=m; opp=m.opp; humanIs=m.humanIs; online=m.online; draw=m.winner===3; winner=m.winner; len=(m.moves||[]).length; }
  else if(d.root==='nimGame'){ const m=window.__nimState&&__nimState(); if(!m||!m.over||m.preview) return null; st=m; opp=m.opp; humanIs=m.humanIs; online=m.online; draw=m.winner===3; winner=m.winner; len=(m.moves||[]).length; }
  else if(d.root==='chGame'){ const m=window.__chompState&&__chompState(); if(!m||!m.over||m.preview) return null; st=m; opp=m.opp; humanIs=m.humanIs; online=m.online; winner=m.winner; len=(m.moves||[]).length; }
  else { const M=window.ZFX&&ZFX.M; if(!M||M.previewOnly||M.puzzle||!M.hist||!M.hist.length) return null; const last=M.hist[M.hist.length-1]; if(!last||!last.over) return null;
    st=M; opp=M.opt&&M.opt.opp; humanIs=M.humanIs; online=M.online; winner=last.winner; draw=!last.winner; len=M.hist.length; }
  if(!draw&&!(winner===1||winner===2)) return null;
  const name=p=>{ if(opp==='online'&&online){ const n=p===(online.mySeat||humanIs)?online.myNickname:online.opponentNickname; return n&&String(n).trim()?String(n).trim():`Player ${p}`; }
    if(opp==='ai') return p===humanIs?'You':'The computer';
    const cur=window.ZFMatch&&ZFMatch.current(), pl=cur&&cur.opp==='2p'&&cur.players[p-1]; return pl&&pl.nick?pl.nick:`Player ${p}`; };   // the names chosen in the matchup
  return { key:d.root+':'+idOf(st)+':'+len+':'+winner, draw, winner, title:draw?'It’s a draw.':`${name(winner)} won!`, mine:opp!=='2p'&&!draw&&winner===humanIs, online:opp==='online' };
}
const RES_SYM={ win:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 10h24v12a12 12 0 0 1-24 0Z" fill="#c9a63f" stroke="#8d742a" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 14h-7a8 8 0 0 0 8 10M44 14h7a8 8 0 0 1-8 10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M32 34v10M24 52h16M27 44h10l2 8H25Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  draw:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="25" cy="32" r="13" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="39" cy="32" r="13" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>' };
let resDlg=null, resDlgFor=null; const resShown={};
function ensureResDlg(){ if(resDlg) return resDlg;
  resDlg=document.createElement('div'); resDlg.id='zfRes'; resDlg.className='gdialog zr-dlg'; resDlg.setAttribute('role','dialog'); resDlg.setAttribute('aria-modal','true'); resDlg.setAttribute('aria-labelledby','zfResT');
  resDlg.innerHTML=`<div class="gdialog-scrim"></div><div class="gdialog-card"><div class="gdialog-head"><h3>Game over</h3><button type="button" class="gt" aria-label="Close and look at the board" id="zfResClose">${ICONS.close}</button></div><div class="gdialog-body"><div class="zr-sym" aria-hidden="true"></div><p class="zr-t" id="zfResT" role="status"></p><div class="zr-score"></div><p class="zr-d"></p><div class="zr-pend" role="status" hidden></div><div class="zr-acts"></div><button type="button" class="zr-look">Look at the board</button></div></div>`;
  document.body.appendChild(resDlg);
  resDlg.querySelector('.gdialog-scrim').onclick=closeResult; $('zfResClose').onclick=closeResult; resDlg.querySelector('.zr-look').onclick=closeResult;
  resDlg.addEventListener('keydown',e=>{ if(e.key==='Escape') closeResult(); });
  return resDlg; }
function closeResult(){ if(!resDlg||!resDlg.classList.contains('open')) return; resDlg.classList.remove('open'); const d=resDlgFor; resDlgFor=null; if(d&&d.resultBtn&&$(d.result).classList.contains('show')){ d.resultBtn.hidden=false; try{ d.resultBtn.focus({preventScroll:true}); }catch(e){} } }
function openResult(d,again){
  const res=$(d.result); if(!res.classList.contains('show')||!$(d.root).classList.contains('show')) return;
  const info=resultInfo(d); if(!info) return;
  if(!again&&resShown[d.root]===info.key) return; resShown[d.root]=info.key;
  const dl=ensureResDlg(), detail=res.querySelector('b+div');
  dl.querySelector('.zr-sym').innerHTML=info.draw?RES_SYM.draw:RES_SYM.win+(reduceMotion()?'':'<i></i><i></i><i></i><i></i><i></i><i></i>');
  dl.querySelector('.zr-sym').className='zr-sym '+(info.draw?'draw':'win');
  /* resultDuck: the winner's own duck from the matchup (match.js) instead of the trophy */
  const gdef=d.root==='gxGame'&&window.ZFX&&ZFX.M&&ZFX.M.def, duckWin=!!(gdef&&gdef.resultDuck);
  if(duckWin&&!info.draw&&window.ZPDuck&&window.ZFMatch){ const cur=ZFMatch.current(), pl=cur&&cur.players&&cur.players[info.winner-1];
    if(pl){ dl.querySelector('.zr-sym').innerHTML=ZFMatch.duckHTML?ZFMatch.duckHTML(Object.assign({diff:cur.diff},pl),{size:'lg'}):ZPDuck.html({nick:pl.nick,duck:pl.duck},{size:'lg'}); dl.querySelector('.zr-sym').className='zr-sym duck';
      /* the winner's own duck celebrates once, with the shared happy face and gesture (react.js moods) */
      const pd=dl.querySelector('.zr-sym .pd'); if(pd&&!reduceMotion()) setTimeout(()=>{ if(!pd.isConnected) return; pd.setAttribute('data-mood','happy'); pd.classList.add('pd-moving'); setTimeout(()=>{ pd.removeAttribute('data-mood'); pd.classList.remove('pd-moving'); },1900); },520); } }
  dl.querySelector('.zr-look').textContent=duckWin?'View board':'Look at the board';
  dl.querySelector('.zr-t').textContent=info.title;
  /* the match score, as the matchup shows it (it bumps when this game is counted) */
  { const sc=dl.querySelector('.zr-score'); const v=window.ZFMatch&&ZFMatch.current(); sc.innerHTML=v&&v.root===d.root?ZFMatch.scoreLine():''; if(sc.innerHTML) ZFMatch.refresh(); }
  const head=res.querySelector('b'); dl.querySelector('.zr-d').textContent=detail?detail.textContent.trim():(head&&head.textContent.trim()!==info.title?head.textContent.trim():'');
  /* the actions are the game's own buttons, clicked for you */
  const acts=[], btn=(label,fn,primary)=>acts.push({label,fn,primary});
  const click=el=>{ if(el&&!el.disabled) el.click(); };
  if(info.online){
    const rm=res.querySelector('#zfRematchBtn'), cb=res.querySelector('#zfChangeBoardBtn'), lv=res.querySelector('#zfResultLeaveBtn');
    if(rm) btn('Request rematch',()=>{ closeResult(); click(rm); },true);
    if(cb) btn('Change board',()=>{ closeResult(); click(cb); });
    if(lv) btn('Leave room',()=>{ closeResult(); click(lv); });
  } else {
    btn('Play again',()=>{ closeResult(); if(d.root==='gxGame'){ const a=$('gxAgain'); if(a) return a.click(); } click($(d.more||d.restart)); },true);
    if(d.customizeBtn&&!(d.customizeWrap&&d.customizeWrap.hidden)) btn('Set up a new board',()=>{ closeResult(); d.customizeBtn.click(); });
    btn('Settings',()=>{ closeResult(); const o=$(d.settings); if(o&&o.onclick) o.onclick(); else openSettings(d); });
  }
  const box=dl.querySelector('.zr-acts'); box.innerHTML='';
  acts.forEach(a=>{ const b=document.createElement('button'); b.type='button'; b.className=a.primary?'zr-main':'zr-second'; b.textContent=a.label; b.onclick=a.fn; box.appendChild(b); });
  resDlgFor=d; d.resultBtn.hidden=true; dl.classList.add('open'); syncPend();
  const first=box.querySelector('button'); if(first) try{ first.focus({preventScroll:true}); }catch(e){}
}
/* an online request (a rematch, a new board) shows on the board as a banner with Accept and Decline; while the result
   dialog covers the board, the same request and the same buttons show here instead */
function syncPend(){
  const dl=resDlg; if(!dl||!resDlgFor||!dl.classList.contains('open')) return;
  const ban=$(resDlgFor.root).querySelector('#zfOnPending'), box=dl.querySelector('.zr-pend'), acts=dl.querySelector('.zr-acts');
  const sig=ban?ban.textContent:''; if(box.dataset.sig===sig) return; box.dataset.sig=sig;
  box.hidden=!ban; acts.hidden=!!ban; box.innerHTML='';
  if(!ban) return;
  const t=document.createElement('p'); t.className='zr-d'; t.textContent=(ban.querySelector('span')||ban).textContent; box.appendChild(t);
  const row=document.createElement('div'); row.className='zr-acts';
  [...ban.querySelectorAll('button')].reverse().forEach((src,i)=>{ const b=document.createElement('button'); b.type='button'; b.className=i===0&&src.id!=='zfCancelReq'?'zr-main':'zr-second'; b.textContent=src.textContent; b.onclick=()=>{ if(src.id==='zfAccept') closeResult(); src.click(); }; row.appendChild(b); });
  box.appendChild(row);
}
DEFS.forEach(d=>{ const r=$(d.root); if(r) new MutationObserver(()=>{ if(resDlgFor===d) syncPend(); }).observe(r,{childList:true,subtree:true}); });
DEFS.forEach(build);
/* the gxGame customize entry depends on which game is currently routed in, which can change after this script runs */
function relabelAll(){ const d=DEFS.find(x=>x.root==='gxGame'); if(d&&d.syncCustomize) d.syncCustomize(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',relabelAll); else setTimeout(relabelAll,0);
addEventListener('popstate',()=>setTimeout(relabelAll,50));
/* the "further reading" credit: one compact line under the board, for the games Joel David Hamkins writes about in Infinitely More */
const crEls=[]; DEFS.forEach(d=>{ const r=$(d.root); const stage=r&&r.querySelector('.stage'); if(!stage) return; const c=document.createElement('div'); c.className='zf-credit'; c.hidden=true; stage.appendChild(c); crEls.push(c); });
function syncCredit(){ const html=window.ZF&&ZF.creditHTML?ZF.creditHTML(slugNow(),false):''; crEls.forEach(c=>{ if(c.dataset.h!==html){ c.dataset.h=html; c.innerHTML=html; } c.hidden=!html; }); }
addEventListener('popstate',()=>setTimeout(syncCredit,50)); new MutationObserver(()=>setTimeout(syncCredit,30)).observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true}); setTimeout(syncCredit,300);

/* ---- per-game background composition: two faint fragments at the outer edges, drawn for that board's shape ----
   Static on game pages. A fragment fades to nothing if the board (or anything you play with) reaches its space.
   Games with an entry-screen illustration (shared.js BACKDROPS) keep that one in play instead, so these stay empty. */
const COMPS=slug=>{ const A=window.ZTRACE&&ZTRACE.frag(slug,'A'), B=window.ZTRACE&&ZTRACE.frag(slug,'B'); if(!A) return null; const strong=slug==='gold-coin'; return [{s:'l',y:.16,w:300,svg:A,strong},{s:'r',y:.56,w:210,svg:B||A,strong}]; };
const trace=document.createElement('div'); trace.id='gtrace'; trace.setAttribute('aria-hidden','true'); document.body.insertBefore(trace,document.body.firstChild);
const tcss=document.createElement('style'); tcss.textContent='#gtrace{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;color:var(--fg)}#gtrace .tf{position:absolute;opacity:.07;transition:opacity .4s}#gtrace .tf{--tbg:var(--bg)}#gtrace .tf.strong{opacity:.05}html[data-inv="1"] [data-tone="dark"] #gtrace .tf.strong,html[data-inv="0"] [data-tone="light"] #gtrace .tf.strong{opacity:.065}#gtrace .tf.gone{opacity:0}#gtrace .tf svg{display:block;width:100%;height:100%;overflow:visible}html:not([data-inv]) #gtrace{opacity:1}'+(window.ZTRACE?ZTRACE.css:'')+''; document.head.appendChild(tcss);
function drawTrace(){ const d=active(); trace.innerHTML=''; if(!d||document.querySelector('#zfbg.on')||settingsDlg.classList.contains('open')||customDlg.classList.contains('open')) return; const frags=COMPS(slugNow()); if(!frags) return; const stage=$(d.root).querySelector('.stage'); const inner=stage?[...stage.querySelectorAll('.pile,.cell,.tile,.qz-cell,.qz-side,.pg svg,.dm svg,.tt-board,.nk-b,.sim svg,.cr-scene,.lm-map,canvas,.b4,.bu,.zc-tile')].filter(e=>e.offsetHeight&&!e.closest('.gtools')):[]; const boxes=inner.map(e=>e.getBoundingClientRect());
  const W=innerWidth,H=innerHeight; frags.forEach(f=>{ const w=Math.min(f.w,W*.24), h=w, vis=w*.7; const x=f.s==='l'?vis-w:W-vis, y=f.y*H; const el=document.createElement('div'); el.className='tf'+(f.strong?' strong':''); el.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`; el.innerHTML=f.svg;
    const r={left:Math.max(0,x),right:Math.min(W,x+w),top:y,bottom:y+h}; const hit=boxes.some(b=>b.right>r.left-24&&b.left<r.right+24&&b.bottom>r.top-24&&b.top<r.bottom+24); if(hit||W<900) el.classList.add('gone'); trace.appendChild(el); }); }
new MutationObserver(()=>setTimeout(drawTrace,60)).observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true,childList:false});
DEFS.forEach(d=>{ const r=$(d.root); if(r) new MutationObserver(()=>setTimeout(drawTrace,80)).observe(r,{attributes:true,attributeFilter:['class']}); });
addEventListener('resize',()=>setTimeout(drawTrace,120)); addEventListener('popstate',()=>setTimeout(drawTrace,300)); setTimeout(drawTrace,600);

/* ---------- the visitor duck on game pages (side-duck.js): it peeks in from a clear edge and sometimes points at the
   rules control that fits the moment. Before a strategy game it names Learn how to play; during one, the Rules book.
   It never visits fast-action games in play, and it stays away while the tutorial, a dialog or a text field is open. ---------- */
if(window.ZFSideDuck){
  const BOOK=ZFSideDuck.BOOK, slug=location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0];
  const OWN={'3d-tic-tac-toe':'Three dimensions. Same questionable decisions.','4x4-tic-tac-toe':'Four in a row. One more than I can manage.',
    nim:'Piles of tokens. Piles of decisions.',chomp:'I hear the corner square tastes awful.',domineering:'Vertical or horizontal. I’m mostly round.',pentago:'Place, then twist. Like a duck dance.',
    'gold-coin':'I’d take the gold. I don’t have hands.',sim:'Six dots. Lots of lines. No pressure.',quarto:'You choose their piece. They choose yours. Very polite.',
    notakto:'Everyone plays X. Nobody plays nice.','connect-four':'Four in a row. Ducks only need one.','toot-otto':'TOOT, OTTO. I only spell QUACK.'};
  /* a small, curated pool: a few lines per moment, each said at most once a visit, some with a real link or a "Show me"
     that does the thing. Links are ordinary links; the bubble around them never navigates. */
  /* on a game's pages the duck talks about this game only: no story or About links here (those belong to the homepage) */
  const FUN=[{t:'Hi, I’m Z Forgotten. Pick a mode and play.'}].concat(OWN[slug]?[{t:OWN[slug]}]:[]);
  const learn=()=>{ const b=document.querySelector('section.entry.show .e-learn'); if(b) b.click(); };
  const LEARN=[{t:'New to this one? I can walk you through it.',html:'New to this one? I can walk you through it. <button type="button" class="sdk-act">Show me</button>',acts:[learn]},
    {t:'That little book? It explains the game.',html:`That little ${BOOK} book? It shows how to play, with practice moves.`}];
  const RULES=[{t:'Stuck on a rule? How to play explains it.',html:`Stuck on a rule? The ${BOOK} <b>How to play</b> button explains it. Your game waits.`}];
  // during play the duck only comes in a lull: nothing pressed or typed for 12 s, so it never lands in the middle of a move
  let lastInput=0; ['pointerdown','keydown'].forEach(t=>addEventListener(t,()=>{ lastInput=Date.now(); },{capture:true,passive:true}));
  const shown=id=>{ const e=$(id); return !!(e&&e.classList.contains('show')&&e.offsetParent); };
  // in play the stage is page-wide, so the duck keeps clear of what is on it: the board, the status line, the legend, the move list
  const PLAY='.stage svg,.stage [id$="Board"] *,.stage [class*="leg"],.stage [class*="hist"],.stage [class*="status"],.stage p,.stage h2';
  const PHONE_KEEP='header,a,button,input,select,textarea,label,summary,canvas,table,.seg,.glabel,.board,.gtools,.e-demo,.zp,.zpd,[role=dialog],h1,'+PLAY;
  const duck=ZFSideDuck.start({
    // laptops have quiet margins, so the duck keeps clear of all content. On a phone the small duck also keeps clear of text,
    // controls, the board and the navigation, so it only peeks in beside the gaps between them; its bubble may briefly
    // overlap a line of text at the edge but never a control
    get avoid(){ return innerWidth<700?PHONE_KEEP+',p,li,h2,h3,h4,dd,dt,blockquote,figcaption':'header,h1,h2,h3,p,li,a,button,input,select,textarea,label,summary,img,canvas,table,.seg,.e-ctl,.e-demo,.grp,.board,.gtools,.zp,.zpd,.panel,footer,[role=dialog],'+PLAY; },
    get keep(){ return innerWidth<700?PHONE_KEEP:'header,nav,a,button,input,select,textarea,label,summary,canvas,table,.seg,.e-ctl,.e-demo,.grp,.board,.gtools,.zp,.zpd,.panel,footer,[role=dialog],h1,'+PLAY; },
    paused:()=>document.documentElement.classList.contains('zf-quiet')||!!document.querySelector('#emmSetup.show,#emmGame.show')||!!document.querySelector('#gdrawer.open,.gdialog.open')||/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||''),
    context:()=>{
      if(DEFS.some(d=>shown(d.root))) return innerWidth<700||Date.now()-lastInput<12000?null:{lines:RULES,every:[60000,120000],chance:.3};   // phones: no duck during play
      const entry=document.querySelector('section.entry.show'); if(!entry) return null;
      return {lines:(entry.querySelector('.e-learn')?LEARN:[]).concat(FUN),every:[20000,40000],chance:.5};
    } });
  window.__peekNow=f=>duck.visit(f);
  if(window.ZF) ZF.mascot=duck;
}
/* hints, rule notes and, in practice games, a word on a move: Mansy's duck and its bubble as one unit (hint-duck.js).
   The board keeps its own highlight; the bubble stays clear of it and of the controls, and goes once it has been read
   and a move is made, when it is closed, or when the next hint replaces it. Works with sound muted and reduced motion. */
{
  const COACH_KEY='zf-move-notes';
  const coachOn=()=>{ try{ return localStorage.getItem(COACH_KEY)!=='off'; }catch(e){ return true; } };
  const shownRoot=()=>DEFS.find(x=>{ const e=$(x.root); return e&&e.classList.contains('show'); });
  function coach(html,o){ o=o||{}; if(!window.ZFHintDuck) return false;
    const d=shownRoot(), stage=d&&$(d.root).querySelector('.stage');
    const until=new Promise(r=>{ if(!stage) return; const done=e=>{ if(e.target.closest&&e.target.closest('.gtools,.zf-resbtn,.zm')) return; stage.removeEventListener('pointerdown',done,true); r(); }; stage.addEventListener('pointerdown',done,true); });
    const t=String(html).replace(/<[^>]+>/g,'').replace(/&amp;/g,'&');
    ZFHintDuck.show({t,html,acts:o.acts},{until,keep:o.keep,mood:o.mood}); return true; }
  if(window.ZF){ ZF.coach=coach;
    /* a word on a move: only in practice against the computer, only when an exact solver proves the point, and it can be
       switched off from the bubble itself */
    ZF.moveNote=html=>window.ZFCoach?ZFCoach.report({kind:'mistake',exact:true,html}):(coachOn()&&coach(html)); }
}
})();
