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

   snippets: ['…', …]                           // 3–5 short lines from the story. story-ticker.js shows them one at a time
                                                // in the guide duck's bubble the first time a player starts the game.

   Labels such as "Reconstructed rules" come from siteRules.reconstructed (and an optional note). */
(function(){
const root=typeof window!=='undefined'?window:self;
root.ZF_ORIGINS={
  'nim':{
    snippets:["Around 300 BCE, an Indian scholar cracked binary.", "Pingala wrote poetry’s rhythms as light and heavy syllables: 0 and 1.", "That is binary, about 1,900 years before Europe “discovered” it.", "Beat Nim the same way: keep every binary column even."],
    where:{ published:true,
      places:[{label:'India', community:'Sanskrit prosody (Pingala)'}],
      intro:[
        'Binary, 2,000 years early. Around 300 BCE the Indian scholar Pingala wanted to list every possible rhythm in Sanskrit poetry. His trick: every syllable is light or heavy, a 0 or a 1. That is a binary counting system about 1,900 years before Europe "discovered" it.',
        'It is also how you beat Nim. Think of each heap in 0s and 1s, keep every column even, and the last stone is yours. Nim itself is old and its origin is unknown. Charles Bouton named it and published the winning strategy in 1901.'
      ],
      uncertain:'Nim does not come from Pingala. The link is the shared binary idea. The often-repeated Chinese origin ("jianshizi") is unsourced.'
    },
    sources:{ published:true, links:[
      {title:'Pingala', url:'https://en.wikipedia.org/wiki/Pingala', publisher:'Wikipedia'},
      {title:'Nim', url:'https://en.wikipedia.org/wiki/Nim', publisher:'Wikipedia'}
    ]}
  },
  'sim':{
    snippets:["Chokwe storytellers sweep one unbroken line around dots in the sand.", "They were solving graph theory long before Europe credited Euler.", "Sim is pure graph theory: six dots and two colours.", "Someone must close a triangle. Make sure it isn’t you."],
    where:{ published:true,
      places:[{label:'Angola, Zambia, DR Congo', community:'Chokwe sona drawers (akwa kuta sona)'}],
      intro:[
        'The sand drawers who beat Euler to it. Chokwe storytellers press dots into the sand and, mid-story, sweep one unbroken line around them without lifting a finger. To pull that off they were solving puzzles about points and paths, the maths Europe calls graph theory and credits to Euler in 1736.',
        'Sim is pure graph theory: six dots, two colours, and a guarantee that someone closes a triangle. Make sure it is not you. Gustavus Simmons invented Sim in 1969. The guarantee is Ramsey’s theorem, R(3,3) = 6.'
      ],
      uncertain:'Sim was not derived from sona. The link is the shared mathematics of points and lines. The age of the sona tradition is uncertain; it was documented in the 20th century and is older than that.'
    },
    sources:{ published:true, links:[
      {title:'Sona (sand drawings)', url:'https://en.wikipedia.org/wiki/Sona_(sand_drawings)', publisher:'Wikipedia', note:'See Paulus Gerdes, Geometry from Africa (1999).'},
      {title:'Sim (pencil game)', url:'https://en.wikipedia.org/wiki/Sim_(pencil_game)', publisher:'Wikipedia'}
    ]}
  },
  'gold-coin':{
    snippets:["Mancala: centuries of brain games, from Egypt to South Africa.", "Rows of pits trained lightning-fast mental arithmetic.", "On the Swahili coast, top bao players are local legends.", "Don’t chase the gold. Pair the coins from the right."],
    where:{ published:true,
      places:[{label:'Across Africa', community:'Mancala and bao players'}],
      intro:[
        'Africa’s oldest brain game. Mancala games, with seeds moving along rows of pits, have been played across Africa for many centuries, from Egypt to the Swahili coast to South Africa. They trained lightning-fast mental arithmetic and planning many moves ahead. On the Swahili coast, top bao players are treated like local legends.',
        'The Gold Coin runs on the same row logic. Do not chase the gold: pair the coins from the right, and the gold comes to you. The game is a version of the "Silver Dollar Game" from Berlekamp, Conway and Guy’s Winning Ways (1982).'
      ],
      uncertain:'The Gold Coin is not a mancala game. The link is shared row-and-counting play.'
    },
    sources:{ published:true, links:[
      {title:'Mancala', url:'https://en.wikipedia.org/wiki/Mancala', publisher:'Wikipedia'},
      {title:'Bao (game)', url:'https://en.wikipedia.org/wiki/Bao_(game)', publisher:'Wikipedia'}
    ]}
  },
  'pentago':{
    snippets:["The Maya ran time on interlocking wheels.", "Two calendars that line up only once every 52 years.", "The Maya used a true zero, centuries before Europe had one.", "Don’t play the board you see. Play the board after the twist."],
    where:{ published:true,
      places:[{label:'Mexico and Guatemala', community:'Maya astronomers and daykeepers (ajq’ij)'}],
      intro:[
        'The Maya ran the clock on wheels. A 260-day count and a 365-day year spun together and lined up only once every 52 years. To handle numbers that big, the Maya used a true zero, one of very few civilisations ever to invent it, centuries before Europe had it. Daykeepers still keep the 260-day count today.',
        'In Pentago every move spins a quarter of the board. Do not play the board you see; play the board after the turn. Pentago was designed by Tomas Flodén in Sweden (2005).'
      ],
      uncertain:'Pentago has no Maya origin. The link is the idea of turning, interlocking cycles.'
    },
    sources:{ published:true, links:[
      {title:'Maya calendar', url:'https://en.wikipedia.org/wiki/Maya_calendar', publisher:'Wikipedia'},
      {title:'Maya numerals', url:'https://en.wikipedia.org/wiki/Maya_numerals', publisher:'Wikipedia'},
      {title:'Pentago', url:'https://en.wikipedia.org/wiki/Pentago', publisher:'Wikipedia'}
    ]}
  },
  'notakto':{
    snippets:["Every dawn in Tamil Nadu, millions of doorsteps get a kolam.", "Rice-flour dots wrapped in loops: daily geometry, mother to daughter.", "Computer scientists study kolam to see how rules make patterns.", "Here you both draw X, and the last line of three loses."],
    where:{ published:true,
      places:[{label:'Tamil Nadu, South India', community:'Kolam artists, mostly women'}],
      intro:[
        'Maths on the doorstep, every morning. Every dawn in Tamil Nadu, millions of women draw a kolam: a grid of rice-flour dots wrapped in symmetrical loops, gone by nightfall and redrawn the next day. It is daily geometry training passed from mother to daughter, and computer scientists in Chennai have used it to study how rules generate patterns.',
        'Notakto is played on dot grids too, with a twist: you both draw the same X, and whoever makes the last line of three loses. It was named and solved by Thane Plambeck and Greg Whitehead in the 2010s.'
      ],
      uncertain:'Notakto does not come from kolam. The link is planning on a grid of dots.'
    },
    sources:{ published:true, links:[
      {title:'Kolam', url:'https://en.wikipedia.org/wiki/Kolam', publisher:'Wikipedia', note:'See Gift Siromoney et al. on kolam array grammars (1970s).'},
      {title:'Notakto', url:'https://en.wikipedia.org/wiki/Notakto', publisher:'Wikipedia'}
    ]}
  },
  'toot-otto':{
    snippets:["Vedic reciters kept texts perfect for 3,000 years without writing.", "They chanted forwards, then backwards, so no slip could hide.", "One Sanskrit poem tells one epic forwards and another backwards.", "TOOT and OTTO read both ways. Read every gap from both sides."],
    where:{ published:true,
      places:[{label:'India', community:'Vedic reciters and Sanskrit poets'}],
      intro:[
        'Chanting backwards to beat time. To keep a text perfect for 3,000 years without writing it down, Vedic reciters chanted it forwards, then backwards, then in pairs and loops, so a single wrong syllable stuck out at once. UNESCO lists Vedic chanting as world heritage. One Sanskrit poem, the Rāghavayādavīyam (c. 1650), tells one epic forwards and another backwards.',
        'TOOT and OTTO read both ways too, so read every gap from both sides. Toot and Otto is a modern Connect-Four-style letter game.'
      ],
      uncertain:'Toot and Otto has no Indian origin. The link is reading language in both directions.'
    },
    sources:{ published:true, links:[
      {title:'Vedic chanting', url:'https://en.wikipedia.org/wiki/Vedic_chant', publisher:'Wikipedia'},
      {title:'Rāghavayādavīyam', url:'https://en.wikipedia.org/wiki/Raghavayadaviyam', publisher:'Wikipedia'}
    ]}
  },
  'chomp':{
    snippets:["Before it was candy, chocolate was cash.", "In Aztec markets, cacao beans worked as small change.", "In 1545 a turkey cost 100 beans, and forgers filled beans with clay.", "Maths proves the first player can always win this bar."],
    where:{ published:true,
      places:[{label:'Mexico and Central America', community:'Mesoamerican cacao growers and traders'}],
      intro:[
        'When chocolate was money. People in Mesoamerica were brewing cacao more than 3,500 years ago, and in Aztec markets cacao beans worked as small change. A Spanish price list from 1545 puts a turkey at 100 beans, and forgers hollowed out beans and filled them with clay.',
        'In Chomp every bite costs you, and one square is poisoned. Maths proves the first player can always win. On a square bar, bite next to the poison corner, then mirror every move. Frederik Schuh described it as a number game (1952), and David Gale turned it into a chocolate bar (1974).'
      ],
      uncertain:'Chomp has no Mesoamerican origin. The link is chocolate itself.'
    },
    sources:{ published:true, links:[
      {title:'History of chocolate', url:'https://en.wikipedia.org/wiki/History_of_chocolate', publisher:'Wikipedia'},
      {title:'Chomp', url:'https://en.wikipedia.org/wiki/Chomp', publisher:'Wikipedia'}
    ]}
  },
  'recursive-tic-tac-toe':{
    snippets:["Honest truth: this one is modern, not ancient.", "It runs on recursion: things built from smaller copies of themselves.", "Every move wins a square and sends your opponent somewhere else.", "Plain tic-tac-toe draws. Nest it once and it becomes a battle."],
    where:{ published:true,
      intro:[
        'Tic-tac-toe, but every square is a game. Honest truth: this one is modern, not ancient. It blew up online in the 2010s. It runs on one of the most powerful ideas in computing, recursion: things built from smaller copies of themselves.',
        'Every move is two moves. You win a square in one small board, and you send your opponent to play somewhere else. Normal tic-tac-toe always draws; nest it once and it becomes a real battle. The inventor is unknown. Math teacher Ben Orlin popularised it in 2013.'
      ]
    },
    sources:{ published:true, links:[
      {title:'Ultimate tic-tac-toe', url:'https://en.wikipedia.org/wiki/Ultimate_tic-tac-toe', publisher:'Wikipedia'}
    ]}
  }
};
})();
