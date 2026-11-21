/* duck.js: shared pieces for the duck arcade (Save the Duckie, One More Bridge, ...).
   - one rubber-duck drawing, described once as shapes and rendered to canvas (play) and SVG (cards, lessons)
   - saved progress, colours that follow the invert state, a pause hook for rules / settings / hidden tabs
   - a campaign screen: chapters, level buttons, medals, locked levels, and one quick result card */
(function(){
const LS=(k,d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } };
const SV=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const $=(t,c,h)=>{ const e=document.createElement(t); if(c) e.className=c; if(h!==undefined) e.innerHTML=h; return e; };
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- colours: read from the page so both invert states work ---------- */
let palCache=null; function pal(){ if(palCache) return palCache; const cs=getComputedStyle(document.body); const v=n=>cs.getPropertyValue(n).trim(); palCache={ bg:v('--bg')||'#0a0a0a', fg:v('--fg')||'#f3f2ee', surf:v('--surf')||'#161616', surf2:v('--surf2')||'#1c1c1c', surf3:v('--surf3')||'#262626', g3:v('--g3')||'#333', g4:v('--g4')||'#444', g5:v('--g5')||'#777', g6:v('--g6')||'#999' }; return palCache; }
document.addEventListener('zf-theme',()=>{ palCache=null; });
new MutationObserver(()=>{ palCache=null; }).observe(document.documentElement,{attributes:true,attributeFilter:['data-inv','data-tone']});
const DUCKC={ body:'#fffdf6', wing:'#ebe6d4', beak:'#a19c8a', ink:'#141412', gold:'#c9a63f', goldEdge:'#8d742a', veh:'#8d8c85', veh2:'#6c6b65', vehInk:'#2c2b28' };

/* ---------- the duck: the two shared rubber-duck drawings, /arcade-duck-side.svg (facing right) and /arcade-duck-top.svg (facing up) ----------
   Every duck in Save the Duckie, One More Bridge and Take Two comes from those two files: canvas play reads their paths once
   (parsed, not redrawn by hand), and SVG scenes and cards point at the same files with <use>, so nothing is drawn twice.
   Each view maps its drawing into the small units the games already use: side = feet at (0,0) and about 68 units wide,
   top = centred on the whole duck and about 70 units long, so callers keep their positions, scales and hitboxes.
   Pose knobs are applied per named group of the file: `eye(s)` blink, widen and look; `wing(s)` lift. */
const ART={
 side:{url:'/arcade-duck-side.svg',k:.27,ox:167.5,oy:262,groups:['body','belly-shade','wing','bill','eye']},
 top:{url:'/arcade-duck-top.svg',k:.28,ox:180,oy:147.5,groups:['body','belly-shade','wing-left','wing-right','neck-shadow','bill','head','crown','eyes']}};
/* per-group pose -> [pivotX, pivotY, dx, dy, rotateDeg, scaleX, scaleY] in the file's own units, or null for "as drawn" */
function poseOf(view,g,o){ if(!o) return null; const w=o.wing||0, s=o.surprise||0;
  if(g==='eye'||g==='eyes'){ if(!o.blink&&!s&&!(o.look&&view==='side')) return null; const lx=view==='side'&&o.look?o.look.x*5:0, ly=view==='side'&&o.look?o.look.y*4:0;
    const sc=o.blink?1:1+(view==='side'?.45:.2)*s, sy=o.blink?.14:(view==='side'?sc:1+.45*s); return view==='side'?[223,100,lx,ly,0,sc,sy]:[180,79,0,0,0,1,sy]; }
  if(!w) return null;
  if(g==='wing') return [104,200,0,-6*w,-22*w,1,1];
  if(g==='wing-left') return [127,150,0,0,24*w,1,1];
  if(g==='wing-right') return [233,150,0,0,-24*w,1,1];
  return null; }
const posed=o=>!!(o&&(o.blink||o.wing||o.surprise||o.look));
/* canvas: parse each file once into Path2D parts tagged with their named group; until it arrives the duck is simply not drawn */
function parseArt(txt){ const doc=new DOMParser().parseFromString(txt,'image/svg+xml'), root=doc.querySelector('#duck'), parts=[];
  const walk=(el,inh,grp)=>{ const a=n=>el.getAttribute(n), st={fill:a('fill')||inh.fill, stroke:a('stroke')||inh.stroke, sw:a('stroke-width')?+a('stroke-width'):inh.sw};
    const tag=el.tagName; let p=null;
    if(tag==='path') p=new Path2D(a('d'));
    else if(tag==='ellipse'||tag==='circle'){ p=new Path2D(); const rx=+(a('rx')||a('r')), ry=+(a('ry')||a('r')); let rot=0; const m=/rotate\(\s*([-\d.]+)/.exec(a('transform')||''); if(m) rot=+m[1]*Math.PI/180; p.ellipse(+a('cx'),+a('cy'),rx,ry,rot,0,Math.PI*2); }
    if(p) parts.push({p,g:grp,fill:st.fill&&st.fill!=='none'?st.fill:null,stroke:st.stroke&&st.stroke!=='none'?st.stroke:null,sw:st.sw});
    for(const c of el.children) walk(c,st,grp); };
  const base={fill:'none',stroke:root.getAttribute('stroke'),sw:1};
  for(const c of root.children) walk(c,base,c.id);
  return parts; }
const artReady=Promise.all(Object.keys(ART).map(v=>fetch(ART[v].url).then(r=>r.text()).then(t=>{ ART[v].parts=parseArt(t); }))).catch(()=>{});
function paintArt(ctx,v,o){ const A=ART[v]; if(!A.parts) return; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.scale(A.k,A.k); ctx.translate(-A.ox,-A.oy);
  let cur=null, T=null; for(const q of A.parts){ if(q.g!==cur){ if(T) ctx.restore(); cur=q.g; T=poseOf(v,cur,o); if(T){ ctx.save(); ctx.translate(T[0]+T[2],T[1]+T[3]); ctx.rotate(T[4]*Math.PI/180); ctx.scale(T[5],T[6]); ctx.translate(-T[0],-T[1]); } }
    if(q.fill){ ctx.fillStyle=q.fill; ctx.fill(q.p); } if(q.stroke){ ctx.strokeStyle=q.stroke; ctx.lineWidth=q.sw; ctx.stroke(q.p); } }
  if(T) ctx.restore(); }
/* canvas: x,y = the feet/waterline (side) or the middle of the duck (from above); s = pixels per unit.
   o = {face:'left'|'right'|'up'|'down', sx, sy, rot, alpha, look, blink, wing, surprise}.  From above, 'down' is the same
   top view turned round, and `rot` turns it further (0 = facing up, clockwise). */
function drawDuckView(ctx,x,y,s,o){ o=o||{}; const f=o.face||'right'; ctx.save(); ctx.translate(x,y); if(o.rot) ctx.rotate(o.rot); ctx.scale(s*(o.sx||1),s*(o.sy||1)); if(o.alpha!==undefined) ctx.globalAlpha=o.alpha;
  if(f==='left'||f==='right'){ if(f==='left') ctx.scale(-1,1); paintArt(ctx,'side',o); } else { if(f==='down') ctx.rotate(Math.PI); paintArt(ctx,'top',o); }
  ctx.restore(); }
const drawDuck=(ctx,x,y,s,o)=>{ o=o||{}; drawDuckView(ctx,x,y,s,Object.assign({},o,{face:(o.dir||1)<0?'left':'right'})); };
const drawDuckTop=(ctx,x,y,s,o)=>{ o=o||{}; drawDuckView(ctx,x,y,s,Object.assign({},o,{face:o.face==='down'?'down':'up'})); };
/* svg: the same file referenced with <use> (so no ids are copied into the page); posed ducks reference each named group
   separately and wrap the ones that move. The wrapper carries the file's outline settings, which a referenced part does not inherit. */
function artSvg(v,o){ const A=ART[v]; const inner=posed(o)?A.groups.map(g=>{ const u=`<use href="${A.url}#${g}"/>`, T=poseOf(v,g,o); if(!T) return u;
    return `<g transform="translate(${(T[0]+T[2]).toFixed(1)} ${(T[1]+T[3]).toFixed(1)}) rotate(${T[4].toFixed(1)}) scale(${T[5].toFixed(3)} ${T[6].toFixed(3)}) translate(${-T[0]} ${-T[1]})">${u}</g>`; }).join('')
    :`<use href="${A.url}#duck"/>`;
  return `<g transform="scale(${A.k}) translate(${-A.ox} ${-A.oy})" fill="none" stroke="#24231F" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`; }
/* a posed side-view duck: Take Two's two characters (look toward the bank/opponent, a wing-raise for "reaching",
   surprise for the end of an exchange). x,y = feet; dir -1 mirrors it to face left. */
function duckActorSvg(x,y,s,dir,o,cls,extra){ return `<g class="${cls||''}" ${extra||''} transform="translate(${x} ${y}) scale(${(dir||1)*s} ${s})">${artSvg('side',o)}</g>`; }
function duckSvg(x,y,s,dir,cls,extra){ return duckActorSvg(x,y,s,dir,null,cls,extra); }
function duckTopSvg(x,y,s,face,cls){ return `<g class="${cls||''}" transform="translate(${x} ${y}) scale(${s})${face==='down'?' rotate(180)':''}">${artSvg('top')}</g>`; }
/* a small standalone duck marker (map's current-stop badge) -- self-contained, no outer <svg> needed from the caller */
function duckTopSvgStandalone(){ return `<svg viewBox="-26 -26 52 52">${duckTopSvg(0,0,.68,'up')}</svg>`; }
function drawCoin(ctx,x,y,r){ ctx.save(); ctx.fillStyle=DUCKC.gold; ctx.strokeStyle=DUCKC.goldEdge; ctx.lineWidth=Math.max(1.5,r*.12); ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(x,y,r*.68,0,7); ctx.stroke(); ctx.fillStyle=DUCKC.goldEdge; ctx.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.16:r*.36; ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } ctx.fill(); ctx.restore(); }

/* ---------- pause: rules, settings, another tab, or the game screen not being shown ---------- */
const pauseState={ shell:false }; window.addEventListener('zf-pause',()=>{ pauseState.shell=true; window.dispatchEvent(new Event('zd-pause')); }); window.addEventListener('zf-resume',()=>{ pauseState.shell=false; window.dispatchEvent(new Event('zd-pause')); });
const isPaused=host=>{ if(document.hidden||!host.isConnected) return true; if(host.closest&&host.closest('.zd[data-paused="1"]')) return true; const dr=host.closest&&host.closest('#gdrawer'); if(dr) return !dr.classList.contains('open')||host.offsetParent===null; return pauseState.shell||host.offsetParent===null; };   // a lesson inside the rules drawer plays while the drawer is open; the live game waits
/* a fixed-step loop that stops by itself when the game is not being looked at */
function loop(host,step,draw,dt){ dt=dt||1/60; let acc=0,last=0,raf=0,dead=false,wasPaused=false; const tick=now=>{ if(dead) return; raf=requestAnimationFrame(tick); const p=isPaused(host); if(p){ if(!wasPaused){ wasPaused=true; api.onPause&&api.onPause(true); } last=0; return; } if(wasPaused){ wasPaused=false; api.onPause&&api.onPause(false); last=0; } if(!last) last=now; acc+=Math.min(.1,(now-last)/1000); last=now; let n=0; while(acc>=dt&&n<8){ step(dt); acc-=dt; n++; } draw(acc/dt); };
  const api={ stop(){ dead=true; cancelAnimationFrame(raf); }, onPause:null }; raf=requestAnimationFrame(tick); return api; }

/* ---------- css ---------- */
const CSS=`
.zd{width:100%;display:flex;flex-direction:column;align-items:center;gap:16px}
.zd *{box-sizing:border-box}
.zd .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.zd-i{display:inline-flex;width:15px;height:15px;color:var(--g5);flex:none;position:relative}
.zd-ic{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.zd-i.on{color:var(--fg)}.zd-i.gold.on{color:#c9a63f}
.zd-hero{width:100%;max-width:720px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
.zd-hero h3{font:800 clamp(24px,4vw,34px)/1.1 var(--font-sans);letter-spacing:-.025em;margin:0;color:var(--fg)}
.zd-hero p{font:500 15px/1.4 var(--font-sans);color:var(--g6);margin:0}
.zd-save{font:500 12.5px var(--font-sans);color:var(--g5)}.zd-save[data-ok="0"]{color:var(--fg)}
.zd-menu{width:100%;max-width:720px;text-align:center}
.zd-menu summary{display:inline-block;cursor:pointer;font:600 13px var(--font-sans);color:var(--g6);padding:6px 12px;border-radius:999px;list-style:none}
.zd-menu summary::-webkit-details-marker{display:none}.zd-menu summary:hover{background:var(--surf2);color:var(--fg)}
.zd-menubody{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px}
.zd-menubody .zd-note{width:100%}
.zd-tabs{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%;max-width:820px}
.zd-tab{flex:1 1 118px;max-width:160px;border:none;border-radius:16px;background:var(--surf2);color:var(--g6);padding:10px 8px 9px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:background .15s,color .15s}
.zd-tab .art{display:block;width:52px;height:32px;color:currentColor}.zd-tab .art svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.zd-tab b{font:700 13px/1.15 var(--font-sans)}.zd-tab small{font:600 11px var(--font-sans);opacity:.75}
.zd-tab:hover{background:var(--surf3);color:var(--fg)}.zd-tab[aria-selected="true"]{background:var(--fg);color:var(--bg)}.zd-tab:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.zd-blurb{font:500 14px/1.45 var(--font-sans);color:var(--g6);text-align:center;max-width:56ch;margin:0}
/* the journey map (Save the Duckie, One More Bridge): one measured layout for the route, the stops, the region
   signs and the scenery, so the route always passes through the stops it connects (see journeyMap below) */
.zd-jm{position:relative;width:100%;max-width:720px;margin:0 auto}
.zd-jm-svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
.zd-jm-svg .pnl{fill:var(--surf2)}
.zd-jm-svg .rt{fill:none;stroke:var(--g5);stroke-width:3;stroke-linecap:round;stroke-dasharray:1 9}
.zd-jm-svg .rt.on{stroke:var(--fg);stroke-opacity:.6;stroke-dasharray:none}
.zd-jm-svg .bd{fill:var(--fg);fill-opacity:.07}.zd-jm-svg .bd2{fill:var(--fg);fill-opacity:.13}
.zd-jm-svg .ln{fill:none;stroke:var(--fg);stroke-opacity:.28;stroke-width:1.6;stroke-linecap:round}
.zd-jm-svg .ln.dash{stroke-dasharray:7 7}
.zd-jm-svg .ink{fill:none;stroke:var(--fg);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.zd-jm-svg .fl{fill:var(--fg)}.zd-jm-svg .bg{fill:var(--bg)}.zd-jm-svg .sf{fill:var(--surf3)}.zd-jm-svg .gold{fill:#c9a63f}
.zd-jm-svg .mk{fill:none;stroke:var(--g5);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.zd-jm-svg .mkf{fill:var(--g5);fill-opacity:.55}
.zd-jm-head{position:absolute;display:flex;gap:12px;align-items:flex-start}
.zd-jm-head .art{width:44px;height:30px;color:var(--g5);flex:none;margin-top:2px}.zd-jm-head .art svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.zd-jm-head .tx{display:flex;flex-direction:column;gap:3px;min-width:0}
.zd-jm-head .rg{font:600 11px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g6)}
.zd-jm-head b{font:800 17px/1.2 var(--font-sans);color:var(--fg)}
.zd-jm-head p{margin:0;font:500 13px/1.4 var(--font-sans);color:var(--g6)}
.zd-jm-head .zd-jm-pg{display:flex;align-items:center;gap:7px;font:600 12px var(--font-sans);color:var(--g6)}
.zd-jm-head .zd-jm-pg i{width:7px;height:7px;border-radius:50%;background:var(--g4);display:block}.zd-jm-head .zd-jm-pg i.on{background:var(--fg)}.zd-jm-head .zd-jm-pg span{display:flex;gap:3px}
.zd-jm-node{position:absolute;width:0;height:0}
.zd-jm-dot{all:unset;box-sizing:border-box;position:absolute;left:0;top:0;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:var(--surf2);border:2px solid var(--g5);color:var(--fg);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;transition:transform .15s}
.zd-jm-dot .pv{position:absolute;inset:0;opacity:.8}.zd-jm-dot .pv svg{width:100%;height:100%}
.zd-jm-dot .num{position:relative;z-index:1;min-width:24px;height:24px;padding:0 4px;border-radius:12px;background:var(--bg);color:var(--fg);display:flex;align-items:center;justify-content:center;font:800 12px var(--font-sans)}
.zd-jm-dot:hover:not(:disabled){transform:scale(1.06)}.zd-jm-dot:focus-visible{outline:3px solid var(--fg);outline-offset:3px}
.zd-jm-node.done .zd-jm-dot{border-color:var(--fg);background:var(--surf3)}.zd-jm-node.done .zd-jm-dot .pv{opacity:.45}
.zd-jm-node.current .zd-jm-dot{width:64px;height:64px;margin:-32px 0 0 -32px;border:3px solid var(--fg);box-shadow:0 0 0 4px var(--bg),0 0 0 6px var(--fg)}
.zd-jm-node.locked .zd-jm-dot{border:2px dashed var(--g4);cursor:default;background:var(--bg)}.zd-jm-node.locked .zd-jm-dot .pv{opacity:.14}
.zd-jm-node.sel:not(.current) .zd-jm-dot{border-width:3px;border-color:var(--fg)}
.zd-jm-badge{position:absolute;right:-3px;bottom:-3px;width:22px;height:22px;border-radius:50%;background:var(--fg);color:var(--bg);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px var(--bg);z-index:2;pointer-events:none}
.zd-jm-badge .zd-ic{width:14px;height:14px;stroke-width:2.4}
.zd-jm-node.locked .zd-jm-badge{background:var(--surf3);color:var(--g6)}
.zd-jm-node.current .zd-jm-badge{right:-1px;bottom:-1px}
.zd-jm-lock{position:relative;z-index:1;color:var(--g5)}.zd-jm-lock .zd-ic{width:20px;height:20px}
.zd-jm-lab{position:absolute;top:0;transform:translateY(-50%);display:flex;flex-direction:column;gap:2px}
.zd-jm-lab.r{left:40px;align-items:flex-start;text-align:left}.zd-jm-lab.l{right:40px;align-items:flex-end;text-align:right}
.zd-jm-node.current .zd-jm-lab.r{left:44px}.zd-jm-node.current .zd-jm-lab.l{right:44px}
.zd-jm-lab .nm{font:700 14px/1.25 var(--font-sans);color:var(--fg)}
.zd-jm-lab .nm span{font:600 12px var(--font-mono);color:var(--g6);margin-right:6px}
.zd-jm-lab .st{font:700 12px var(--font-sans);letter-spacing:.01em;color:var(--g6);display:inline-flex;align-items:center;gap:5px}
.zd-jm-node.current .zd-jm-lab .st{color:var(--fg)}
.zd-jm-node.locked .zd-jm-lab .nm,.zd-jm-node.locked .zd-jm-lab .st{color:var(--g5)}
.zd-jm-lab .tg{margin:3px 0 0;font:600 11.5px/1.35 var(--font-sans);color:var(--g6)}
.zd-jm-lab .gl{margin:2px 0 0;font:500 12.5px/1.4 var(--font-sans);color:var(--g6)}
.zd-jm-lab .zd-btn{margin-top:7px;min-height:40px;padding:0 20px}
.zd-jm-lab .meds{display:flex;gap:5px;margin-top:3px}
.zd-jm-duck{position:absolute;width:40px;height:40px;margin:0 0 0 -20px;pointer-events:none;animation:zdbob 1.6s ease-in-out infinite}
.zd-jm-duck svg{width:100%;height:100%;overflow:visible}
@keyframes zdbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@media (prefers-reduced-motion:reduce){.zd-jm-duck{animation:none}}
.zd-jm-home{position:absolute;display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;transform:translateX(-50%)}
.zd-jm-home b{font:800 16px var(--font-sans);color:var(--fg)}.zd-jm-home small{font:600 12px var(--font-sans);color:var(--g6)}
.stage.zd-host>.gtools{position:relative;top:auto}
.zd-map-mini{display:flex;align-items:center;gap:8px;width:100%;margin:2px 0 6px}
.zd-map-mini-dot{width:26px;height:26px;border-radius:50%;background:var(--surf3);color:var(--g6);display:flex;align-items:center;justify-content:center;font:700 11px var(--font-sans);flex:none}
.zd-map-mini-dot.done{background:var(--fg);color:var(--bg)}
.zd-map-mini-track{position:relative;flex:1 1 auto;height:2px;background:repeating-linear-gradient(to right,var(--g4) 0 6px,transparent 6px 12px)}
.zd-map-mini-duck{position:absolute;top:50%;left:0;width:22px;height:22px;transform:translate(0,-50%);transition:left .7s cubic-bezier(.3,.8,.4,1)}
.zd-map-mini-duck.go{left:calc(100% - 22px)}
@media (prefers-reduced-motion:reduce){.zd-map-mini-duck{transition:none}.zd-map-mini-duck.go{left:calc(100% - 22px)}}
.zd-map-mini-label{margin:0 0 8px;font:600 12.5px var(--font-sans);color:var(--g6)}
.zd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px;width:100%;max-width:780px}
.zd-lv{position:relative;min-height:92px;padding:11px 8px 9px;border:none;border-radius:16px;background:var(--surf2);color:var(--fg);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;transition:background .15s,transform .15s}
.zd-lv .n{font:800 20px var(--font-sans)}.zd-lv small{font:600 11.5px/1.15 var(--font-sans);color:var(--g6);max-width:13ch;text-align:center}
.zd-lv .ics{display:flex;gap:5px;min-height:15px;flex-wrap:wrap;justify-content:center}
.zd-lv:hover{background:var(--surf3);transform:translateY(-2px)}.zd-lv:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.zd-lv.done{background:var(--surf3)}.zd-lv.sel{box-shadow:inset 0 0 0 2px var(--fg)}.zd-lv.rec:not(.sel){box-shadow:inset 0 0 0 2px var(--g5)}
.zd-lv .tagx{position:absolute;top:7px;left:8px;font:700 9.5px var(--font-sans);letter-spacing:.06em;text-transform:uppercase;background:var(--fg);color:var(--bg);padding:2px 6px;border-radius:999px}
.zd-lv .lockx{position:absolute;top:7px;right:8px;width:14px;height:14px;color:var(--g5)}.zd-lv .lockx svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.7}
.zd-lv.adv{opacity:.78}
.zd-detail{width:100%;max-width:780px;background:var(--surf2);border-radius:20px;padding:16px;display:flex;gap:18px;align-items:stretch;flex-wrap:wrap}
.zd-detail .pv{flex:1 1 200px;display:flex;align-items:center;justify-content:center;min-height:90px;background:var(--surf);border-radius:14px;padding:10px;color:var(--fg)}
.zd-detail .pv svg{width:100%;max-height:120px}.zd-prev .rd{fill:var(--g3)}.zd-prev .sf{fill:var(--surf3)}.zd-prev .wt{fill:var(--g4)}.zd-prev .pd{fill:var(--g5)}.zd-prev .bd{stroke:var(--g5);stroke-width:1.6;stroke-dasharray:3 3;fill:none}.zd-prev .pl{fill:none;stroke:var(--fg);stroke-opacity:.5;stroke-width:1.2}.zd-prev .dm{stroke:#fff;stroke-opacity:.5;stroke-dasharray:6 5;stroke-width:1.2}
.zd-detail .tx{flex:2 1 260px;display:flex;flex-direction:column;gap:9px;align-items:flex-start}
.zd-detail h4{margin:0;font:800 20px var(--font-sans);letter-spacing:-.02em;color:var(--fg)}.zd-detail p{margin:0;font:500 14px/1.45 var(--font-sans);color:var(--g6)}
.zd-tags{font:700 12px var(--font-sans)!important;letter-spacing:.01em;color:var(--fg)!important;text-transform:uppercase;opacity:.7}
.zd-obj{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;width:100%}
.zd-obj li{display:flex;align-items:center;gap:9px;font:600 13.5px var(--font-sans);color:var(--g5)}.zd-obj li.on{color:var(--fg)}.zd-obj li em{margin-left:auto;font:600 11.5px var(--font-sans);font-style:normal;color:var(--g5)}.zd-obj li.on em{color:var(--fg)}
.zd-obj li .zd-i{color:inherit}.zd-obj li .zd-i.gold{color:#c9a63f}
.zd-best{font:500 13px var(--font-sans);color:var(--g6)}.zd-best b{color:var(--fg)}
.zd-endless{width:100%;max-width:780px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}.zd-endless h3{margin:0;font:800 20px var(--font-sans);color:var(--fg)}.zd-endless p{margin:0;font:500 14px var(--font-sans);color:var(--g6)}.zd-endless.locked{opacity:.6}
.zd-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%;max-width:820px}
.zd-bar .ttl{font:800 19px var(--font-sans);letter-spacing:-.02em;color:var(--fg);margin-right:auto;padding-left:4px}
.zd-chips{display:flex;gap:6px;align-items:center}
.zd-chip{padding:5px 11px;border-radius:999px;background:var(--surf3);font:600 12.5px var(--font-sans);color:var(--fg)}.zd-chip.mono{font-family:var(--font-mono)}
.zd-btn{min-height:42px;padding:0 16px;border:none;border-radius:12px;background:var(--surf3);color:var(--fg);font:700 14.5px var(--font-sans);cursor:pointer;display:inline-flex;align-items:center;gap:7px}
.zd-btn .zd-i{color:currentColor}.zd-btn.ico{padding:0 13px}
.zd-btn:hover{background:var(--g4)}.zd-btn:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.zd-btn.pri{background:var(--fg);color:var(--bg)}.zd-btn.pri:hover{opacity:.9}.zd-btn:disabled{opacity:.45;cursor:not-allowed}
@media (max-width:520px){.zd-btn.ico .lb{display:none}.zd-bar{flex-wrap:nowrap;gap:6px}.zd-bar .ttl{font-size:15px;flex:1 1 0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.zd-bar .zd-chip:not(.mono){display:none}.zd-bar .zd-btn{padding:0 12px}}
.zd-stage{position:relative;display:flex;justify-content:center;width:100%}
.zd-stage canvas{display:block;border-radius:18px;touch-action:none;outline:none;background:var(--bg)}
.zd-stage canvas:focus-visible{box-shadow:0 0 0 3px var(--fg)}
.zd-msg{font:500 15px/1.5 var(--font-sans);color:var(--fg);text-align:center;max-width:56ch;min-height:2.9em}
.zd-msg b{font-weight:800}
.zd-over{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.28);border-radius:18px;z-index:3}
.zd-over[hidden]{display:none}
.zd-card{background:var(--bg);border:2px solid var(--fg);border-radius:20px;padding:20px 24px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.35);width:min(92%,400px);animation:zdpop .25s cubic-bezier(.3,1.4,.5,1)}
.zd-card.small{width:min(90%,280px)}
@keyframes zdpop{from{transform:scale(.9);opacity:0}to{transform:none;opacity:1}}
.zd-card h4{font:800 26px var(--font-sans);margin:0 0 6px;letter-spacing:-.02em;color:var(--fg)}
.zd-card p{font:500 14px/1.45 var(--font-sans);color:var(--g6);margin:0 0 12px}
.zd-card .zd-obj{margin:0 0 14px;text-align:left}
.zd-pb{display:inline-block;margin:0 0 8px;padding:3px 11px;border-radius:999px;background:var(--fg);color:var(--bg);font:700 12px var(--font-sans)}.zd-pb.soft{background:var(--surf3);color:var(--fg)}
.zd-warn{color:var(--fg)!important}
.zd-acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.zd-pad{display:none;grid-template-columns:repeat(3,54px);grid-template-rows:repeat(2,54px);gap:6px}
.zd-pad button{border:none;border-radius:14px;background:var(--surf3);color:var(--fg);font:800 20px var(--font-sans)}
@media (pointer:coarse){.zd-pad.show{display:grid}}
.zd-note{font:500 12.5px var(--font-sans);color:var(--g5);text-align:center}
`;
const st=$('style'); st.id='zd-css'; st.textContent=CSS; document.head.appendChild(st);

/* ---------- the campaign screen ----------
   A Continue button, chapter tabs, level tiles that show only the goals a level really has, a level panel, one compact play bar, and a result card.
   Progress is saved in this browser the moment a level ends. Nothing here needs an account. */
const ICONS={
 check:'<svg viewBox="0 0 16 16" class="zd-ic"><path d="M3 8.6l3.1 3L13 4.6"/></svg>',
 shield:'<svg viewBox="0 0 16 16" class="zd-ic"><path d="M8 1.8l5 1.8v4c0 3-2.2 5-5 6.4C5.2 12.6 3 10.6 3 7.6v-4z"/></svg>',
 coin:'<svg viewBox="0 0 16 16" class="zd-ic"><circle cx="8" cy="8" r="5.6"/><circle cx="8" cy="8" r="2.4"/></svg>',
 time:'<svg viewBox="0 0 16 16" class="zd-ic"><circle cx="8" cy="9" r="5.2"/><path d="M8 9V6M6.2 1.8h3.6M12 4l1-1"/></svg>',
 duck:'<svg viewBox="0 0 16 16" class="zd-ic"><path d="M2.5 11c0-2.4 2-3.6 4.2-3.6h3.5c1.2 0 2 .6 2.9 1.4-.2 2.2-2 3.7-4.6 3.7-3.6 0-6-.4-6-1.5z"/><circle cx="10.6" cy="4.8" r="2.4"/><path d="M12.8 5l2 .5-2 .8"/></svg>',
 target:'<svg viewBox="0 0 16 16" class="zd-ic"><circle cx="8" cy="8" r="5.6"/><circle cx="8" cy="8" r="2.2"/><path d="M8 0.8v2.4M8 12.8v2.4M0.8 8h2.4M12.8 8h2.4"/></svg>',
 wood:'<svg viewBox="0 0 16 16" class="zd-ic"><rect x="1.6" y="3" width="12.8" height="4" rx="1.6"/><rect x="1.6" y="9" width="12.8" height="4" rx="1.6"/></svg>',
 lock:'<svg viewBox="0 0 16 16" class="zd-ic"><rect x="3.4" y="7" width="9.2" height="6.6" rx="1.6"/><path d="M5.4 7V5a2.6 2.6 0 015.2 0v2"/></svg>',
 pause:'<svg viewBox="0 0 16 16" class="zd-ic"><path d="M5 3.4v9.2M11 3.4v9.2"/></svg>',
 retry:'<svg viewBox="0 0 16 16" class="zd-ic"><path d="M13 8a5 5 0 11-1.6-3.7M13 2.2v3h-3"/></svg>'};
const ico=(name,cls)=>`<span class="zd-i ${cls||''}" aria-hidden="true">${ICONS[name]||''}</span>`;

/* ---------- saved progress: completed levels, goals earned, best times per difficulty, last level, tutorial, preferences ---------- */
function store(id){ const key='zd-'+id; let working=true;
  try{ const k='zd-probe'; localStorage.setItem(k,'1'); working=localStorage.getItem(k)==='1'; localStorage.removeItem(k); }catch(e){ working=false; }
  const norm=o=>{ o=(o&&typeof o==='object')?o:{}; const st={ v:2, done:{}, best:{}, last:o.last&&typeof o.last==='object'?o.last:{}, sel:o.sel||null, tutorial:!!o.tutorial, prefs:o.prefs&&typeof o.prefs==='object'?o.prefs:{}, settings:o.settings||{} };
    if(o.best&&typeof o.best==='object') Object.keys(o.best).forEach(k=>{ const v=+o.best[k]; if(isFinite(v)) st.best[k]=v; });
    if(o.done&&typeof o.done==='object') Object.keys(o.done).forEach(k=>{ const r=o.done[k]; if(!r||typeof r!=='object') return; const med={}; Object.keys(r.medals||{}).forEach(m=>{ if(r.medals[m]) med[m]=true; }); const bests={}; Object.keys(r.bests||{}).forEach(d=>{ const v=+r.bests[d]; if(isFinite(v)&&v>0) bests[d]=v; }); if(!Object.keys(bests).length&&isFinite(+r.time)&&+r.time>0&&+r.time<1e8) bests.standard=+r.time; st.done[k]={ medals:med, bests, tries:Math.max(1,+r.tries||1), at:+r.at||0 }; });
    return st; };
  const st=norm(LS(key,null));
  const api={ st, working:()=>working, done:lv=>st.done[lv],
    save(){ try{ localStorage.setItem(key,JSON.stringify(st)); working=localStorage.getItem(key)!==null; }catch(e){ working=false; } return working; },
    /* the level result is written before anything else happens */
    mark(lv,res,dk){ dk=dk||'standard'; const prev=st.done[lv]; const before=prev&&prev.bests[dk]; const o=prev||{medals:{},bests:{},tries:0,at:Date.now()}; const fresh=[]; Object.keys(res.medals||{}).forEach(k=>{ if(res.medals[k]&&!o.medals[k]){ o.medals[k]=true; fresh.push(k); } });
      if(isFinite(res.time)&&res.time>0) o.bests[dk]=Math.min(o.bests[dk]||1e9,res.time); o.tries++; st.done[lv]=o; st.last={level:lv,mode:'campaign'}; st.sel=lv; api.save();
      return { first:!prev, pb:before!==undefined&&res.time<before, before, fresh, saved:working }; },
    setSel(lv){ st.sel=lv; api.save(); }, setLast(lv,mode){ st.last={level:lv,mode:mode||'campaign'}; api.save(); },
    reset(){ st.done={}; st.best={}; st.last={}; st.sel=null; st.tutorial=false; api.save(); },
    exportJSON(){ return JSON.stringify({ app:'zfgames', game:id, v:2, exported:new Date().toISOString(), data:st },null,2); },
    /* checks the file, keeps only levels this game has, and merges: nothing already earned is ever lost */
    importJSON(text,valid){ let j; try{ j=JSON.parse(text); }catch(e){ return {ok:false,msg:'That file is not valid JSON.'}; }
      if(!j||j.app!=='zfgames'||typeof j.data!=='object') return {ok:false,msg:'That file is not a Z Forgotten Games progress file.'}; if(j.game!==id) return {ok:false,msg:'That progress file belongs to a different game.'};
      const inc=norm(j.data); let added=0; Object.keys(inc.done).forEach(k=>{ if(valid&&!valid.includes(k)) return; const a=st.done[k], b=inc.done[k]; if(!a){ st.done[k]=b; added++; return; } Object.keys(b.medals).forEach(m=>{ a.medals[m]=true; }); Object.keys(b.bests).forEach(d=>{ a.bests[d]=Math.min(a.bests[d]||1e9,b.bests[d]); }); a.tries=Math.max(a.tries,b.tries); });
      Object.keys(inc.best).forEach(k=>{ st.best[k]=Math.max(st.best[k]||0,inc.best[k]); }); st.tutorial=st.tutorial||inc.tutorial; if(!st.last.level&&inc.last.level) st.last=inc.last; api.save(); return {ok:true,added,msg:added?`Imported. ${added} new level${added===1?'':'s'} added; everything you already had was kept.`:'Imported. Nothing new to add; everything you already had was kept.'}; } };
  return api; }

function campaign(mount,cfg){ const S=store(cfg.id); mount.innerHTML=''; const root=$('div','zd'); mount.appendChild(root); let ctrl=null, cur=null, chTab=0, msgTimer=0, mapCtl=null; { const stg=mount.closest&&mount.closest('.stage'); if(stg&&cfg.map) stg.classList.add('zd-host'); }
  const all=[]; cfg.chapters.forEach((c,ci)=>c.levels.forEach((l,li)=>all.push({...l,ch:ci,i:li,chapter:c}))); const idx=lv=>all.findIndex(x=>x.id===lv.id), byId=id=>all.find(x=>x.id===id);
  const validIds=all.map(l=>l.id), dk=()=>cfg.diffKey?cfg.diffKey():'standard', has=(m,lv)=>!m.has||m.has(lv), medalsOf=lv=>cfg.medalDefs.filter(m=>has(m,lv)), tag=lv=>`${lv.ch+1}–${lv.i+1}`;
  const open=()=>!!(cfg.isOpen&&cfg.isOpen());
  const isLocked=l=>{ const i=idx(l); return !open()&&i>0&&!S.done(l.id)&&!S.done(all[i-1].id); };
  const cleanup=()=>{ if(ctrl&&ctrl.destroy) ctrl.destroy(); ctrl=null; root.dataset.paused=''; };
  /* the level to offer when someone just wants to play: the level they were on, or the next one they have not finished */
  function resume(){ const li=all.findIndex(l=>l.id===(S.st.last&&S.st.last.level)); if(li>=0&&!S.done(all[li].id)) return all[li]; for(let i=li>=0?li+1:0;i<all.length;i++) if(!S.done(all[i].id)) return all[i]; for(let i=0;i<all.length;i++) if(!S.done(all[i].id)) return all[i]; return all[li>=0?li:0]; }
  const doneCount=()=>all.filter(l=>S.done(l.id)).length;
  const say=(el,h)=>{ el.innerHTML=h; };
  function objectiveRow(lv,rec,extra){ return medalsOf(lv).map(m=>{ const on=!!(rec&&rec.medals&&rec.medals[m.id]); return `<li class="${on?'on':''}">${ico(m.icon||'check',m.gold&&on?'gold':'')}<span>${m.label}</span><em>${on?'earned':'not yet'}</em></li>`; }).join(''); }
  /* the campaign screen lives inside #gxBoard, below the game shell's own sticky settings/rules toolbar (.gtools) --
     window.gameScrollTo only clears the page header, so scrolling straight to it here would leave the title or the
     play bar sitting right under that toolbar. Clear both. */
  function scrollClear(el){ if(!el) return; const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hh=(document.querySelector('header')||{offsetHeight:0}).offsetHeight; const gt=document.querySelector('#gxGame .gtools');
    const gh=(gt&&gt.offsetParent&&getComputedStyle(gt).position==='sticky')?gt.getBoundingClientRect().height:0; const y=Math.max(0,el.getBoundingClientRect().top+scrollY-hh-gh-18);
    window.scrollTo({top:y,behavior:reduce?'auto':'smooth'}); }

  /* ---------- the journey map ----------
     One coordinate system for everything: the map measures its own width and every label, then places the region
     signs, stops, scenery bands, route and home in the same pixel space (the route is an SVG exactly as large as the map,
     drawn through the stops' real centres). It re-measures on any size change -- resizing, rotating, a different text
     size -- so the route cannot drift from its stops. Labels sit beside each stop on the side with more room; the route
     leaves and enters every stop vertically, so it never crosses a label, and scenery only goes in the gaps between rows. */
  function journeyMap(host,rec,chosen,fromPlay){ const wrap=$('div','zd-jm'); host.appendChild(wrap); let sel=chosen, dead=false, lastSig='', raf=0, revealWhenReady=!!fromPlay;
    const svgNS='http://www.w3.org/2000/svg'; const svg=document.createElementNS(svgNS,'svg'); svg.setAttribute('class','zd-jm-svg'); svg.setAttribute('aria-hidden','true'); wrap.appendChild(svg);
    const allDone=all.every(l=>S.done(l.id));
    const R=28, stateOf=l=>S.done(l.id)?'done':(isLocked(l)?'locked':(l.id===rec.id?'current':'open'));
    const statusText={done:'Completed',current:'Current stop',open:'Open',locked:'Locked'};
    /* region signs */
    const heads=cfg.chapters.map((c,ci)=>{ const cnt=c.levels.filter(x=>S.done(x.id)).length; const h=$('div','zd-jm-head',`<span class="art" aria-hidden="true">${c.art||''}</span><div class="tx"><span class="rg">Region ${ci+1}${c.skill?' · '+c.skill:''}</span><b>${c.name}</b>${c.blurb?`<p>${c.blurb}</p>`:''}<span class="zd-jm-pg"><span>${c.levels.map((_,k)=>`<i class="${k<cnt?'on':''}"></i>`).join('')}</span>${cnt} of ${c.levels.length} stops</span></div>`); wrap.appendChild(h); return h; });
    /* stops */
    const nodes=all.map((l,i)=>{ const node=$('div','zd-jm-node'); const dot=$('button','zd-jm-dot'); dot.type='button'; const lab=$('div','zd-jm-lab'); node.append(dot,lab); wrap.appendChild(node);
      dot.onclick=()=>{ if(stateOf(l)==='locked') return; if(sel.id===l.id) play(l); else { sel=l; S.setSel(l.id); paint(); } };
      return {l,node,dot,lab}; });
    function paint(){ nodes.forEach(({l,node,dot,lab})=>{ const st=stateOf(l), isSel=sel.id===l.id&&st!=='locked'; node.className='zd-jm-node '+st+(isSel?' sel':'');
      dot.disabled=st==='locked'; const pv=cfg.preview?`<span class="pv">${cfg.preview(l)}</span>`:'';
      dot.innerHTML=`${pv}${st==='locked'?`<span class="zd-jm-lock">${ICONS.lock}</span>`:`<span class="num">${l.i+1}</span>`}${st==='done'?`<span class="zd-jm-badge">${ICONS.check}</span>`:st==='locked'?'':''}`;
      dot.setAttribute('aria-label',`Stop ${idx(l)+1} of ${all.length}, ${l.name}, ${statusText[st].toLowerCase()}${st==='locked'?`. Finish ${all[idx(l)-1].name} first`:isSel?'. Press to play':'. Press to choose'}`);
      const rc=S.done(l.id); const meds=medalsOf(l).map(m=>{ const on=!!(rc&&rc.medals&&rc.medals[m.id]); return `<span class="zd-i${on?' on':''}${m.gold?' gold':''}" title="${m.label}${on?', earned':''}">${ICONS[m.icon||'check']}</span>`; }).join('');
      const tags=(cfg.tagsOf&&cfg.tagsOf(l))||'', goal=(cfg.goalOf&&cfg.goalOf(l))||'';
      lab.innerHTML=`<b class="nm"><span>${tag(l)}</span>${l.name}</b><small class="st">${st==='locked'?`<span class="zd-i">${ICONS.lock}</span>`:''}${statusText[st]}</small>${isSel?`${tags?`<p class="tg">${tags}</p>`:''}${goal?`<p class="gl">${goal}</p>`:''}${meds?`<span class="meds">${meds}</span>`:''}`:''}`;
      if(isSel){ const b=$('button','zd-btn pri',st==='done'?'Replay':'Play'); b.type='button'; b.setAttribute('aria-label',`${st==='done'?'Replay':'Play'} ${l.name}`); b.onclick=()=>play(l); lab.appendChild(b); } });
      layout(true); }
    /* home at the end of the route */
    const home=$('div','zd-jm-home',`<b>${(cfg.mapHome&&cfg.mapHome.name)||'Home'}</b><small>${allDone?'Home at last. Every stop finished.':((cfg.mapHome&&cfg.mapHome.note)||'Journey’s end')}</small>`); wrap.appendChild(home);
    const duck=$('span','zd-jm-duck'); duck.setAttribute('aria-hidden','true'); duck.innerHTML=cfg.mapMarker==='side'?`<svg viewBox="-34 -52 68 58">${duckSvg(0,0,.52,1)}</svg>`:duckTopSvgStandalone(); wrap.appendChild(duck);
    const E=(tag,attrs)=>{ const e=document.createElementNS(svgNS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); return e; };
    /* scenery drawn in the gap between two rows: kind = brook | marsh | river | ravine | road, cross = how the route gets over it */
    function band(g,kind,cross,y,W,xc){ const wave=(y0,amp)=>{ let d=`M 0 ${y0}`; for(let x=0;x<=W;x+=12) d+=` L ${x} ${(y0+Math.sin(x/19)*amp).toFixed(1)}`; return d; };
      const hw={brook:7,marsh:9,river:12,ravine:10,road:13}[kind]||8;
      if(kind==='road'){ g.appendChild(E('rect',{x:0,y:y-hw,width:W,height:hw*2,class:'bd2'})); g.appendChild(E('path',{d:`M0 ${y-hw}H${W}M0 ${y+hw}H${W}`,class:'ln'})); g.appendChild(E('path',{d:`M0 ${y}H${W}`,class:'ln dash'})); }
      else if(kind==='ravine'){ let d=`M 0 ${y-hw}`; for(let x=0;x<=W;x+=16) d+=` L ${x} ${y-hw+((x/16)%2?3:-2)}`; d+=` L ${W} ${y+hw}`; for(let x=W;x>=0;x-=16) d+=` L ${x} ${y+hw+((x/16)%2?-2:3)}`; g.appendChild(E('path',{d:d+' Z',class:'bd2'})); }
      else { let d=wave(y-hw,2.2); let d2=''; for(let x=W;x>=0;x-=12) d2+=` L ${x} ${(y+hw+Math.sin(x/19+1)*2.2).toFixed(1)}`; g.appendChild(E('path',{d:d+d2+' Z',class:'bd'})); g.appendChild(E('path',{d:wave(y-hw,2.2),class:'ln'})); if(kind!=='brook') g.appendChild(E('path',{d:wave(y+hw,2.2),class:'ln'}));
        if(kind==='marsh') for(let x=18;x<W;x+=58){ if(Math.abs(x-xc)<30) continue; g.appendChild(E('path',{d:`M${x} ${y-hw}q1 -9 -2 -14M${x+4} ${y-hw}q0 -11 3 -16M${x+8} ${y-hw}q1 -7 4 -10`,class:'mk'})); } }
      /* the crossing itself, centred on the route */
      if(cross==='bridge'){ g.appendChild(E('rect',{x:xc-9,y:y-hw-5,width:18,height:hw*2+10,rx:3,class:'sf'})); g.appendChild(E('path',{d:`M${xc-9} ${y-hw-5}v${hw*2+10}M${xc+9} ${y-hw-5}v${hw*2+10}`,class:'ink'})); for(let yy=y-hw;yy<y+hw;yy+=5) g.appendChild(E('path',{d:`M${xc-8} ${yy}h16`,class:'ln'})); }
      else if(cross==='stones'){ [-hw*.6,0,hw*.6].forEach((dy,i)=>g.appendChild(E('ellipse',{cx:xc+(i-1)*4,cy:y+dy,rx:6,ry:3.4,class:'sf'}))); [-hw*.6,0,hw*.6].forEach((dy,i)=>g.appendChild(E('ellipse',{cx:xc+(i-1)*4,cy:y+dy,rx:6,ry:3.4,class:'ink'}))); }
      else if(cross==='raft'){ g.appendChild(E('rect',{x:xc-12,y:y-6,width:24,height:12,rx:3,class:'sf'})); g.appendChild(E('rect',{x:xc-12,y:y-6,width:24,height:12,rx:3,class:'ink'})); g.appendChild(E('path',{d:`M${xc-4} ${y-6}v12M${xc+4} ${y-6}v12`,class:'ln'})); }
      else if(cross==='zebra'){ for(let yy=y-hw+3;yy<y+hw-1;yy+=5) g.appendChild(E('rect',{x:xc-9,y:yy,width:18,height:2.6,class:'fl'})); }
      else if(cross==='lilies'){ [[-7,-3],[7,3]].forEach(([dx,dy])=>{ g.appendChild(E('circle',{cx:xc+dx,cy:y+dy,r:5,class:'sf'})); g.appendChild(E('circle',{cx:xc+dx,cy:y+dy,r:5,class:'ink'})); }); } }
    /* a landmark beside a band, on the side away from the route */
    function mark(g,kind,x,y){ const G=E('g',{transform:`translate(${x} ${y})`}); const P=(d,c)=>G.appendChild(E('path',{d,class:c||'mk'}));
      if(kind==='tree'){ P('M0 12V-2'); G.appendChild(E('circle',{cx:0,cy:-8,r:8,class:'mkf'})); }
      else if(kind==='reeds'){ P('M-4 12q-1-10-3-16M0 12q0-12 1-19M4 12q1-9 4-14'); G.appendChild(E('ellipse',{cx:1,cy:-7,rx:1.8,ry:4,class:'mkf'})); }
      else if(kind==='lily'){ G.appendChild(E('ellipse',{cx:-5,cy:2,rx:7,ry:3,class:'mkf'})); G.appendChild(E('ellipse',{cx:7,cy:-2,rx:6,ry:2.6,class:'mkf'})); }
      else if(kind==='windmill'){ P('M-5 12l3-18h4l3 18Z','mkf'); P('M0 -6l-10-10M0 -6l10-10M0 -6l-10 10M0 -6l10 10'); }
      else if(kind==='rock'){ P('M-11 10l3-9 7-4 7 3 5 10Z','mkf'); }
      else if(kind==='ferry'){ P('M-13 4h26l-4 6h-18Z','mkf'); P('M-5 4v-7h9v7'); }
      else if(kind==='posts'){ P('M-8 10v-12M0 10v-16M8 10v-10'); }
      else if(kind==='logs'){ [[-6,6],[0,6],[6,6],[-3,0],[3,0]].forEach(([cx,cy])=>G.appendChild(E('circle',{cx,cy,r:3.2,class:'mk'}))); }
      else if(kind==='sign'){ P('M0 12V-8'); P('M-8 -10h13l4 4-4 4h-13Z','mkf'); }
      else if(kind==='house'){ P('M-9 12V0h18v12Z','mkf'); P('M-12 0l12-10 12 10'); }
      else if(kind==='bus'){ P('M-14 -6h28v12h-28Z','mkf'); P('M-9 8a2 2 0 1 0 .1 0M9 8a2 2 0 1 0 .1 0'); }
      else if(kind==='car'){ P('M-10 2h20v5h-20ZM-6 -3h11l3 5h-17Z','mkf'); }
      g.appendChild(G); }
    /* the destination: a pond (and, for One More Bridge, the duck's house with one gold-lit window) */
    function homeArt(g,x,y){ g.appendChild(E('ellipse',{cx:x-18,cy:y+10,rx:40,ry:13,class:'bd2'})); g.appendChild(E('ellipse',{cx:x-18,cy:y+10,rx:40,ry:13,class:'ink'})); g.appendChild(E('path',{d:`M${x-40} ${y+10}q6 -4 12 0t12 0`,class:'ln'}));
      g.appendChild(E('path',{d:`M${x+26} ${y+10}q-1 -12 -3 -18M${x+30} ${y+10}q0 -14 2 -20M${x+34} ${y+10}q1 -10 4 -14`,class:'mk'}));
      if(cfg.mapMarker==='side'){ g.appendChild(E('rect',{x:x+8,y:y-22,width:24,height:20,class:'sf'})); g.appendChild(E('path',{d:`M${x+8} ${y-2}V${y-22}h24V${y-2}M${x+4} ${y-22}l16 -13 16 13`,class:'ink'})); g.appendChild(E('rect',{x:x+12,y:y-17,width:6,height:6,rx:1,class:'gold'})); g.appendChild(E('rect',{x:x+22,y:y-15,width:6,height:13,rx:1,class:'fl'})); }
      else { g.appendChild(E('ellipse',{cx:x-30,cy:y+8,rx:7,ry:3,class:'mkf'})); g.appendChild(E('ellipse',{cx:x-6,cy:y+13,rx:6,ry:2.5,class:'mkf'})); } }
    const PAD=16, GAP=34, BANDH=46;
    function layout(force){ if(dead) return; const W=Math.round(wrap.clientWidth); if(!W) return;
      const cx=W/2, A=Math.min(cx-R-PAD-6,210), right=cx+A;
      const heights=nodes.map(n=>n.lab.offsetHeight), hh=heads.map(h=>h.offsetHeight);
      const sig=W+'|'+heights.join(',')+'|'+hh.join(',')+'|'+sel.id; if(!force&&sig===lastSig) return; lastSig=sig;
      const pts=[]; const panels=[], bands=[]; let y=10, gi=0;
      cfg.chapters.forEach((c,ci)=>{ const n=c.levels.length, top=y; const head=heads[ci]; const hw=Math.max(160,Math.min(440,right-R-18-PAD-12));
        head.style.left=(PAD+12)+'px'; head.style.top=(y+14)+'px'; head.style.width=hw+'px'; y+=14+head.offsetHeight+22;
        const bandAt=new Map(); const sc=c.scenery&&c.scenery.bands||[]; sc.forEach((b,bi)=>{ const gj=Math.min(n-2,Math.floor((n-1)*(bi+.5)/sc.length)); if(gj>=0) bandAt.set(gj,{b,mk:(c.scenery.marks||[])[bi]}); });
        for(let j=0;j<n;j++){ const nd=nodes[gi+j], cur=nd.node.classList.contains('current'), rr=cur?32:R; const x=n>1?cx+A*Math.cos(2*Math.PI*j/(n-1)):right; const h=Math.max(heights[gi+j],rr*2+6);
          if(j>0){ const prev=pts[pts.length-1]; const bd=bandAt.get(j-1); y=prev.y+prev.h/2+GAP+(bd?BANDH:0)+h/2; if(bd) bands.push({...bd,y:prev.y+prev.h/2+(GAP+BANDH)/2,xc:(prev.x+x)/2}); } else y+=h/2;
          pts.push({x,y,h,r:rr,side:x>cx+4?'l':x<cx-4?'r':(j===0?'l':'r')}); }
        const last=pts[pts.length-1]; y=last.y+last.h/2+24; panels.push({top,bottom:y}); y+=18; gi+=n; });
      const homeY=y+46; const total=homeY+86;
      wrap.style.height=total+'px'; svg.setAttribute('width',W); svg.setAttribute('height',total); svg.setAttribute('viewBox',`0 0 ${W} ${total}`); svg.innerHTML='';
      const g=E('g',{}); svg.appendChild(g);
      panels.forEach(p=>g.appendChild(E('rect',{x:0,y:p.top,width:W,height:p.bottom-p.top,rx:20,class:'pnl'})));
      bands.forEach(b=>{ band(g,b.b[0],b.b[1],b.y,W,b.xc); if(b.mk) mark(g,b.mk,b.xc>cx?PAD+26:W-PAD-26,b.y); });
      /* the route: stop to stop, leaving and arriving vertically; walked segments are solid */
      const seg=(a,b,on)=>{ const ym=(a.y+b.y)/2; g.appendChild(E('path',{d:`M ${a.x} ${a.y} C ${a.x} ${ym}, ${b.x} ${ym}, ${b.x} ${b.y}`,class:'rt'+(on?' on':'')})); };
      for(let i=1;i<pts.length;i++) seg(pts[i-1],pts[i],S.done(all[i-1].id)&&(S.done(all[i].id)||all[i].id===rec.id));
      const hp={x:cx,y:homeY}; seg(pts[pts.length-1],hp,allDone); homeArt(g,cx,homeY);
      nodes.forEach((nd,i)=>{ const p=pts[i]; nd.node.style.left=p.x+'px'; nd.node.style.top=p.y+'px'; nd.lab.className='zd-jm-lab '+p.side; const room=(p.side==='r'?W-p.x:p.x)-p.r-12-PAD; nd.lab.style.width=Math.max(120,Math.min(280,room))+'px'; });
      home.style.left=cx+'px'; home.style.top=(homeY+30)+'px';
      const di=allDone?-1:all.findIndex(l=>l.id===rec.id); if(di>=0){ const p=pts[di]; duck.style.left=p.x+'px'; duck.style.top=(p.y-p.r-40)+'px'; } else { duck.style.left=(cx-18)+'px'; duck.style.top=(homeY-26)+'px'; }
      /* widths just changed, so labels may re-wrap: measure again next frame (it settles in one more pass) */
      if(revealWhenReady){ revealWhenReady=false; requestAnimationFrame(()=>{ layout(); reveal(false); }); } }
    /* bring the chosen (or current) stop to the middle of the space under the header -- never beneath it */
    function reveal(smooth){ const nd=nodes.find(n=>n.l.id===sel.id)||nodes.find(n=>n.l.id===rec.id); if(!nd) return; const hh=(document.querySelector('header')||{offsetHeight:0}).offsetHeight; const gt=document.querySelector('#gxGame .gtools'); const gh=gt&&getComputedStyle(gt).position==='sticky'?gt.getBoundingClientRect().height:0;
      const r=nd.node.getBoundingClientRect(); const avail=innerHeight-hh-gh; const y=Math.max(0,r.top+scrollY-hh-gh-avail*.38); const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches; window.scrollTo({top:y,behavior:smooth&&!reduce?'smooth':'auto'}); }
    const ro=window.ResizeObserver?new ResizeObserver(()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>layout()); }):null;
    if(ro){ ro.observe(wrap); nodes.forEach(n=>ro.observe(n.lab)); heads.forEach(h=>ro.observe(h)); } else window.addEventListener('resize',layout);
    paint(); requestAnimationFrame(()=>layout());
    return { reveal, relayout:()=>layout(true), destroy(){ dead=true; if(ro) ro.disconnect(); else window.removeEventListener('resize',layout); cancelAnimationFrame(raf); } }; }

  function select(opt){ opt=opt&&opt.fromPlay?opt:{}; cleanup(); if(mapCtl){ mapCtl.destroy(); mapCtl=null; } const played=cur; cur=null; root.innerHTML=''; const rec=resume(), n=doneCount(), fresh=n===0&&!(S.st.last&&S.st.last.level);
    /* coming back from a level: if it was finished, the stop to show is the one it opened */
    if(opt.fromPlay&&played&&S.done(played.id)&&!S.done(rec.id)&&idx(rec)>idx(played)) S.setSel(rec.id);
    /* 1 · the way in */
    const hero=$('section','zd-hero'); hero.innerHTML=`<h3>${fresh?cfg.lead:`Continue: ${tag(rec)} · ${rec.name}`}</h3><p>${fresh?cfg.tagline||'':`${n} of ${all.length} levels completed`}</p>`; const acts=$('div','zd-acts');
    const go=$('button','zd-btn pri',fresh?'Start playing':'Continue'); go.type='button'; go.onclick=()=>play(rec); const ch=$('button','zd-btn','Choose a level'); ch.type='button'; ch.onclick=()=>{ const t=cfg.map?root.querySelector('.zd-jm-node.sel .zd-jm-dot, .zd-jm'):root.querySelector('.zd-tab[aria-selected="true"]'); if(t){ if(cfg.map&&mapCtl) mapCtl.reveal(true); else t.scrollIntoView({block:'center',behavior:'smooth'}); t.focus&&t.focus({preventScroll:true}); } }; acts.append(go,ch); hero.appendChild(acts);
    const note=$('div','zd-save',S.working()?'Progress saved in this browser. No account needed.':'This browser is not letting the game save, so progress lasts only until you close this page. The game itself works normally.'); note.dataset.ok=S.working()?'1':'0'; hero.appendChild(note); root.appendChild(hero);
    // entering (or returning to) the level list must never leave the title sitting under the sticky header --
    // the page can be scrolled halfway down a level's settings when this renders, so bring the title back into view.
    if(!(cfg.map&&opt.fromPlay)) setTimeout(()=>scrollClear(hero),0);
    /* your progress: export and import, so a save can move between devices without an account */
    const menu=$('details','zd-menu'); menu.innerHTML=`<summary>Your progress</summary>`; const mb=$('div','zd-menubody'); const exp=$('button','zd-btn','Export progress'), imp=$('button','zd-btn','Import progress'), rs=$('button','zd-btn','Erase progress'); [exp,imp,rs].forEach(b=>b.type='button'); const file=$('input'); file.type='file'; file.accept='application/json,.json'; file.hidden=true; const st=$('div','zd-note',''); st.setAttribute('aria-live','polite');
    exp.onclick=()=>{ try{ const blob=new Blob([S.exportJSON()],{type:'application/json'}); const a=$('a'); a.href=URL.createObjectURL(blob); a.download=(cfg.slug||cfg.id)+'-progress.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); st.textContent='Progress exported to a file. Import it on another device to continue there.'; }catch(e){ st.textContent='Export did not work in this browser.'; } };
    imp.onclick=()=>file.click(); file.onchange=()=>{ const f=file.files&&file.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ const r=S.importJSON(String(fr.result||''),validIds); st.textContent=r.msg; if(r.ok) setTimeout(select,900); }; fr.onerror=()=>{ st.textContent='That file could not be read.'; }; fr.readAsText(f); file.value=''; };
    rs.onclick=()=>{ if(confirm('Erase saved levels and goals for this game? This cannot be undone. Export first if you want a copy.')){ S.reset(); select(); } };
    mb.append(exp,imp,rs,file,st); menu.appendChild(mb); root.appendChild(menu);
    /* 2 · chapters, or the journey-home map */
    let chosen;
    if(cfg.map){
      chosen=byId(S.st.sel)||rec; if(!open()&&isLocked(chosen)) chosen=rec;
      mapCtl=journeyMap(root,rec,chosen,opt.fromPlay);
    } else {
      const selLv=byId(S.st.sel)||rec; chTab=Math.min(chTab,cfg.chapters.length-1); if(root._initSel!==true){ chTab=selLv.ch; root._initSel=true; }
      const tabs=$('div','zd-tabs'); tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','Chapters');
      cfg.chapters.forEach((c,ci)=>{ const cnt=c.levels.filter(l=>S.done(l.id)).length; const b=$('button','zd-tab',`<span class="art" aria-hidden="true">${c.art||''}</span><b>${c.name}</b><small>${cnt} of ${c.levels.length}</small>`); b.type='button'; b.setAttribute('role','tab'); b.setAttribute('aria-selected',ci===chTab?'true':'false'); b.tabIndex=ci===chTab?0:-1; b.onclick=()=>{ chTab=ci; const first=all.find(l=>l.ch===ci&&!S.done(l.id))||all.find(l=>l.ch===ci); S.setSel(first.id); select(); setTimeout(()=>{ const t=root.querySelector('.zd-tab[aria-selected="true"]'); t&&t.focus({preventScroll:true}); },0); };
        b.onkeydown=e=>{ if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); const nx=(ci+(e.key==='ArrowRight'?1:-1)+cfg.chapters.length)%cfg.chapters.length; tabs.children[nx].click(); } }; tabs.appendChild(b); });
      root.appendChild(tabs);
      const chp=cfg.chapters[chTab]; const cb=$('p','zd-blurb',chp.blurb); root.appendChild(cb);
      const g=$('div','zd-grid'); g.setAttribute('role','list'); chosen=(byId(S.st.sel)&&byId(S.st.sel).ch===chTab)?byId(S.st.sel):(all.find(l=>l.ch===chTab&&!S.done(l.id))||all.find(l=>l.ch===chTab));
      chp.levels.forEach((l0,li)=>{ const l=byId(l0.id), r=S.done(l.id), adv=!open()&&idx(l)>idx(rec)+(S.done(rec.id)?0:0)&&idx(l)>0&&!S.done(all[idx(l)-1].id)&&!r; const isRec=l.id===rec.id&&!fresh;
        const ic=[`<span class="zd-i${r?' on':''}" title="Completed"><span class="sr">${r?'Completed':'Not completed'}</span>${ICONS.check}</span>`].concat(medalsOf(l).map(m=>`<span class="zd-i${r&&r.medals&&r.medals[m.id]?' on':''}${m.gold?' gold':''}" title="${m.label}"><span class="sr">${m.label}${r&&r.medals&&r.medals[m.id]?', earned':', not yet'}</span>${ICONS[m.icon||'check']}</span>`)).join('');
        const b=$('button','zd-lv'+(r?' done':'')+(l.id===chosen.id?' sel':'')+(isRec?' rec':'')+(adv?' adv':''),`<span class="n">${tag(l)}</span><small>${l.name}</small><span class="ics">${ic}</span>${isRec?'<span class="tagx">Next</span>':''}${adv?`<span class="lockx">${ICONS.lock}</span>`:''}`); b.type='button'; b.setAttribute('role','listitem'); b.setAttribute('aria-label',`Level ${tag(l)}, ${l.name}${r?', completed':''}${isRec?', recommended next':''}${adv?', advanced':''}`); b.onclick=()=>{ S.setSel(l.id); select(); setTimeout(()=>{ const t=root.querySelector('.zd-lv.sel'); t&&t.focus({preventScroll:true}); },0); }; g.appendChild(b); });
      root.appendChild(g);
    }
    /* 3 · the selected level (the map shows it on the stop itself) */
    if(!cfg.map){ const l=chosen, r=S.done(l.id), adv=!open()&&idx(l)>idx(rec)&&!r; const det=$('section','zd-detail'); const best=r&&r.bests&&r.bests[dk()]; const goal=(cfg.goalOf&&cfg.goalOf(l))||''; const tags=(cfg.tagsOf&&cfg.tagsOf(l))||'';
    det.innerHTML=`<div class="pv">${cfg.preview?cfg.preview(l):''}</div><div class="tx"><h4>${tag(l)} · ${l.name}</h4>${tags?`<p class="zd-tags">${tags}</p>`:''}${goal?`<p>${goal}</p>`:''}<ul class="zd-obj"><li class="${r?'on':''}">${ico('check')}<span>Complete the level</span><em>${r?'done':'not yet'}</em></li>${objectiveRow(l,r)}</ul>${best?`<div class="zd-best">Best time on ${cfg.diffName?cfg.diffName():'these settings'}: <b>${best.toFixed(1)} s</b></div>`:''}${adv?'<div class="zd-best">This one is later in the recommended order, but you can try it right away.</div>':''}</div>`;
    const pl=$('button','zd-btn pri',adv?'Try anyway':(r?'Play again':'Play')); pl.type='button'; pl.onclick=()=>play(l); det.querySelector('.tx').appendChild(pl); root.appendChild(det); }
    if(cfg.endless){ const ok=cfg.unlockEndless?cfg.unlockEndless(S):true; const sec=$('section','zd-endless'+(ok?'':' locked'),`<h3>Endless</h3><p>${ok?'Section after section, with a safe bank in between. Personal best: '+(S.st.best.endless||0)+'.':'Opens after you finish the second '+(cfg.map?'region':'chapter')+', or set levels to Pick any.'}</p>`); const b=$('button','zd-btn'+(ok?' pri':''),ok?'Play endless':'Locked'); b.type='button'; b.disabled=!ok; b.onclick=()=>playEndless(); sec.appendChild(b); root.appendChild(sec); } }

  /* the play bar: back, level, chips, pause, retry. One row. */
  function frame(title,lv,endless){ root.innerHTML=''; const bar=$('div','zd-bar'); const back=$('button','zd-btn',cfg.map?'← Map':'← Levels'); back.type='button'; back.onclick=()=>select({fromPlay:true}); const t=$('span','ttl',title); const chips=$('span','zd-chips'); const info=$('span','zd-chip'); info.hidden=true; const showT=endless||!cfg.showTime||cfg.showTime(lv); const time=$('span','zd-chip mono','0.0 s'); time.id='zdTime'; time.hidden=!showT; chips.append(info,time);
    const pz=$('button','zd-btn ico','<span class="zd-i">'+ICONS.pause+'</span><span class="lb">Pause</span>'); pz.type='button'; pz.setAttribute('aria-label','Pause'); const rt=$('button','zd-btn ico','<span class="zd-i">'+ICONS.retry+'</span><span class="lb">Retry</span>'); rt.type='button'; rt.id='zdRetry'; rt.setAttribute('aria-label','Retry'); bar.append(back,t,chips,pz,rt);
    const stage=$('div','zd-stage'); const msg=$('div','zd-msg'); msg.setAttribute('aria-live','polite'); root.append(bar,stage,msg);
    // A taller level (or one loaded straight from a level-picker further down the page) must never require a manual
    // scroll to find: bring the play bar to the top of the view every time a challenge starts, retries, or advances,
    // so the board and the duck are exactly where the player looks next, at any board size.
    setTimeout(()=>scrollClear(bar),0);
    const ov=$('div','zd-over'); ov.hidden=true; ov.innerHTML='<div class="zd-card small"><h4>Paused</h4><p>The game is waiting for you.</p><div class="zd-acts"></div></div>'; const rs=$('button','zd-btn pri','Resume'); rs.type='button'; ov.querySelector('.zd-acts').appendChild(rs); stage.appendChild(ov);
    const setPaused=p=>{ root.dataset.paused=p?'1':''; ov.hidden=!p; pz.querySelector('.lb').textContent=p?'Resume':'Pause'; pz.setAttribute('aria-label',p?'Resume':'Pause'); if(p) rs.focus({preventScroll:true}); else{ const c=stage.querySelector('canvas'); c&&c.focus({preventScroll:true}); } }; pz.onclick=()=>setPaused(root.dataset.paused!=='1'); rs.onclick=()=>setPaused(false);
    return {bar,stage,msg,time,rt,info,setPaused}; }
  function result(f,lv,res,next,failed,rc){ const o=$('div','zd-over show'); const card=$('div','zd-card'); const facts=res.text?`<p>${res.text}</p>`:'';
    let rows=''; if(!failed){ rows=`<ul class="zd-obj">${medalsOf(lv).map(m=>{ const on=!!(res.medals&&res.medals[m.id]); const nw=rc&&rc.fresh&&rc.fresh.includes(m.id); return `<li class="${on?'on':''}">${ico(m.icon||'check',m.gold&&on?'gold':'')}<span>${m.label}</span><em>${on?(nw?'new':'earned'):'optional'}</em></li>`; }).join('')}</ul>`; }
    const badge=failed?'':(rc&&rc.pb?`<div class="zd-pb">Personal best${rc.before?` · was ${rc.before.toFixed(1)} s`:''}</div>`:(rc&&rc.first?'<div class="zd-pb soft">First clear</div>':''));
    /* on the journey map, a clear finish shows Duckie stepping on to the next stop instead of jumping straight
       to a button -- a few pixels of motion, not a scene change, and skipped outright under reduced motion. */
    const mini=(cfg.map&&!failed&&next)?`<div class="zd-map-mini"><span class="zd-map-mini-dot done">${ico('check','on')}</span><span class="zd-map-mini-track"><span class="zd-map-mini-duck" aria-hidden="true">${duckTopSvgStandalone()}</span></span><span class="zd-map-mini-dot">${next.i+1}</span></div><p class="zd-map-mini-label">Next: ${next.name}</p>`:'';
    card.innerHTML=`<h4>${res.title||'Level complete'}</h4>${badge}${mini}${facts}${rows}${!failed&&rc&&!rc.saved?'<p class="zd-warn">Could not save in this browser. Progress lasts until you close this page.</p>':''}<div class="zd-acts"></div>`; const acts=card.querySelector('.zd-acts');
    const mk=(label,cls,fn)=>{ const b=$('button','zd-btn'+(cls?' '+cls:''),label); b.type='button'; b.onclick=fn; acts.appendChild(b); return b; };
    if(failed){ mk('Retry','pri',()=>play(lv)); } else if(cfg.map){ if(next) mk('Continue journey','pri',()=>play(next)); mk('Replay',next?'':'pri',()=>play(lv)); }
    else { if(next) mk('Next level →','pri',()=>play(next)); mk('Retry',next?'':'pri',()=>play(lv)); }
    if(window.ZS){ if(failed) ZS.play('lose'); else if(rc&&rc.pb) setTimeout(()=>ZS.play('pb'),450); }
    mk(cfg.map?'Back to map':'Levels','',()=>select({fromPlay:true})); o.appendChild(card); f.stage.appendChild(o);
    if(mini){ const duck=card.querySelector('.zd-map-mini-duck'); if(duck) requestAnimationFrame(()=>setTimeout(()=>duck.classList.add('go'),350)); }
    setTimeout(()=>{ const b=acts.querySelector('button'); if(b) b.focus({preventScroll:true}); },30); }
  function play(lv){ cleanup(); cur=lv; S.setLast(lv.id,'campaign'); S.setSel(lv.id); const f=frame(`${tag(lv)} · ${lv.name}`,lv); const next=all[idx(lv)+1];
    const api={ f, stage:f.stage, msg:f.msg, time:t=>{ f.time.textContent=t.toFixed(1)+' s'; }, say:h=>{ f.msg.innerHTML=h; }, info:h=>{ f.info.textContent=h; f.info.hidden=!h; }, fail(res){ result(f,lv,res,null,true); },
      complete(res){ const rc=S.mark(lv.id,res,dk()); if(idx(lv)===0){ S.st.tutorial=true; S.save(); } result(f,lv,res,next,false,rc); }, retry:()=>play(lv), toLevels:()=>select({fromPlay:true}), store:S };
    f.rt.onclick=()=>play(lv); ctrl=cfg.play(lv,f.stage,api); }
  function playEndless(){ cleanup(); S.setLast(null,'endless'); const f=frame('Endless',null,true); f.rt.style.display='none'; const api={ f, stage:f.stage, msg:f.msg, time:t=>{ f.time.textContent=t; }, say:h=>{ f.msg.innerHTML=h; }, info:h=>{ f.info.textContent=h; f.info.hidden=!h; }, store:S, toLevels:select, best:n=>{ if(n>(S.st.best.endless||0)){ S.st.best.endless=n; S.save(); } } }; ctrl=cfg.endless(f.stage,api); }
  select();
  return { destroy(){ cleanup(); }, select, play:id=>{ const l=all.find(x=>x.id===id); if(l) play(l); }, store:S }; }

