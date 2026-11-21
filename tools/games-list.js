/* tools/games-list.js: the single list of public game routes, shared by build-routes.js (which writes each
   page) and build-sitemap.js (which lists each page's canonical URL) so the two can never drift apart. Listed in the
   site's game order (shared.js GAMES). */
module.exports=[['recursive-tic-tac-toe','Recursive Tic-Tac-Toe','Nine small boards, one big game.'],
 ['gold-coin','Bao Gold','Slide a coin left or take the leftmost coin. Whoever takes the gold wins.'],
 ['chomp','Cacao','Bite a tile and everything below-left of it.'],
 ['nim','Pingala’s Piles','Take tokens from one pile. Mind who takes the last one.'],
 ['pentago','Maya Wheels','Place a marble, then turn a quadrant. Five in a row wins.'],
 ['notakto','Kolam','Both play X. Close the last board and you lose.'],
 ['toot-otto','Viloma','Drop T or O. Spell your word, not theirs.'],
 ['sim','Sona','Claim edges between six dots and never finish your own triangle.'],
 ['morabaraba','Morabaraba','Make mills of three cows and shoot the enemy herd.'],
 ['chaupar','Chaupar','Race partner colours round the cross and home.'],
 ['dasapada','Dasapada','The ten-row game the Buddha banned, rebuilt from its own dice.'],
 ['patolli','Patolli','Throw the numbered beans and race round the X-shaped mat.']];
