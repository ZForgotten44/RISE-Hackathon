#!/usr/bin/env node
/* Writes one real, self-contained page for every route from tools/arcade-template.html:
     /arcade  (arcade/index.html)      /nim  (nim/index.html)  ...  and arcade.html for old links.
   Every page loads the same scripts and styles from absolute paths and picks its game from location.pathname,
   so a host only has to serve the file for the path. A renamed game keeps its old address: _redirects sends it on with a
   301 (Cloudflare and Netlify read that file), and a small page at the old path does the same where it is not read. Run after changing tools/arcade-template.html:  node tools/build-routes.js */
const fs=require('fs'),path=require('path'); const root=path.join(__dirname,'..'); const {stamp}=require('./version-assets');
const tpl=fs.readFileSync(path.join(__dirname,'arcade-template.html'),'utf8');
const GAMES=require('./games-list.js'); // shared with build-sitemap.js so the two can't drift apart
const SEO=require('./game-pages.js');   // each game's title, description and About section
const SITE='https://zfgames.org';
const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
const txt=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
/* every game needs its own page text, and no two pages may share a title or a description */
{ const miss=GAMES.filter(([slug])=>!SEO[slug]).map(([s])=>s); if(miss.length) throw new Error('tools/game-pages.js has no entry for: '+miss.join(', '));
  for(const k of ['t','d']){ const seen=new Map(); GAMES.forEach(([slug])=>{ const v=SEO[slug][k]; if(seen.has(v)) throw new Error(`${slug} and ${seen.get(v)} share the same ${k==='t'?'title':'description'}`); seen.set(v,slug); }); } }
const NAME={}; GAMES.forEach(([slug,name])=>NAME[slug]=name);
/* the plain list of game links inside #zfgrid: crawlers and visitors without scripts get every game by name; shared.js's
   renderGrid replaces it with the cards as soon as it runs */
const LIST='<ul class="zf-gamelist">'+GAMES.map(([slug,name,desc])=>`<li><a href="/${slug}">${txt(name)}</a> <span>${txt(desc)}</span></li>`).join('')+'</ul>';
function page(title,p,desc,o){ o=o||{};
  return tpl.replace('{{TITLE}}',esc(title).replace(/&quot;/g,'"')).replace('{{PATH}}',p).replace('{{DESC}}',esc(desc))
    .replace('{{HEAD}}',o.head||'').replace('<div id="zfgrid"></div>','<div id="zfgrid">'+LIST+'</div>').replace('{{ABOUT}}',o.about||''); }
const out=[]; const write=(rel,html)=>{ const f=path.join(root,rel); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,stamp(html)); out.push(rel); };
const ARCADE_DESC='Every free game on Z Forgotten Games in one place: strategy board games you can play solo, on one device, or online with friends.';
const social=(title,url,desc)=>`<meta property="og:type" content="website">\n<meta property="og:site_name" content="Z Forgotten Games">\n<meta property="og:url" content="${url}">\n<meta property="og:title" content="${esc(title)}">\n<meta property="og:description" content="${esc(desc)}">\n<meta name="twitter:card" content="summary">\n<meta name="twitter:title" content="${esc(title)}">\n<meta name="twitter:description" content="${esc(desc)}">\n`;
const ld=o=>`<script type="application/ld+json">\n${JSON.stringify(o).replace(/</g,'\\u003c')}\n</script>\n`;
const crumbs=list=>({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:list.map(([name,url],i)=>({'@type':'ListItem',position:i+1,name,item:url}))});
const arcadeHead=social('Arcade · Z Forgotten Games',SITE+'/arcade',ARCADE_DESC)+ld(crumbs([['Z Forgotten Games',SITE+'/'],['All games',SITE+'/arcade']]));
write('arcade/index.html',page('Arcade · Z Forgotten Games','/arcade',ARCADE_DESC,{head:arcadeHead}));
write('arcade.html',page('Arcade · Z Forgotten Games','/arcade',ARCADE_DESC,{head:arcadeHead}));
/* the heading each game's entry screen shows (its id is <prefix>Title, its one-line premise <prefix>Blurb). The scripts
   fill the same heading again when they run; writing it here means the first HTML already names the game. */
