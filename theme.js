/* theme.js: the one shared "invert" state for every page. Loaded in <head> so the attribute is set before first paint.
   Areas keep a base tone (see site.css); inverted swaps light and dark everywhere at once. */
(function(){
  const KEY='zf-invert', root=document.documentElement;
  const read=()=>{ try{ return localStorage.getItem(KEY)==='1'; }catch(e){ return false; } };
  let inv=read(); root.setAttribute('data-inv',inv?'1':'0');
  /* the tooltip says what clicking will DO, not what the current state IS -- so it's read against each button's
     own nearest [data-tone] ancestor (the button can sit in a section whose tone differs from others, per the
     checkerboard tone design), not a single sitewide label. index.html's scroll-spy calls ZFTheme.resync() too,
     so the label for the nav's own button keeps up as its data-tone changes while scrolling. */
  function effectiveTone(btn){ const el=btn.closest('[data-tone]'); const base=el?el.dataset.tone:'dark'; return (base==='light')!==inv?'light':'dark'; }
  /* thumb position and icon both track this same per-button effective tone (light=left+sun, dark=right+moon),
     not the raw global inv flag -- so they always agree with each other and with the tooltip below. */
  const SUN='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const MOON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 8.94 10.06A7 7 0 0 1 12 3Z" fill="currentColor"/></svg>';
  function sync(){ document.querySelectorAll('[data-theme-toggle]').forEach(b=>{ const now=effectiveTone(b); const t=now==='dark'?'Switch to light mode':'Switch to dark mode'; b.setAttribute('aria-label',t); b.title=t; b.dataset.toneNow=now; const knob=b.querySelector('.ts-knob'); if(knob) knob.innerHTML=now==='dark'?MOON:SUN; }); }
  function set(v,quiet){ v=!!v; if(v===inv&&!quiet) return inv; inv=v; root.setAttribute('data-inv',inv?'1':'0'); try{ localStorage.setItem(KEY,inv?'1':'0'); }catch(e){}
    sync(); document.dispatchEvent(new CustomEvent('zf-theme',{detail:{inverted:inv}})); return inv; }
  window.ZFTheme={ inverted:()=>inv, get:()=>inv?'inverted':'original', set, toggle:()=>set(!inv), resync:sync,
    tone:base=>((base==='light')!==inv)?'light':'dark' };   // the tone an area with this base tone shows right now
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-theme-toggle]'); if(b) ZFTheme.toggle(); });
  document.addEventListener('DOMContentLoaded',sync);
  addEventListener('storage',e=>{ if(e.key===KEY){ const v=e.newValue==='1'; if(v!==inv){ inv=v; root.setAttribute('data-inv',inv?'1':'0'); sync(); document.dispatchEvent(new CustomEvent('zf-theme',{detail:{inverted:inv}})); } } });
})();
