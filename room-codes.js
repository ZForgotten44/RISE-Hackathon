/* room-codes.js: the one set of room-code rules, shared by the servers that make codes (server/room-server.js,
   server/party/core.js, server/pond.js, server/trap.js, server/tail.js) and the pages that read them (/join). Loaded with require() on the server and
   as a plain script in the browser (window.ZFRoomCodes).
     friend: Online friend rooms (two-player games), 6 letters and digits without O/0, I/1 or L
     party:  party rooms, 4 consonants (four of them never spell a word, and are easy to read aloud)
     pond:   Same Pond, the same 4 consonants
     trap:   Duck Trap, the same 4 consonants
     tail:   Tail Thief, the same 4 consonants */
(function(root,make){ const m=make(); if(typeof module==='object'&&module.exports) module.exports=m; else root.ZFRoomCodes=m; })(this,function(){
  const CONSONANTS='BCDFGHJKLMNPQRSTVWXZ';
  const KINDS={ friend:{alphabet:'ABCDEFGHJKMNPQRSTUVWXYZ23456789',length:6}, party:{alphabet:CONSONANTS,length:4}, pond:{alphabet:CONSONANTS,length:4}, trap:{alphabet:CONSONANTS,length:4}, tail:{alphabet:CONSONANTS,length:4} };
  /* what a person typed or pasted: any case, spaces or dashes anywhere, or a whole invite link (its ?room= is used) */
  function normalize(raw){ raw=String(raw==null?'':raw).trim(); const m=/[?&]room=([A-Za-z0-9 -]+)/.exec(raw); if(m) raw=m[1]; return raw.replace(/[\s-]+/g,'').toUpperCase(); }
  /* the kinds of room a code could belong to (empty: not a room code at all) */
  function kindsOf(code){ return Object.keys(KINDS).filter(k=>{ const K=KINDS[k]; return code.length===K.length&&[...code].every(c=>K.alphabet.includes(c)); }); }
  /* a fresh code of one kind; rand(n) returns an integer in [0,n) (crypto.randomInt on the server) */
  function make(kind,rand){ const K=KINDS[kind]; let c=''; for(let i=0;i<K.length;i++) c+=K.alphabet[rand(K.alphabet.length)]; return c; }
  return { KINDS, normalize, kindsOf, make };
});
