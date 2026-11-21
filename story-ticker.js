/* story-ticker.js: a game's story, told in passing. The first time a player starts a game, the guide duck (hint-duck.js)
   says one short line from that game's story (origins-data.js `snippets`), then swaps to the next line every few
   seconds, the same way it swaps a hint in place. The last line stays until it has been read, then the duck leaves.
   - Each line carries "Read the story", which opens the full Origins & stories panel (origins.js).
   - Shown once per game: the slug is remembered in localStorage (zf-story-seen), so it never nags on later plays.
     The Origins & stories button beside How to play reopens the full story at any time.
   - Closing the bubble (×, Escape) stops it. A hint, a coaching note or the rules drawer taking the duck stops it too:
     the ticker never fights the game for the duck.
   - No new visual element: the words sit in the existing duck bubble, with its own motion and reduced-motion rules. */
(function(){
'use strict';
const KEY='zf-story-seen', FIRST_DELAY=1400, STEP=5200;
const slugNow=()=>location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0];
const seen=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } };
const markSeen=slug=>{ try{ const s=seen(); if(!s.includes(slug)){ s.push(slug); localStorage.setItem(KEY,JSON.stringify(s)); } }catch(e){} };
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let run=0, timer=null, lastText='';

/* the bubble still shows our line (not a hint or a coaching note that replaced it) */
const stillOurs=()=>{ if(!window.ZFHintDuck||!ZFHintDuck.visible) return false; const t=document.querySelector('#zfHint .zh-say'); return !!t&&t.textContent.indexOf(lastText)===0; };
function stop(){ run++; clearTimeout(timer); }
function tell(slug){
  const d=(window.ZF_ORIGINS||{})[slug], lines=d&&Array.isArray(d.snippets)?d.snippets.filter(Boolean):[];
  if(!lines.length||!window.ZFHintDuck) return;
  if(ZFHintDuck.visible){ timer=setTimeout(()=>tell(slug),2500); return; }   // a hint or coaching note is up: wait for it
  const my=++run; markSeen(slug);
  const openStory=()=>{ stop(); ZFHintDuck.hide(); const b=document.querySelector('.zo-trigger'); window.ZFOrigins&&ZFOrigins.open(slug,b||undefined); };
  const say=i=>{ if(my!==run) return; if(i>0&&!stillOurs()){ stop(); return; }
    const last=i===lines.length-1; lastText=lines[i];
    ZFHintDuck.show({html:`${esc(lines[i])} <button type="button" class="sdk-act">Read the story</button>`,acts:[openStory],noSplit:true},{stay:last?false:true,mood:i===0?'happy':undefined});
    if(!last) timer=setTimeout(()=>say(i+1),STEP); };
  say(0); }

/* "first start" = the player presses Start game: a game's own Start button (startBtn, nStart, cStart, gxStart), the
   Start game button on the resting board, or the one in the settings dialog. One delegated listener covers them all. */
const START_SEL='button.start, .gx-start-overlay button, #gsEntryStart';
document.addEventListener('click',e=>{ const t=e.target&&e.target.closest&&e.target.closest(START_SEL); if(!t) return;
  const slug=slugNow(); if(!slug||!(window.ZF_ORIGINS||{})[slug]||seen().includes(slug)) return;
  clearTimeout(timer); timer=setTimeout(()=>tell(slug),FIRST_DELAY); },true);
window.ZFStoryTicker={ tell, stop, seen };
})();
