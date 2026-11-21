/* cursor.js: the site's one custom cursor (a small triangle) and its states.
   The native cursor is hidden everywhere the custom one is active, including nested SVG/canvas children,
   and comes back over text fields and selectable text, where the custom cursor hides instead. */
(function(){
  if(matchMedia('(pointer: coarse)').matches||!matchMedia('(hover: hover)').matches) return;     // touch: native only
  const css=`
body.zf-cursor,body.zf-cursor *,body.zf-cursor *::before,body.zf-cursor *::after{cursor:none!important}
body.zf-cursor input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]),body.zf-cursor textarea,body.zf-cursor [contenteditable="true"],
body.zf-cursor #tout,body.zf-cursor #tout *,body.zf-cursor #rbody,body.zf-cursor #rbody *,body.zf-cursor .zf-text,body.zf-cursor .zf-text *{cursor:text!important}
#zfcur{position:fixed;left:0;top:0;z-index:2147483000;pointer-events:none;display:none;will-change:transform}
body.zf-cursor #zfcur.show{display:block}
#zfcur svg,#zfcur .c-lbl{position:absolute;pointer-events:none;display:none}
#zfcur .c-tri path{fill:var(--cur-fill,#fff);stroke:var(--cur-line,#111);stroke-width:1.5;stroke-linejoin:round;transition:fill .12s}
#zfcur .c-out{fill:var(--cur-line,#111);stroke:var(--cur-line,#111);stroke-width:3;stroke-linejoin:round}
#zfcur .c-in{fill:var(--cur-fill,#fff)}
#zfcur .c-crossout{stroke:var(--cur-line,#111);stroke-width:4;stroke-linecap:round;fill:none}
#zfcur .c-crossin{stroke:var(--cur-fill,#fff);stroke-width:1.8;stroke-linecap:round;fill:none}
#zfcur .c-tri{display:block;left:-1px;top:-1px;width:18px;height:18px;overflow:visible;transform-origin:1px 1px;transition:transform .12s}
#zfcur.click .c-tri{transform:scale(1.3) rotate(-9deg)}
#zfcur.tight .c-tri{transform:scale(.86)}
#zfcur.grab .c-tri,#zfcur.grabbing .c-tri,#zfcur.precise .c-tri{display:none}
#zfcur .c-grab,#zfcur .c-grabbing,#zfcur .c-cross{left:-12px;top:-12px;width:24px;height:24px;overflow:visible}
#zfcur.grab .c-grab{display:block}#zfcur.grabbing .c-grabbing{display:block}#zfcur.precise .c-cross{display:block}
#zfcur .c-lbl{left:18px;top:16px;font:600 10px/1 var(--font-mono,monospace);letter-spacing:.1em;color:#fff;background:rgba(17,17,17,.82);padding:4px 6px;border-radius:5px;white-space:nowrap;opacity:0;transition:opacity .12s}
#zfcur.lbl .c-lbl{display:block;opacity:1}
`;
  let el,ready=false,x=-99,y=-99,pressed=false,state='';
  function build(){
    const st=document.createElement('style'); st.id='zf-cursor-css'; st.textContent=css; document.head.appendChild(st);
    el=document.createElement('div'); el.id='zfcur'; el.setAttribute('aria-hidden','true');
    el.innerHTML=`<svg class="c-tri" viewBox="0 0 18 18"><path d="M1 1L15.2 6.4 6.8 14.6Z"/></svg>
<svg class="c-grab" viewBox="0 0 24 24"><g class="c-out"><rect x="5" y="11" width="14" height="9" rx="3.5"/><rect x="5.2" y="6" width="2.8" height="8" rx="1.4"/><rect x="8.8" y="3.4" width="2.8" height="10" rx="1.4"/><rect x="12.4" y="3.4" width="2.8" height="10" rx="1.4"/><rect x="16" y="6" width="2.8" height="8" rx="1.4"/></g><g class="c-in"><rect x="5" y="11" width="14" height="9" rx="3.5"/><rect x="5.2" y="6" width="2.8" height="8" rx="1.4"/><rect x="8.8" y="3.4" width="2.8" height="10" rx="1.4"/><rect x="12.4" y="3.4" width="2.8" height="10" rx="1.4"/><rect x="16" y="6" width="2.8" height="8" rx="1.4"/></g></svg>
<svg class="c-grabbing" viewBox="0 0 24 24"><g class="c-out"><rect x="4.5" y="9" width="15" height="10" rx="4.5"/><circle cx="7.6" cy="9" r="2.1"/><circle cx="10.9" cy="8.2" r="2.1"/><circle cx="14.1" cy="8.2" r="2.1"/><circle cx="17.2" cy="9" r="2.1"/></g><g class="c-in"><rect x="4.5" y="9" width="15" height="10" rx="4.5"/><circle cx="7.6" cy="9" r="2.1"/><circle cx="10.9" cy="8.2" r="2.1"/><circle cx="14.1" cy="8.2" r="2.1"/><circle cx="17.2" cy="9" r="2.1"/></g></svg>
<svg class="c-cross" viewBox="0 0 24 24"><g class="c-crossout"><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></g><g class="c-crossin"><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></g></svg><div class="c-lbl"></div>`;
    document.body.appendChild(el);
  }
  const TEXT='input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]),textarea,[contenteditable="true"],#tout,#rbody,.zf-text';
  const DRAG='[data-cursor-drag]';
  const PRECISE='[data-cursor-precise],.cell,.tile,.zcell,.zc-tile,.zn-tok,.tok:not(.column),.ze .zcell';
  const CLICK='a[href],button:not(:disabled),[role=button],summary,label,select,input[type=checkbox],input[type=radio],input[type=range],[tabindex]:not([tabindex="-1"]),[data-cursor]';
  function classify(t){
    if(!t||!t.closest) return '';
    if(t.closest(TEXT)) return 'text';
    if(t.closest(PRECISE)) return 'precise';
    if(t.closest(DRAG)) return pressed?'grabbing':'grab';
    if(t.closest(CLICK)) return 'click';
    return '';
  }
  function apply(t){
    const s=classify(t); const lbl=t&&t.closest?t.closest('[data-cursor]'):null;
    if(s==='text'){ el.classList.remove('show'); return; }
    el.classList.add('show');
    if(s!==state){ el.classList.remove('click','grab','grabbing','precise'); if(s) el.classList.add(s); state=s; }
    const text=lbl?lbl.dataset.cursor:''; el.classList.toggle('lbl',!!text&&(s==='click'||s==='grab')); if(text) el.querySelector('.c-lbl').textContent=text;
  }
  function move(e){
    if(e.pointerType==='touch'){ document.body.classList.remove('zf-cursor'); el&&el.classList.remove('show'); ready=false; return; }
    try{
      if(!ready){ if(!el) build(); document.body.classList.add('zf-cursor'); ready=true; }
      x=e.clientX; y=e.clientY; el.style.transform=`translate(${x}px,${y}px)`; const zone=e.target.closest&&e.target.closest('[data-tone]'); el.dataset.tone=zone?zone.dataset.tone:'dark'; apply(e.target);
    }catch(err){ document.body.classList.remove('zf-cursor'); if(el) el.remove(); el=null; ready=false; removeEventListener('pointermove',move,true); }   // fall back to the native pointer
  }
  addEventListener('pointermove',move,{passive:true,capture:true});
  addEventListener('pointerdown',e=>{ if(e.pointerType==='touch') return; pressed=true; if(el){ el.classList.add('tight'); apply(e.target); } },true);
  addEventListener('pointerup',e=>{ pressed=false; if(el){ el.classList.remove('tight'); apply(document.elementFromPoint(e.clientX,e.clientY)||e.target); } },true);
  addEventListener('pointercancel',()=>{ pressed=false; if(el) el.classList.remove('tight'); },true);
  document.documentElement.addEventListener('mouseleave',()=>{ if(el) el.classList.remove('show'); });
  document.documentElement.addEventListener('mouseenter',()=>{ if(el&&ready) el.classList.add('show'); });
  window.ZFCursor={ pressed:v=>{ pressed=!!v; } };
})();
