/* feel.js: small, deliberate feedback for the controls every page shares.
   - A game card answers a hover once: the card lifts a little and its illustration gives one small wobble, then both
     settle. Nothing keeps moving while the pointer rests on it, so the labels stay easy to read.
   - On touch screens (no hover), pressing a card or a button gives the same acknowledgement as a quick press-in.
   - Picking an option in a segmented control gives the chosen option one small pop.
   - No sounds here: games already play their own move and result sounds, and a second one would stack.
   Everything is movement and opacity only, and none of it plays with reduced motion. Individual transform properties
   (translate, scale, rotate) are used so these never fight a component's own transform. */
(function(){
'use strict';
const CSS=`
.gcard{transition:translate .22s ease,box-shadow .22s ease}
@media (hover:hover){
  .gcard:hover{translate:0 -3px}
  .gcard:hover .art{animation:zfArt .62s cubic-bezier(.3,1.5,.5,1)}
}
@keyframes zfArt{0%{rotate:0deg;translate:0 0}35%{rotate:-2.5deg;translate:0 -5px}70%{rotate:1.2deg;translate:0 -2px}100%{rotate:0deg;translate:0 0}}
.gcard:active{scale:.985}
.start,.ls-btn,.e-learn,.playbtn,.gs-seg button,.on-choice button,.on-actions button,.gcustomize-entry button,.zr-acts button,.zmd-acts button,.zp-second,.gs-restart{transition-property:background-color,border-color,color,opacity,scale;transition-duration:.15s,.15s,.15s,.15s,.1s}
.start:active:not(:disabled),.ls-btn:active:not(:disabled),.e-learn:active,.playbtn:active,.gs-seg button:active:not(:disabled),.on-choice button:active,.on-actions button:active:not(:disabled),.gcustomize-entry button:active,.zr-acts button:active,.zmd-acts button:active,.zp-second:active,.gs-restart:active{scale:.96}
.zf-picked{animation:zfPick .3s cubic-bezier(.3,1.6,.5,1)}
@keyframes zfPick{0%{scale:.92}100%{scale:1}}
@media (prefers-reduced-motion:reduce){
  .gcard,.gcard:hover{translate:none;transition:none}.gcard:hover .art{animation:none}.gcard:active{scale:none}
  .zf-picked{animation:none}
}
`;
const st=document.createElement('style'); st.id='zf-feel-css'; st.textContent=CSS; document.head.appendChild(st);
/* the pop goes on the option that was actually picked, once, never on a re-render */
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('.gs-seg button'); if(!b||b.disabled) return;
  setTimeout(()=>{ if(!b.isConnected||!b.classList.contains('on')) return; b.classList.remove('zf-picked'); void b.offsetWidth; b.classList.add('zf-picked'); setTimeout(()=>b.classList.remove('zf-picked'),320); },0); });
})();
