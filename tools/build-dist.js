#!/usr/bin/env node
/* Copies the public site into dist/ (the folder Netlify publishes). Development files stay out of it.  Run after build-routes and version-assets. */
const fs=require('fs'), path=require('path'); const root=path.join(__dirname,'..'), out=path.join(root,'dist');
const SKIP=new Set(['dist','tools','docs','node_modules','.claude','.git','.github','.DS_Store','package.json','package-lock.json','serve.js','netlify.toml','README.md','CLAUDE.md','HANDOFF.md','.gitignore','server','render.yaml','README-ROOMS.md','wrangler.jsonc','.wrangler']);
fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
let n=0; const copy=(src,dst)=>{ const st=fs.statSync(src); if(st.isDirectory()){ fs.mkdirSync(dst,{recursive:true}); for(const f of fs.readdirSync(src)){ if(f==='.DS_Store') continue; copy(path.join(src,f),path.join(dst,f)); } } else { fs.copyFileSync(src,dst); n++; } };
for(const f of fs.readdirSync(root)){ if(SKIP.has(f)) continue; copy(path.join(root,f),path.join(out,f)); }
for(const need of ['index.html','arcade/index.html','404.html','shared.js']) if(!fs.existsSync(path.join(out,need))){ console.error('dist is missing '+need); process.exit(1); }
console.log('dist/ ready: '+n+' files');
