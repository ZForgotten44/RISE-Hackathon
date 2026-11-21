/* tools/game-pages.js: what each game's own page tells a search engine and a first-time visitor, keyed by the slugs in
   tools/games-list.js. build-routes.js writes it into the page's static HTML: the <title>, description, social tags and
   structured data, the game's heading, and the short "About" section under the game.
     t      the page title (search results show about 60 characters, so the game's name comes first)
     d      the meta description: one or two plain sentences, different for every game
     about  the About heading (defaults to "About <name>")
     intro  one or two sentences on what the game is, using the words people search for
     tip    a short, true piece of strategy (left out where the game is a story or a party game)
     ways   how it can be played here; only modes the game really supports (shared.js meta, ONLINE_IDS, PARTY_IDS)
     rel    up to three related games, linked by name
     genre  for the VideoGame structured data; play: its playMode values
   build-routes.js stops if a game is missing here, or two pages share a title or description. */
module.exports={
 'recursive-tic-tac-toe':{
  t:'Recursive Tic-Tac-Toe (Ultimate Tic-Tac-Toe) — Play Free | ZF Games',
  d:'Play Recursive Tic-Tac-Toe, also called Ultimate Tic-Tac-Toe, free on ZF Games: nine boards in one. Play an expert computer, a friend on one device, or online.',
  intro:'Recursive Tic-Tac-Toe, also known as Ultimate Tic-Tac-Toe, puts nine small tic-tac-toe boards inside one big one. The cell you choose sends your opponent to the matching board, so every move is also a choice of where they play next.',
  tip:'Before you mark a cell, look at the board it sends your opponent to. Avoid sending them to a board they can win, or to a closed board, which lets them play anywhere.',
  ways:'Against the computer (it plays at expert level), with two players on one device, or online with a friend.',
  rel:['notakto'],genre:'Strategy board game',play:['SinglePlayer','MultiPlayer']},
 'gold-coin':{
  t:'The Gold Coin Game — Play Free Online | ZF Games',
  d:'Play The Gold Coin game free on ZF Games. Learn the rules, explore the strategy, and challenge a friend or the computer.',
  about:'About the Gold Coin game',
  intro:'The Gold Coin is a two-player coin game played on a single row of spaces. Players take turns sliding one coin to the left or taking the leftmost coin, and whoever takes the gold coin wins. The rules fit in a sentence; the strategy takes longer to see.',
  tip:'Pair the coins from the right: the last coin with the one before it, and so on. The empty spaces inside each pair behave like piles in Nim, so the player who can keep those gaps balanced controls the game. The How to play lesson walks you through it on real boards.',
  ways:'Against the computer at three levels (Perfect never misses a win), with two players on one device, online with a friend, or through puzzles and your own boards.',
  rel:['nim','chomp'],genre:'Strategy game',play:['SinglePlayer','MultiPlayer']},
 'chomp':{
  t:'Chomp — Play the Poisoned Chocolate Game Free | ZF Games',
  d:'Play Chomp free on ZF Games: bite the chocolate bar, but never the poisoned square. Choose any board size and play an exact solver or a friend.',
  intro:'Chomp is a two-player game on a bar of chocolate squares. Each bite removes a square and every square below it and to its left. Whoever has to take the poisoned corner loses.',
  tip:'On any rectangle bigger than one square, the first player can always win, though nobody knows a simple rule for how. On a square board, bite next to the poison diagonally to leave an L, then copy every bite on the other arm.',
  ways:'Against a computer that solves the position exactly, or with two players on one device, on boards up to 20 × 20 or shapes you build.',
  rel:['nim','gold-coin'],genre:'Strategy game',play:['SinglePlayer','MultiPlayer']},
 'nim':{
  t:'Nim — Play the Classic Math Game Free Online | ZF Games',
  d:'Play Nim free on ZF Games: take tokens from one pile, and mind who takes the last one. Normal and misère rules, any piles you like, against the computer or a friend.',
  intro:'Nim is the classic two-player math game. Players take any number of tokens from a single pile, and in normal play whoever takes the last token wins. In misère Nim, the last token loses.',
  tip:'Write each pile size in binary and add the columns without carrying (the nim-sum). Leave your opponent a nim-sum of zero and you win. In misère play, do the same until only single tokens would be left, then leave an odd number of them.',
  ways:'Against the computer, with two players on one device, or online with a friend, with piles you list, build or generate.',
  rel:['gold-coin','chomp','notakto'],genre:'Strategy game',play:['SinglePlayer','MultiPlayer']},
 'pentago':{
  t:'Pentago — Play Free Online vs Computer or Friend | ZF Games',
  d:'Play Pentago free on ZF Games: place a marble, then twist one quadrant. Five in a row wins. Three computer levels, two players on one device, or online.',
  intro:'Pentago is a two-player game of five in a row with a twist. After placing a marble, you turn one of the four quadrants a quarter turn, which can build your line or break your opponent’s.',
  tip:'Every twist moves your marbles too. Before you turn a quadrant, check what it does to both players’ lines, including a five it might hand your opponent.',
  ways:'Against the computer at three levels, with two players on one device, or online with a friend.',
  rel:['toot-otto'],genre:'Strategy board game',play:['SinglePlayer','MultiPlayer']},
 'notakto':{
  t:'Notakto — Play the X-Only Tic-Tac-Toe Game Free | ZF Games',
  d:'Play Notakto free on ZF Games: tic-tac-toe where both players place X and whoever closes the last board loses. One or three boards, against the computer or a friend.',
  intro:'Notakto is a misère form of tic-tac-toe. Both players place X, a board with three in a row is closed, and whoever closes the last open board loses.',
  tip:'On a single board, the first player can force a win by starting in the centre. With three boards the winning side depends on how the boards combine, and the computer plays them perfectly.',
  ways:'Against the computer on one or three boards, with two players on one device, or online with a friend.',
  rel:['recursive-tic-tac-toe','nim'],genre:'Strategy board game',play:['SinglePlayer','MultiPlayer']},
 'toot-otto':{
  t:'TOOT & OTTO — Play the Letter Strategy Game Free | ZF Games',
  d:'Play TOOT & OTTO free on ZF Games: drop a T or an O and spell your word in a line of four, but never spell your opponent’s. Play the computer, a friend or online.',
  intro:'TOOT & OTTO is a Connect Four style game with letters. One player spells TOOT, the other OTTO, and each turn you drop a T or an O. A word counts no matter who dropped its letters.',
  tip:'Every letter you drop can help either word. Check whether your T or O finishes OTTO for your opponent before you look at what it does for TOOT.',
  ways:'Against the computer, with two players on one device, or online with a friend.',
  rel:['pentago'],genre:'Strategy board game',play:['SinglePlayer','MultiPlayer']},
 'sim':{
  t:'Sim — Play the Triangle Pencil Game Free | ZF Games',
  d:'Play Sim free on ZF Games: claim lines between six dots and never complete a triangle of your own. Play the computer, a friend on one device, or online.',
  intro:'Sim is a two-player pencil game on six dots. Players take turns claiming the lines between them, each in their own colour, and whoever completes a triangle in their own colour loses.',
  tip:'Sim can never end in a draw: with six dots, someone always finishes a triangle. With perfect play the second player wins, so the first player has to wait for a slip.',
  ways:'Against the computer, which plays the endgame exactly, with two players on one device, or online with a friend.',
  rel:['notakto'],genre:'Strategy game',play:['SinglePlayer','MultiPlayer']},
 'morabaraba':{
  t:'Morabaraba — Play the South African Cattle Game Free | ZF Games',
  d:'Play Morabaraba free on ZF Games: the Southern African game of cows and mills, now a recognised mind sport. Play the computer or a friend on one device.',
  intro:'Morabaraba is a two-player strategy game from Southern Africa, played on three nested squares with diagonals. Each side places twelve cows, then moves them; three in a line make a mill, and every new mill shoots an enemy cow.',
  tip:'Build a mill you can open and close: step one cow out and back in, and you shoot again every other turn.',
  ways:'Against the computer, at three levels, or with two players on one device.',
  rel:['chaupar','sim'],genre:'Strategy board game',play:['SinglePlayer','MultiPlayer']},
 'chaupar':{
  t:'Chaupar — Play the Indian Cross-and-Circle Game Free | ZF Games',
  d:'Play Chaupar free on ZF Games: the Indian race game behind Pachisi and Ludo, with long dice and partner colours. Play the computer or a friend on one device.',
  intro:'Chaupar is a race game from India, played on a cross-shaped board for centuries and the parent of Pachisi and Ludo. Each player runs two partner colours out from the centre, round the cross and home again, throwing three long dice.',
  tip:'Use the crossed safe squares: a piece standing there cannot be captured, so park there when an enemy is close behind.',
  ways:'Against the computer, at three levels, or with two players on one device. Quick or full length.',
  rel:['patolli','dasapada'],genre:'Board game',play:['SinglePlayer','MultiPlayer']},
 'dasapada':{
  t:'Dasapada — Play the Board Game the Buddha Banned | ZF Games',
  d:'Play Dasapada free on ZF Games: an ancient Indian ten-row game, rebuilt from period sources with nuts counted by fours. Play the computer or a friend.',
  intro:'Dasapada is the ten-row board game the Buddha listed among distractions for monks. Its rules were lost; this version is rebuilt from period evidence, and every rule is labelled: throws are grabs of nuts counted by fours, and each throw makes a piece lie down, rise, stand or walk.',
  tip:'When fewer than twelve nuts remain, count the pile: take it all if it leaves no remainder or two, never if it leaves one or three.',
  ways:'Against the computer, at three levels, or with two players on one device.',
  rel:['chaupar','patolli'],genre:'Board game',play:['SinglePlayer','MultiPlayer']},
 'patolli':{
  t:'Patolli — Play the Aztec Bean Game Free | ZF Games',
  d:'Play Patolli free on ZF Games: the Aztec and Maya race game on an X-shaped mat, rebuilt from the chroniclers with numbered beans. Play the computer or a friend.',
  intro:'Patolli was played across Mesoamerica, from the Classic Maya to the Aztec empire, until it was suppressed after the Spanish conquest. This version follows the chronicler Durán: numbered beans, six pebbles each, and every bean a separate move. Reconstructed rules are labelled.',
  tip:'Hit the enemy pebble that has gone farthest, and bring your own pebbles onto the mat early, even if it costs your biggest bean.',
  ways:'Against the computer, at three levels, or with two players on one device. Five or six beans.',
  rel:['chaupar','dasapada'],genre:'Board game',play:['SinglePlayer','MultiPlayer']},
};
