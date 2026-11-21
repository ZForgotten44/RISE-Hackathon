#!/usr/bin/env node
/* Search-readiness check for a deployed copy of the site (or a local one). Node 18+, no dependencies.
     node tools/seo-check.js                                   checks https://zfgames.org
     node tools/seo-check.js https://zfgames.org --all         also fetches every URL in the sitemap
     node tools/seo-check.js http://localhost:8080             a local build (canonicals still say zfgames.org)
     node tools/seo-check.js https://zfgames.org --mirror https://zfgames-org.<account>.workers.dev
                                                               also checks that a mirror/preview host answers noindex
   Prints a Markdown table for the homepage, /create, /join, /arcade and /story (status without following redirects,
   title, description, canonical, indexing), then the favicon, structured data, robots.txt and sitemap checks, then one
   row for every game in tools/games-list.js (its own heading in the first HTML, sitemap entry, links from the homepage
   and /arcade) and the old addresses that should redirect.
   Exits 1 if anything a search engine would trip on is wrong. */
const SITE='https://zfgames.org';
const PAGES=['/','/create','/join','/arcade','/story'];
const args=process.argv.slice(2);
const base=(args.find(a=>/^https?:\/\//.test(a)&&args[args.indexOf(a)-1]!=='--mirror')||SITE).replace(/\/+$/,'');
const mirror=args.includes('--mirror')?(args[args.indexOf('--mirror')+1]||'').replace(/\/+$/,''):null;
const all=args.includes('--all');
const UA='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) zfgames-seo-check';
let bad=0; const fail=msg=>{ bad++; console.log('  FAIL '+msg); }, ok=msg=>console.log('  ok   '+msg);

const get=(url,opts={})=>fetch(url,{redirect:'manual',headers:{'user-agent':UA},...opts});
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const head=html=>(html.match(/<head[\s\S]*?<\/head>/i)||[html])[0];
const attr=(tag,name)=>{ const m=tag.match(new RegExp('\\s'+name+'\\s*=\\s*("([^"]*)"|\'([^\']*)\')','i')); return m?decode(m[2]??m[3]):null; };
const tags=(html,re)=>html.match(re)||[];
const metaContent=(h,name)=>{ const t=tags(h,/<meta\b[^>]*>/gi).find(t=>(attr(t,'name')||'').toLowerCase()===name); return t?attr(t,'content'):null; };
const linkHref=(h,rel)=>{ const t=tags(h,/<link\b[^>]*>/gi).find(t=>(attr(t,'rel')||'').toLowerCase()===rel); return t?attr(t,'href'):null; };
const cell=s=>String(s??'—').replace(/\|/g,'\\|');

let robotsTxt='';
const robotsAllows=path=>{   /* the "User-agent: *" (or Googlebot) group's longest matching Allow/Disallow wins */
  let groups=[],cur=null,lastWasUA=false;
  for(const raw of robotsTxt.split(/\r?\n/)){ const line=raw.replace(/#.*/,'').trim(); if(!line) continue; const [k,...v]=line.split(':'); const key=k.trim().toLowerCase(), val=v.join(':').trim();
    if(key==='user-agent'){ if(!lastWasUA){ cur={agents:[],rules:[]}; groups.push(cur); } cur.agents.push(val.toLowerCase()); lastWasUA=true; continue; }
    lastWasUA=false; if(cur&&(key==='allow'||key==='disallow')&&val) cur.rules.push({allow:key==='allow',p:val}); }
  const g=groups.find(g=>g.agents.includes('googlebot'))||groups.find(g=>g.agents.includes('*')); if(!g) return true;
  const hits=g.rules.filter(r=>path.startsWith(r.p.replace(/\*.*$/,''))).sort((a,b)=>b.p.length-a.p.length||(b.allow-a.allow));
  return hits.length?hits[0].allow:true;
};

async function page(p){
  const url=base+p, res=await get(url), loc=res.headers.get('location');
  const html=res.status===200?await res.text():''; const h=head(html);
  const title=(h.match(/<title>([\s\S]*?)<\/title>/i)||[])[1];
  const metaRobots=metaContent(h,'robots')||metaContent(h,'googlebot');
  const xrt=res.headers.get('x-robots-tag');
  const noindex=/noindex|none/i.test((metaRobots||'')+' '+(xrt||''));
  const allowed=robotsAllows(p);
  return {p,url,status:res.status+(loc?' → '+loc:''),code:res.status,title:title&&decode(title.trim()),desc:metaContent(h,'description'),
    canonical:linkHref(h,'canonical'),indexing:res.status!==200?'no (not 200)':noindex?'no (noindex'+(xrt?' header':'')+')':!allowed?'no (robots.txt)':'yes',html};
}

(async()=>{
  console.log('Checking '+base+'  ('+new Date().toISOString()+')\n');
  try{ const r=await get(base+'/robots.txt'); robotsTxt=r.status===200?await r.text():''; }catch(e){ console.error('Cannot reach '+base+': '+e.message); process.exit(2); }

  const rows=[]; for(const p of PAGES) rows.push(await page(p));
  console.log('| URL | Title | Description | Canonical | HTTP | Indexing allowed |');
  console.log('|---|---|---|---|---|---|');
  for(const r of rows) console.log('| '+[r.url,r.title,r.desc,r.canonical,r.status,r.indexing].map(cell).join(' | ')+' |');
  console.log('\nPages');
  const titles=new Set();
  for(const r of rows){
    const want=SITE+(r.p==='/'?'/':r.p);
    if(r.code!==200) fail(r.p+' answers '+r.status+' (should be 200 with no redirect)');
    if(r.canonical!==want) fail(r.p+' canonical is '+r.canonical+' (should be '+want+')');
    if(r.indexing!=='yes') fail(r.p+' is not indexable: '+r.indexing);
    if(!r.title) fail(r.p+' has no <title>'); else if(titles.has(r.title)) fail(r.p+' repeats another page\'s title'); else titles.add(r.title);
    if(!r.desc) fail(r.p+' has no meta description');
    if(r.code===200&&r.canonical===want&&r.indexing==='yes'&&r.title&&r.desc) ok(r.p);
  }

  console.log('\nHomepage');
  const home=rows[0], hh=head(home.html);
  const ld=tags(hh,/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi).map(s=>{ try{ return JSON.parse(s.replace(/^<script[^>]*>|<\/script>$/gi,'')); }catch(e){ return null; } }).flat().find(o=>o&&o['@type']==='WebSite');
  if(!ld) fail('no WebSite structured data');
  else if(ld.name!=='Z Forgotten Games'||ld.url!==SITE+'/'||!['ZF Games','ZFGames'].every(n=>[].concat(ld.alternateName||[]).includes(n))) fail('WebSite structured data is '+JSON.stringify(ld));
  else ok('WebSite: '+JSON.stringify(ld));
  for(const [p,want] of [['/create','/create'],['/join','/join']])
    if(new RegExp('<a\\b[^>]*href="(https://zfgames\\.org)?'+want+'"','i').test(home.html)) ok('plain <a href="'+want+'"> link'); else fail('no plain <a href="'+want+'"> link on the homepage');

  console.log('\nFavicons (from the homepage <head>)');
  const icons=tags(hh,/<link\b[^>]*>/gi).filter(t=>/(^|\s)icon(\s|$)|apple-touch-icon/i.test(attr(t,'rel')||''));
  if(!icons.length) fail('no <link rel="icon"> on the homepage');
  let has48=false;
  for(const t of icons){
    const href=attr(t,'href'), u=new URL(href,base+'/'), r=await get(u.href), type=r.headers.get('content-type')||'', len=(await r.arrayBuffer()).byteLength;
    const sz=attr(t,'sizes')||''; const n=parseInt(sz,10); if(n&&n%48===0) has48=true;
    const line=href+' ('+(sz||attr(t,'rel'))+'): '+r.status+' '+type+' '+len+' bytes'+(robotsAllows(u.pathname)?'':', BLOCKED by robots.txt')+(r.headers.get('x-robots-tag')?' x-robots-tag: '+r.headers.get('x-robots-tag'):'');
    if(r.status===200&&/^image\//.test(type)&&len>0&&robotsAllows(u.pathname)) ok(line); else fail(line);
  }
  if(!has48) fail('no icon declared at a multiple of 48px (Google Search asks for 48x48 or larger)'); else ok('an icon is declared at a multiple of 48px');

  console.log('\nrobots.txt and sitemap');
  const sm=(robotsTxt.match(/^\s*sitemap:\s*(\S+)/im)||[])[1];
  if(sm===SITE+'/sitemap.xml') ok('robots.txt points to '+sm); else fail('robots.txt Sitemap line is '+sm);
  const sr=await get(base+'/sitemap.xml'), sx=sr.status===200?await sr.text():'';
  const locs=[...sx.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].trim());
  if(sr.status!==200) fail('sitemap.xml answers '+sr.status); else ok('sitemap.xml: '+locs.length+' URLs');
  for(const p of PAGES){ const want=SITE+p; if(!locs.includes(want)) fail('sitemap is missing '+want); }
  const off=locs.filter(l=>!l.startsWith(SITE+'/')||/[?#]/.test(l)); if(off.length) fail('sitemap has non-canonical URLs: '+off.join(', '));
  if(all){ for(const l of locs){ const r=await get(base+new URL(l).pathname); if(r.status!==200) fail(l+' answers '+r.status+(r.headers.get('location')?' → '+r.headers.get('location'):'')); } console.log('  checked all '+locs.length+' sitemap URLs'); }

  console.log('\nEvery game page (from tools/games-list.js)');
  const GAMES=require('./games-list.js'), arcadeHtml=(rows.find(r=>r.p==='/arcade')||{}).html||'';
  const linked=(html,slug)=>new RegExp('<a\\b[^>]*href="(https://zfgames\\.org)?/'+slug+'"','i').test(html);
  const grows=[], gtitles=new Map(), gdescs=new Map();
  for(const [slug,name] of GAMES){ const r=await page('/'+slug), want=SITE+'/'+slug, body=r.html.replace(/<head[\s\S]*?<\/head>/i,'');
    const h1s=[...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>decode(m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())).filter(Boolean);
    const probs=[];
    if(r.code!==200) probs.push('answers '+r.status);
    if(r.canonical!==want) probs.push('canonical '+r.canonical);
    if(r.indexing!=='yes') probs.push('not indexable: '+r.indexing);
    if(!r.title||!r.title.toLowerCase().includes(name.toLowerCase().replace(/^the /,''))) probs.push('title does not name the game');
    if(gtitles.has(r.title)) probs.push('same title as '+gtitles.get(r.title)); else gtitles.set(r.title,slug);
    if(!r.desc) probs.push('no description'); else if(gdescs.has(r.desc)) probs.push('same description as '+gdescs.get(r.desc)); else gdescs.set(r.desc,slug);
    if(h1s.length!==1||h1s[0]!==name) probs.push('first-HTML h1 is '+JSON.stringify(h1s));
    if(!/<section class="zf-about"/.test(body)) probs.push('no About section');
    const inMap=locs.includes(want); if(!inMap) probs.push('not in sitemap');
    const fromHome=linked(home.html,slug), fromArcade=linked(arcadeHtml,slug); if(!fromHome) probs.push('no link from /'); if(!fromArcade) probs.push('no link from /arcade');
    probs.forEach(m=>fail('/'+slug+': '+m)); if(!probs.length) ok('/'+slug);
    grows.push([name,want,r.title,r.indexing,r.canonical===want?'self':r.canonical,inMap?'yes':'no',(fromHome?'/':'')+(fromHome&&fromArcade?' and ':'')+(fromArcade?'/arcade':''),probs.join('; ')||'none']); }
  console.log('\n| Game | Public URL | Title | Indexable | Canonical | Sitemap | Linked from | Problems |\n|---|---|---|---|---|---|---|---|');
  for(const g of grows) console.log('| '+g.map(cell).join(' | ')+' |');

  console.log('\nOld addresses');
  const fs=require('fs'), redirects=fs.readFileSync(require('path').join(__dirname,'..','_redirects'),'utf8').split('\n').map(l=>l.trim().split(/\s+/)).filter(m=>m.length>=3&&m[0][0]==='/');
  for(const [from,to,code] of redirects){ const r=await get(base+from), loc=r.headers.get('location')||'';
    if(String(r.status)===code&&loc.replace(/^https?:\/\/[^/]+/,'')===to) ok(from+' → '+r.status+' '+to); else fail(from+' answers '+r.status+(loc?' → '+loc:'')+' (should be '+code+' → '+to+')'); }

  if(mirror){
    console.log('\nMirror / preview host '+mirror);
    for(const p of ['/','/create']){ const r=await get(mirror+p), x=r.headers.get('x-robots-tag')||'';
      if(/noindex/i.test(x)) ok(p+': '+r.status+', x-robots-tag: '+x); else fail(p+': '+r.status+', no noindex header (it could compete with zfgames.org in search)'); }
  }

  console.log('\n'+(bad?bad+' problem(s) found.':'All checks passed.'));
  process.exit(bad?1:0);
})();
