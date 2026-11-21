/* origins-data.js: the "Origins & stories" content for each game, keyed by the game's slug.
   NOTHING HERE IS INVENTED. Every game starts empty and unpublished. Real, source-supported content is added by people,
   and a section only appears in the panel once its `published` flag is true and it has content.
   The page caches this file with the game, so published history and images stay readable offline. Source websites still
   need a connection.

   Shape of one entry (every field is optional; leave out anything you can't source):
   {
     names: [                                   // original or local names. Never present a translated title as a traditional one.
       { text:'…', language:'…', script:'…', translit:'…', note:'…' }
     ],
     siteTitleIsTranslation: true,              // shows: "<site title>" is this site's English title, not a traditional name.
     where: { published:false,
       image: { src:'/origins/<slug>/….webp', alt:'…', credit:'…', creditUrl:'…' },   // one strong visual
       places: [ { label:'…', community:'…' } ],                                       // small location labels
       intro: ['short paragraph', '…'],                                               // source-supported description only
       uncertain: '…'                                                                 // shown as a quiet note under the intro
     },
     play: { published:false,
       image: { … },                             // optional single visual for the section
       variants: [                               // documented local versions, shown as a compact comparison
         { name:'…', place:'…', summary:'…', source:'…',
           explore: { game:'<slug>', … } }       // optional "Explore this board" miniature (see origins.js EXPLORE)
       ],
       siteRules: { version:'…', summary:'…', reconstructed:false, note:'…' }          // the exact rules this site plays
     },
     sources: { published:false,
       links: [ { title:'…', url:'https://…', publisher:'…', note:'…' } ],
       imageCredits: [ '…' ],
       contributors: [ { name:'…', role:'…', url:'…' } ],
       uncertainty: [ '…' ]                      // what is not known, disputed, or reconstructed
     }
   }

   Labels such as "Reconstructed rules" come from siteRules.reconstructed (and an optional note). */
(function(){
const root=typeof window!=='undefined'?window:self;
root.ZF_ORIGINS={
  'recursive-tic-tac-toe':{},
  'gold-coin':{},
  'chomp':{},
  'nim':{},
  'pentago':{},
  'notakto':{},
  'toot-otto':{},
  'sim':{}
};
})();