const ENTRY={nim:'nim',chomp:'ch'};
const entryOf=slug=>ENTRY[slug]||'gx';   // every other game uses the shared entry screen (games2/3/4.js)
function gamePage(slug,name,desc){ const m=SEO[slug], url=SITE+'/'+slug;
  const head=social(m.t,url,m.d)+ld({'@context':'https://schema.org','@type':'VideoGame',name,url,description:m.d,genre:m.genre,playMode:m.play,
      gamePlatform:'Web browser',applicationCategory:'Game',operatingSystem:'Any',isAccessibleForFree:true,inLanguage:'en',
      publisher:{'@type':'Organization',name:'Z Forgotten Games',url:SITE+'/'}})
    +ld(crumbs([['Z Forgotten Games',SITE+'/'],['All games',SITE+'/arcade'],[name,url]]));
  const links=[`<a href="/${slug}#rules">How to play ${txt(name)}</a>`,...(m.rel||[]).map(r=>`<a href="/${r}">${txt(NAME[r])}</a>`),'<a href="/arcade">All games</a>'];
  const about=`<section class="zf-about" id="aboutGame" data-slug="${slug}" aria-labelledby="aboutGameH">\n  <h2 id="aboutGameH">${txt(m.about||'About '+name)}</h2>\n  <p>${txt(m.intro)}</p>\n`
    +(m.tip?`  <h3>Strategy</h3>\n  <p>${txt(m.tip)}</p>\n`:'')+`  <h3>Ways to play</h3>\n  <p>${txt(m.ways)}</p>\n`
    +`  <div class="sitelinks" role="navigation" aria-label="More games">${links.join('')}</div>\n</section>`;
  const e=entryOf(slug);
  let html=page(m.t,'/'+slug,m.d,{head,about})
    .replace('<h1 class="display">Games</h1>','<h2 class="display">Games</h2>')   // the game's own name is this page's main heading
    .replace(`id="${e}Title"></h1>`,`id="${e}Title">${txt(name)}</h1>`).replace(`id="${e}Blurb"></p>`,`id="${e}Blurb">${txt(desc)}</p>`);
  if(!html.includes(`id="${e}Title">${txt(name)}</h1>`)) throw new Error('no entry heading for '+slug);
  return html; }
GAMES.forEach(([slug,name,desc])=>write(slug+'/index.html',gamePage(slug,name,desc)));
/* the homepage footer names every game, so the first HTML of the homepage links to each one */
{ const f=path.join(root,'index.html'), home=fs.readFileSync(f,'utf8'), re=/<!-- games:start -->[\s\S]*?<!-- games:end -->/;
  if(!re.test(home)) throw new Error('index.html has no <!-- games:start --> marker');
  fs.writeFileSync(f,home.replace(re,'<!-- games:start --><div class="sitelinks footgames" role="navigation" aria-label="Games">'+GAMES.map(([slug,name])=>`<a href="/${slug}">${txt(name)}</a>`).join('')+'</div><!-- games:end -->')); out.push('index.html (footer)'); }

/* renamed games: [old slug, new slug]. The old page only forwards; it is not in the sitemap. */
const MOVED=[];
MOVED.forEach(([from,to])=>write(from+'/index.html',`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Moved · Z Forgotten Games</title><meta name="robots" content="noindex"><link rel="canonical" href="https://zfgames.org/${to}"><meta http-equiv="refresh" content="0; url=/${to}"><script>location.replace('/${to}'+location.search+location.hash)</script></head><body><p>This game moved to <a href="/${to}">/${to}</a>.</p></body></html>\n`));
/* retired addresses that were never a game: the old party hub became cards in All Games */
const RETIRED=[['recursive-tic-tac-toe','arcade']];
fs.writeFileSync(path.join(root,'_redirects'),'# Renamed games and retired pages keep their old addresses (written by tools/build-routes.js)\n'+MOVED.concat(RETIRED).map(([a,b])=>`/${a} /${b} 301\n/${a}/ /${b} 301`).join('\n')+'\n');
console.log(out.length+' pages written: '+out.join(', '));
