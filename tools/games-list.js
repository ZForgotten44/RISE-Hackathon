/* tools/games-list.js: the single list of public game routes, shared by build-routes.js (which writes each
   page) and build-sitemap.js (which lists each page's canonical URL) so the two can never drift apart. Listed in the
   site's game order (shared.js GAMES). */
module.exports=[['recursive-tic-tac-toe','Recursive Tic-Tac-Toe','Nine small boards, one big game.'],
 ['gold-coin','The Gold Coin','Slide a coin left or take the leftmost coin. Whoever takes the gold wins.'],
 ['chomp','Chomp','Bite a tile and everything below-left of it.'],
 ['nim','Nim','Take tokens from one pile. Mind who takes the last one.'],
 ['pentago','Pentago','Place a marble, then turn a quadrant. Five in a row wins.'],
 ['notakto','Notakto','Both play X. Close the last board and you lose.'],
 ['toot-otto','TOOT & OTTO','Drop T or O. Spell your word, not theirs.'],
 ['sim','Sim','Claim edges between six dots and never finish your own triangle.']];