/* ---------- card art (used by the Home carousel and the arcade, so it lives here) ----------
   Both scenes are drawn inside a clipped rounded frame, use the same duck as the games, and tell one story that ends in a held success moment. */
let artN=0;
function frame(inner){ const id='zdc'+(++artN); return `<defs><clipPath id="${id}"><rect width="256" height="216" rx="20"/></clipPath></defs><g clip-path="url(#${id})">${inner}</g>`; }
/* a vehicle from above; fronts are light, backs are dark */
const veh=(x,y,w,h,tone,cls,dirR)=>{ const fx=dirR?x+w-5:x+1, gl=dirR?x+w*.66:x+w*.12; return `<g class="${cls||''}"><rect x="${x+2}" y="${y+4}" width="${w}" height="${h}" rx="${h*.3}" fill="#000" opacity=".22"/><rect x="${x+w*.16}" y="${y-2.5}" width="${h*.5}" height="${h+5}" rx="2" fill="#1c1b19"/><rect x="${x+w*.68}" y="${y-2.5}" width="${h*.5}" height="${h+5}" rx="2" fill="#1c1b19"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h*.3}" fill="${tone}" stroke="${DUCKC.vehInk}" stroke-width="2.5"/><rect x="${x+w*.14}" y="${y+h*.16}" width="${w*.72}" height="${h*.68}" rx="${h*.2}" fill="#fffdf6" opacity=".26"/><rect x="${gl}" y="${y+h*.16}" width="${w*.2}" height="${h*.68}" rx="3" fill="#1b1a18" opacity=".7"/><rect x="${fx}" y="${y+h*.18}" width="4" height="${h*.18}" rx="1.5" fill="#fffdf6"/><rect x="${fx}" y="${y+h*.64}" width="4" height="${h*.18}" rx="1.5" fill="#fffdf6"/></g>`; };
const tuftSvg=(x,y)=>`<path d="M${x-2} ${y}q-1 -5 -5 -8M${x} ${y}q-1 -6 0 -11M${x+2} ${y}q1 -5 5 -8" stroke="currentColor" stroke-opacity=".4" stroke-width="2" fill="none" stroke-linecap="round"/>`;
function duckieArt(){ const lily=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" fill-opacity=".4" stroke="currentColor" stroke-opacity=".35" stroke-width="1.6"/><path d="M${x} ${y}L${x+r*.85} ${y-r*.5}" stroke="currentColor" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>`;
  return frame(`<rect width="256" height="216" fill="currentColor" fill-opacity=".08"/>
<rect x="14" y="8" width="228" height="66" rx="33" fill="#000" fill-opacity=".18" transform="translate(2 3)"/><rect x="14" y="8" width="228" height="66" rx="33" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-opacity=".75" stroke-width="4"/><rect x="24" y="18" width="208" height="46" rx="23" fill="#000" fill-opacity=".16"/>${lily(58,38,10)}${lily(202,30,12)}
<ellipse cx="128" cy="60" rx="34" ry="5" fill="currentColor" fill-opacity=".16"/>
<rect y="84" width="256" height="60" fill="#000" fill-opacity=".42"/><rect y="84" width="256" height="4" fill="currentColor" fill-opacity=".55"/><rect y="140" width="256" height="4" fill="currentColor" fill-opacity=".55"/><path d="M0 114H256" stroke="#fffdf6" stroke-opacity=".55" stroke-width="3" stroke-dasharray="20 16"/>
${veh(-130,92,84,24,DUCKC.veh2,'dkc1',true)}${veh(300,120,60,22,DUCKC.veh,'dkc2',false)}${veh(-120,120,58,22,DUCKC.veh,'dkc3',true)}${veh(300,92,84,24,DUCKC.veh2,'dkc4',false)}
${[24,70,116,184,232].map((x,i)=>tuftSvg(x,196+(i%2)*6)).join('')}
<g class="dkring"><circle cx="128" cy="40" r="10" fill="none" stroke="#fffdf6" stroke-width="3"/></g><g class="dkring dkring2"><circle cx="128" cy="40" r="10" fill="none" stroke="#fffdf6" stroke-width="3"/></g>
<g class="dkduck"><g class="dkpulse"><g class="dkbob">${duckTopSvg(128,176,.82,'up')}</g></g></g>`); }
const cardCss=`.dkc1,.dkc2,.dkc3,.dkc4{transform:translateX(0)}
.dkring{opacity:0;transform-box:fill-box;transform-origin:center}.dkpulse,.dkbob{transform-box:fill-box;transform-origin:center}
.gcard:is(.on,.live) .dkc1{animation:dkc1 8s linear forwards}.gcard:is(.on,.live) .dkc2{animation:dkc2 8s linear forwards}.gcard:is(.on,.live) .dkc3{animation:dkc3 8s linear forwards}.gcard:is(.on,.live) .dkc4{animation:dkc4 8s linear forwards}
.gcard:is(.on,.live) .dkduck{animation:dkhop 8s linear forwards}.gcard:is(.on,.live) .dkpulse{animation:dkpulse 8s linear forwards}.gcard:is(.on,.live) .dkbob{animation:dkbob .55s ease-in-out infinite alternate}
.gcard:is(.on,.live) .dkring{animation:dkring 8s ease-out forwards}.gcard:is(.on,.live) .dkring2{animation-delay:.25s}
@keyframes dkc1{0%{transform:translateX(0)}30%,100%{transform:translateX(500px)}}
@keyframes dkc2{0%{transform:translateX(0)}44%,100%{transform:translateX(-470px)}}
@keyframes dkc3{0%,60%{transform:translateX(0)}100%{transform:translateX(500px)}}
@keyframes dkc4{0%,50%{transform:translateX(0)}100%{transform:translateX(-470px)}}
@keyframes dkbob{from{transform:rotate(-2.5deg)}to{transform:rotate(2.5deg)}}
@keyframes dkhop{0%,44%{transform:translateY(0);animation-timing-function:cubic-bezier(.3,.8,.4,1)}49%,54%{transform:translateY(-49px);animation-timing-function:cubic-bezier(.3,.8,.4,1)}59%,64%{transform:translateY(-79px);animation-timing-function:cubic-bezier(.3,.8,.4,1)}70%,100%{transform:translateY(-136px)}}
@keyframes dkpulse{0%,44%{transform:scale(1)}46.5%{transform:scale(1.14)}49%,54%{transform:scale(1)}56.5%{transform:scale(1.14)}59%,64%{transform:scale(1)}67%{transform:scale(1.14)}70%,100%{transform:scale(1)}}
@keyframes dkring{0%,69%{opacity:0;transform:scale(.4)}72%{opacity:.95}92%,100%{opacity:0;transform:scale(4.2)}}
@media (prefers-reduced-motion:reduce){.gcard:is(.on,.live) .dkc1,.gcard:is(.on,.live) .dkc2,.gcard:is(.on,.live) .dkc3,.gcard:is(.on,.live) .dkc4,.gcard:is(.on,.live) .dkduck,.gcard:is(.on,.live) .dkpulse,.gcard:is(.on,.live) .dkbob,.gcard:is(.on,.live) .dkring{animation:none}}`;
{ const c1=document.createElement('style'); c1.id='zd-cardcss'; c1.textContent=cardCss; document.head.appendChild(c1); }

