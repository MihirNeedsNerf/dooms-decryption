// Authoritative puzzle dataset for "Doom's Decryption: Strike & Decipher"
// Extracted and verified from DJS SIGAI event sheet

const WORDS = [
  { id: 1, word: 'POSTPONE', dir: 'down', row: 0, col: 0 },
  { id: 2, word: 'PEOPLE', dir: 'across', row: 0, col: 0 },
  { id: 3, word: 'OAT', dir: 'down', row: 0, col: 2 },
  { id: 4, word: 'SIT', dir: 'across', row: 2, col: 0 },
  { id: 5, word: 'OPEN', dir: 'across', row: 5, col: 0 },
  { id: 6, word: 'LOGIC', dir: 'down', row: 0, col: 4 },
  { id: 7, word: 'ENVELOPE', dir: 'down', row: 0, col: 5 },
  { id: 8, word: 'NANNY', dir: 'down', row: 5, col: 3 },
  { id: 9, word: 'YELLOW', dir: 'across', row: 9, col: 3 },
  { id: 10, word: 'PEN', dir: 'across', row: 6, col: 5 },
  { id: 11, word: 'CLONE', dir: 'across', row: 4, col: 4 },
  { id: 12, word: 'CANINE', dir: 'down', row: 2, col: 7 },
  { id: 13, word: 'NAIL', dir: 'down', row: 5, col: 9 },
  { id: 14, word: 'QUEEN', dir: 'down', row: 1, col: 8 },
  { id: 15, word: 'PIT', dir: 'across', row: 4, col: 0 },
  { id: 16, word: 'TEN', dir: 'down', row: 4, col: 2 }
];

// 59 Active Cells with their competing letters:
// top_left (TL), bottom_right (BR), and the target answer.
const ACTIVE_CELLS = {
  '0,0': { tl: 'P', br: 'T', target: 'P', noise: 'T' },
  '0,1': { tl: 'L', br: 'E', target: 'E', noise: 'L' },
  '0,2': { tl: 'A', br: 'O', target: 'O', noise: 'A' },
  '0,3': { tl: 'P', br: 'N', target: 'P', noise: 'N' },
  '0,4': { tl: 'L', br: 'E', target: 'L', noise: 'E' },
  '0,5': { tl: 'R', br: 'E', target: 'E', noise: 'R' },

  '1,0': { tl: 'H', br: 'O', target: 'O', noise: 'H' },
  '1,2': { tl: 'A', br: 'N', target: 'A', noise: 'N' },
  '1,4': { tl: 'C', br: 'O', target: 'O', noise: 'C' },
  '1,5': { tl: 'G', br: 'N', target: 'N', noise: 'G' },
  '1,8': { tl: 'Q', br: 'E', target: 'Q', noise: 'E' },

  '2,0': { tl: 'O', br: 'S', target: 'S', noise: 'O' },
  '2,1': { tl: 'U', br: 'I', target: 'I', noise: 'U' },
  '2,2': { tl: 'T', br: 'S', target: 'T', noise: 'S' },
  '2,4': { tl: 'P', br: 'G', target: 'G', noise: 'P' },
  '2,5': { tl: 'V', br: 'E', target: 'V', noise: 'E' },
  '2,7': { tl: 'C', br: 'X', target: 'C', noise: 'X' },
  '2,8': { tl: 'N', br: 'U', target: 'U', noise: 'N' },

  '3,0': { tl: 'T', br: 'N', target: 'T', noise: 'N' },
  '3,4': { tl: 'I', br: 'N', target: 'I', noise: 'N' },
  '3,5': { tl: 'E', br: 'S', target: 'E', noise: 'S' },
  '3,7': { tl: 'A', br: 'T', target: 'A', noise: 'T' },
  '3,8': { tl: 'E', br: 'T', target: 'E', noise: 'T' },

  '4,0': { tl: 'P', br: 'O', target: 'P', noise: 'O' },
  '4,1': { tl: 'I', br: 'Y', target: 'I', noise: 'Y' },
  '4,2': { tl: 'T', br: 'N', target: 'T', noise: 'N' },
  '4,4': { tl: 'S', br: 'C', target: 'C', noise: 'S' },
  '4,5': { tl: 'E', br: 'L', target: 'L', noise: 'E' },
  '4,6': { tl: 'O', br: 'V', target: 'O', noise: 'V' },
  '4,7': { tl: 'N', br: 'E', target: 'N', noise: 'E' },
  '4,8': { tl: 'A', br: 'E', target: 'E', noise: 'A' },

  '5,0': { tl: 'S', br: 'O', target: 'O', noise: 'S' },
  '5,1': { tl: 'N', br: 'P', target: 'P', noise: 'N' },
  '5,2': { tl: 'E', br: 'C', target: 'E', noise: 'C' },
  '5,3': { tl: 'N', br: 'E', target: 'N', noise: 'E' },
  '5,5': { tl: 'O', br: 'B', target: 'O', noise: 'B' },
  '5,7': { tl: 'H', br: 'I', target: 'I', noise: 'H' },
  '5,8': { tl: 'N', br: 'R', target: 'N', noise: 'R' },
  '5,9': { tl: 'N', br: 'R', target: 'N', noise: 'R' },

  '6,0': { tl: 'N', br: 'H', target: 'N', noise: 'H' },
  '6,2': { tl: 'N', br: 'S', target: 'N', noise: 'S' },
  '6,3': { tl: 'N', br: 'A', target: 'A', noise: 'N' },
  '6,5': { tl: 'D', br: 'P', target: 'P', noise: 'D' },
  '6,6': { tl: 'E', br: 'B', target: 'E', noise: 'B' },
  '6,7': { tl: 'T', br: 'N', target: 'N', noise: 'T' },
  '6,9': { tl: 'A', br: 'U', target: 'A', noise: 'U' },

  '7,0': { tl: 'E', br: 'S', target: 'E', noise: 'S' },
  '7,3': { tl: 'R', br: 'N', target: 'N', noise: 'R' },
  '7,5': { tl: 'E', br: 'D', target: 'E', noise: 'D' },
  '7,7': { tl: 'E', br: 'S', target: 'E', noise: 'S' },
  '7,9': { tl: 'F', br: 'I', target: 'I', noise: 'F' },

  '8,3': { tl: 'N', br: 'A', target: 'N', noise: 'A' },
  '8,9': { tl: 'L', br: 'N', target: 'L', noise: 'N' },

  '9,3': { tl: 'Y', br: 'T', target: 'Y', noise: 'T' },
  '9,4': { tl: 'I', br: 'E', target: 'E', noise: 'I' },
  '9,5': { tl: 'L', br: 'G', target: 'L', noise: 'G' },
  '9,6': { tl: 'L', br: 'T', target: 'L', noise: 'T' },
  '9,7': { tl: 'H', br: 'O', target: 'O', noise: 'H' },
  '9,8': { tl: 'W', br: 'S', target: 'W', noise: 'S' }
};

function calculateScore(errorCount) {
  if (errorCount === 0) return 15;
  if (errorCount <= 5) return 10;
  if (errorCount <= 8) return 5;
  return 0;
}

module.exports = {
  WORDS,
  ACTIVE_CELLS,
  calculateScore,
  TOTAL_ACTIVE_CELLS: 59,
  TIME_LIMIT_SECONDS: 10 * 60
};
