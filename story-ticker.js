/* story-ticker.js: a game's story, told up front. When a game page opens, a small card fades up over the corner of the
   page and plays that game's story one short line at a time (origins-data.js `snippets`), swapping every few seconds.
   - "Read the story" opens the full Origins & stories panel (origins.js).
   - It comes back on each visit until the player closes it (×) or reads the story; then it stays away for that game
     (localStorage zf-story-done). The Origins & stories button beside How to play still opens the story any time.
   - When a game starts, it finishes the line it is on and slides away, so it never sits on the board while you play.
   - On a game's first visit the short film (cinema.js) opens instead; it hands over to this card when it
     closes, and the card's Watch the film button plays it again.
   - Hover or focus pauses it. Reduced motion: no slide, the lines just swap. */
(function(){
'use strict';
const KEY='zf-story-done', FIRST=1500, STEP=5200;
const slugNow=()=>location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0];
const done=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } };
const markDone=slug=>{ try{ const s=done(); if(!s.includes(slug)){ s.push(slug); localStorage.setItem(KEY,JSON.stringify(s)); } }catch(e){} };
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const BOOK='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10.3 5.2 7.9 4.6 4 4.6v13.3c3.9 0 6.3.6 8 1.9 1.7-1.3 4.1-1.9 8-1.9V4.6c-3.9 0-6.3.6-8 1.9Z"/><path d="M12 6.5v13.3"/></svg>';
const PLAY='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
const X_='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const CSS=`
#zfStory{position:fixed;z-index:60;right:24px;bottom:24px;width:min(380px,calc(100vw - 32px));box-sizing:border-box;padding:14px 14px 0 16px;border:1px solid var(--g3);border-radius:16px;background:var(--bg);color:var(--fg);box-shadow:0 10px 30px rgba(0,0,0,.18);overflow:hidden;opacity:0;transform:translateY(24px);visibility:hidden;transition:opacity .45s ease,transform .6s cubic-bezier(.22,1,.36,1),visibility 0s .6s}
#zfStory.on{opacity:1;transform:none;visibility:visible;transition:opacity .45s ease,transform .6s cubic-bezier(.22,1,.36,1)}
#zfStory .zs-top{display:flex;align-items:center;gap:8px;padding-right:34px;font:600 11px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g6)}
#zfStory .zs-top svg{color:#c9a63f;flex:none}
#zfStory .zs-n{margin-left:auto;font-variant-numeric:tabular-nums}
#zfStory .zs-x{position:absolute;top:6px;right:6px;width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:10px;background:transparent;color:var(--g6);cursor:pointer}
#zfStory .zs-x:hover,#zfStory .zs-x:focus-visible{color:var(--fg);background:var(--g2,rgba(127,127,127,.12))}
#zfStory .zs-x:focus-visible,#zfStory .zs-read:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
#zfStory .zs-win{position:relative;margin:10px 0 12px;min-height:2.6em;font:600 17px/1.3 var(--font-sans)}
#zfStory .zs-line{display:block}
#zfStory .zs-line.in{animation:zsIn .6s ease .15s both}
#zfStory .zs-line.out{position:absolute;inset:0 0 auto 0;animation:zsOut .35s ease both}
#zfStory .zs-acts{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
#zfStory .zs-watch{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 14px;border:1px solid var(--g3);border-radius:12px;background:transparent;color:var(--fg);font:600 13.5px var(--font-sans);cursor:pointer}
#zfStory .zs-watch:hover{border-color:var(--g5)}#zfStory .zs-watch:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
#zfStory .zs-read{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border:1px solid var(--fg);border-radius:12px;background:var(--fg);color:var(--bg);font:600 13.5px var(--font-sans);cursor:pointer}
#zfStory .zs-read:hover{opacity:.88}
#zfStory .zs-bar{position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--g3)}
#zfStory .zs-bar i{display:block;height:100%;width:100%;background:#c9a63f;transform-origin:left;transform:scaleX(0)}
#zfStory .zs-bar i.run{animation:zsBar var(--zs-step) linear both}
#zfStory:is(:hover,:focus-within) .zs-bar i.run{animation-play-state:paused}
@keyframes zsIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes zsOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-6px)}}
@keyframes zsBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
html:has(#gdrawer.open) #zfStory{opacity:0;visibility:hidden}
@media (max-width:640px){#zfStory{left:16px;right:16px;bottom:16px;width:auto}#zfStory .zs-win{font-size:16px}}
@media (prefers-reduced-motion:reduce){#zfStory,#zfStory.on{transition:opacity .2s,visibility 0s}#zfStory{transform:none}#zfStory .zs-line.in,#zfStory .zs-line.out{animation:none}#zfStory .zs-line.out{display:none}}
`;
let box=null, slug='', lines=[], i=0, timer=null, leaving=false;

function build(){
  if(box) return;
  const st=document.createElement('style'); st.id='zf-story-css'; st.textContent=CSS; document.head.appendChild(st);
  box=document.createElement('aside'); box.id='zfStory'; box.setAttribute('aria-label','The story behind this game');
  box.innerHTML=`<div class="zs-top">${BOOK}<span class="zs-t"></span><span class="zs-n"></span></div>
<button type="button" class="zs-x" aria-label="Close the story">${X_}</button>
<p class="zs-win"></p><div class="zs-acts"><button type="button" class="zs-read">Read the story</button><button type="button" class="zs-watch" hidden>${PLAY}Watch the film</button></div><div class="zs-bar"><i></i></div>`;
  box.style.setProperty('--zs-step',STEP+'ms');
  document.body.appendChild(box);
  box.querySelector('.zs-x').addEventListener('click',()=>{ markDone(slug); hide(); });
  box.querySelector('.zs-read').addEventListener('click',()=>{ markDone(slug); hide(); const b=document.querySelector('.zo-trigger'); window.ZFOrigins&&ZFOrigins.open(slug,b||undefined); });
  box.querySelector('.zs-watch').addEventListener('click',e=>{ hide(); window.ZFCinema&&ZFCinema.play(slug,e.currentTarget); });
  box.querySelector('.zs-bar i').addEventListener('animationend',e=>{ if(e.animationName==='zsBar') next(); });
}
function paint(k){
  const win=box.querySelector('.zs-win'), old=win.querySelector('.zs-line:not(.out)');
  if(old){ old.classList.remove('in'); old.classList.add('out'); setTimeout(()=>old.remove(),380); }
  const s=document.createElement('span'); s.className='zs-line in'; s.textContent=lines[k]; win.appendChild(s);
  box.querySelector('.zs-n').textContent=`${k+1} / ${lines.length}`;
  const bar=box.querySelector('.zs-bar i'); bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
}
function next(){ if(!box||!box.classList.contains('on')) return; if(leaving){ hide(); return; } i=(i+1)%lines.length; paint(i); }
function show(s){
  const d=(window.ZF_ORIGINS||{})[s]; lines=d&&Array.isArray(d.snippets)?d.snippets.filter(Boolean):[];
  if(!lines.length) return; build(); slug=s; i=0; leaving=false;
  const g=((window.ZF&&ZF.GAMES)||[]).find(x=>x.slug===s); box.querySelector('.zs-t').textContent=g?`The story behind ${g.name}`:'The story behind this game';
  box.querySelector('.zs-watch').hidden=!(window.ZFCinema&&ZFCinema.has(s));
  box.querySelector('.zs-win').innerHTML=''; paint(0);
  requestAnimationFrame(()=>box.classList.add('on'));
}
function hide(){ clearTimeout(timer); if(box){ box.classList.remove('on'); box.querySelector('.zs-bar i').classList.remove('run'); } }

/* a game starting: let the current line finish, then slide away */
const START_SEL='button.start, .gx-start-overlay button, #gsEntryStart';
document.addEventListener('click',e=>{ const t=e.target&&e.target.closest&&e.target.closest(START_SEL); if(!t) return;
  if(box&&box.classList.contains('on')) leaving=true; else clearTimeout(timer); },true);

function boot(){ const s=slugNow(); if(!s||!(window.ZF_ORIGINS||{})[s]||done().includes(s)) return; if(window.ZFCinema&&ZFCinema.pending(s)) return;   /* the film plays first and hands over to this card */ timer=setTimeout(()=>show(s),FIRST); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
window.ZFStoryTicker={ show, hide, done };
})();