/* One More Bridge: the duck waits, the bridge grows from the hinge, tips over the gap, lands with a small bounce, and the duck walks across */
function bridgeArt(){ const px=96, gy=134, len=86, th=10;
  const cliff=(x,w)=>`<rect x="${x}" y="${gy+4}" width="${w}" height="90" rx="10" fill="#000" fill-opacity=".2" transform="translate(3 4)"/><rect x="${x}" y="${gy+4}" width="${w}" height="90" rx="10" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-opacity=".55" stroke-width="3"/><rect x="${x-1}" y="${gy}" width="${w+2}" height="9" rx="4.5" fill="currentColor" fill-opacity=".8"/>`;
  return frame(`<rect width="256" height="216" fill="currentColor" fill-opacity=".05"/><circle cx="206" cy="46" r="26" fill="currentColor" fill-opacity=".07"/><circle cx="206" cy="46" r="14" fill="currentColor" fill-opacity=".1"/>
<g class="brcloud"><rect x="26" y="34" width="50" height="11" rx="5.5" fill="currentColor" fill-opacity=".1"/><rect x="40" y="26" width="28" height="11" rx="5.5" fill="currentColor" fill-opacity=".1"/></g>
<path d="M0 128C34 104 70 108 112 122S196 104 256 126V216H0Z" fill="currentColor" fill-opacity=".07"/>
<rect y="186" width="256" height="30" fill="currentColor" fill-opacity=".17"/><rect y="186" width="256" height="2.5" fill="currentColor" fill-opacity=".3"/><path d="M104 200q7 -4 14 0t14 0t14 0M150 208q7 -4 14 0t14 0" stroke="currentColor" stroke-opacity=".3" stroke-width="2" fill="none" stroke-linecap="round"/>
${cliff(-24,px+24)}${cliff(178,100)}
<path d="M216 ${gy}v-24" stroke="currentColor" stroke-opacity=".6" stroke-width="2.5"/><path d="M216 ${gy-24}l18 6l-18 6z" fill="currentColor" fill-opacity=".5"/>
<g class="brrot" style="transform-origin:${px}px ${gy}px"><g class="brbar" style="transform-origin:${px}px ${gy}px"><rect x="${px-th}" y="${gy-len}" width="${th}" height="${len}" rx="3.5" fill="#b1a891" stroke="${DUCKC.vehInk}" stroke-width="2.4"/><path d="M${px-th+2.5} ${gy-len+3}V${gy-3}" stroke="#fffdf6" stroke-opacity=".32" stroke-width="2.2" stroke-linecap="round"/>${[1,2,3,4,5,6,7].map(k=>`<path d="M${px-th} ${gy-len+k*len/8}h${th}" stroke="${DUCKC.vehInk}" stroke-opacity=".3" stroke-width="1.5"/>`).join('')}</g></g>
<circle cx="${px-th/2}" cy="${gy-th/2}" r="3.2" fill="${DUCKC.vehInk}"/>
<circle class="brdust" cx="${px+len-6}" cy="${gy-2}" r="5" fill="currentColor" fill-opacity=".35"/><circle class="brdust brdust2" cx="${px+len+4}" cy="${gy-3}" r="3.5" fill="currentColor" fill-opacity=".3"/>
<g class="brwalk"><g class="brwad">${duckSvg(50,gy,.8,1)}</g></g>
<g class="brperf"><text x="214" y="88" text-anchor="middle" font-family="var(--font-sans)" font-weight="800" font-size="17" fill="currentColor">Perfect</text><circle cx="188" cy="102" r="3" fill="currentColor" fill-opacity=".7"/><circle cx="240" cy="98" r="3" fill="currentColor" fill-opacity=".5"/><circle cx="226" cy="106" r="2.4" fill="currentColor" fill-opacity=".6"/></g>`); }
const brCss=`.brbar{transform:scaleY(.05)}.brrot{transform:rotate(0)}.brwalk{transform:translate(0,0)}.brdust,.brperf{opacity:0}.brwad{transform-box:fill-box;transform-origin:50% 100%}
.gcard:is(.on,.live) .brbar{animation:brgrow 8s ease-in-out forwards}.gcard:is(.on,.live) .brrot{animation:brrot 8s linear forwards}.gcard:is(.on,.live) .brwalk{animation:brwalk 8s linear forwards}
.gcard:is(.on,.live) .brwad{animation:brwad .3s ease-in-out 4.9s 8 alternate both}.gcard:is(.on,.live) .brcloud{animation:brcloud 16s linear infinite}
.gcard:is(.on,.live) .brdust{animation:brdust 8s ease-out forwards}.gcard:is(.on,.live) .brdust2{animation-delay:.05s}.gcard:is(.on,.live) .brperf{animation:brperf 8s ease-out forwards}
@keyframes brgrow{0%,8%{transform:scaleY(.05)}40%,100%{transform:scaleY(1)}}
@keyframes brrot{0%,45%{transform:rotate(0);animation-timing-function:cubic-bezier(.5,0,.9,.6)}55%{transform:rotate(90deg)}56.5%{transform:rotate(87.5deg)}58%,100%{transform:rotate(90deg)}}
@keyframes brwalk{0%,60%{transform:translate(0,0)}67%{transform:translate(40px,0)}69%{transform:translate(52px,-10px)}82%{transform:translate(126px,-10px)}84.5%{transform:translate(138px,0)}88%,100%{transform:translate(160px,0)}}
@keyframes brwad{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
@keyframes brcloud{from{transform:translateX(0)}to{transform:translateX(230px)}}
@keyframes brdust{0%,54%{opacity:0;transform:translateY(0)}56%{opacity:.7}68%,100%{opacity:0;transform:translateY(-9px)}}
@keyframes brperf{0%,88%{opacity:0;transform:translateY(6px)}91.5%,100%{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.gcard:is(.on,.live) .brbar,.gcard:is(.on,.live) .brrot,.gcard:is(.on,.live) .brwalk,.gcard:is(.on,.live) .brwad,.gcard:is(.on,.live) .brdust,.gcard:is(.on,.live) .brperf,.gcard:is(.on,.live) .brcloud{animation:none}}`;
{ const c2=document.createElement('style'); c2.id='zd-cardcss2'; c2.textContent=brCss; document.head.appendChild(c2); }

window.ZDuck={ duckieArt, bridgeArt, drawDuckView, drawDuckTop, duckTopSvg, artReady, store, pal, DUCKC, drawDuck, duckSvg, duckActorSvg, drawCoin, loop, isPaused, campaign, $, clamp, LS, SV };
})();
