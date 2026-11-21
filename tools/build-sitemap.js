#!/usr/bin/env node
/* Writes sitemap.xml at the repo root (build-dist.js's blanket copy then carries it into dist/, same as every
   other top-level file -- no separate exclusion/copy rule to maintain). Lists the homepage, the arcade index, /join, /create, /story, /about,
   and every route in games-list.js, using their canonical https://zfgames.org/... form -- never a room/invite/
   preview URL, since those are query-params on these same static routes, not separate paths.
   Run as part of `npm run build` (node tools/build-sitemap.js), after build-routes.js/version-assets.js and
   before build-dist.js, so the freshly written file is already present when dist/ gets assembled. */
const fs=require('fs'), path=require('path'); const root=path.join(__dirname,'..');
const GAMES=require('./games-list.js');
const SITE='https://zfgames.org';

/* Not every route in games-list.js is live in production yet. Excluding a route here is a deliberate, temporary
   choice while it's still in development -- remove the slug from this set once it's actually deployed, so it
   isn't left out of the sitemap forever by accident. */
const EXCLUDE=new Set([]);

/* lastmod is the date of the last commit that touched the page, so it only moves when the page really changed
   (a fresh clone gives every file today's mtime, and Google stops trusting a lastmod that always says today).
   Falls back to the file's mtime outside a git checkout or for a file with no commits yet. */
const {execFileSync}=require('child_process');
function lastmodOf(relFile){
  try{ const d=execFileSync('git',['log','-1','--format=%cs','--',relFile],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(); if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; }catch(e){}
  try{ return fs.statSync(path.join(root,relFile)).mtime.toISOString().slice(0,10); }
  catch(e){ return new Date().toISOString().slice(0,10); }
}
function urlEntry(loc,lastmod,priority){
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
}

const entries=[
  urlEntry(SITE+'/', lastmodOf('index.html'), '1.0'),
  urlEntry(SITE+'/arcade', lastmodOf('arcade/index.html'), '0.8'),
  urlEntry(SITE+'/join', lastmodOf('join/index.html'), '0.8'),
  urlEntry(SITE+'/create', lastmodOf('create/index.html'), '0.8'),
  urlEntry(SITE+'/story', lastmodOf('story/index.html'), '0.6'),
];
GAMES.forEach(([slug])=>{
  if(EXCLUDE.has(slug)) return;
  entries.push(urlEntry(SITE+'/'+slug, lastmodOf(slug+'/index.html'), '0.7'));
});

const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root,'sitemap.xml'),xml);
console.log('sitemap.xml written: '+(entries.length)+' URLs'+(EXCLUDE.size?(' (excluded: '+[...EXCLUDE].join(', ')+')'):''));
