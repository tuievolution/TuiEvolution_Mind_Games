// Simplified backtracking solver & generator
function isValid(board: number[][], row: number, col: number, num: number): boolean {
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num || board[x][col] === num) return false;
    }
    const r = Math.floor(row / 3) * 3;
    const c = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        if (board[r + i][c + j] === num) return false;
    return true;
  }
  
  function solve(board: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              if (solve(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }
  
  function generateFullBoard(): number[][] {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    solve(board);
    return board;
  }
  
  function removeCells(board: number[][], difficulty: 'easy' | 'medium' | 'hard'): number[][] {
    const count = { easy: 35, medium: 45, hard: 55 }[difficulty];
    const newBoard = JSON.parse(JSON.stringify(board));
    let removed = 0;
    while (removed < count) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (newBoard[row][col] !== 0) {
        newBoard[row][col] = 0;
        removed++;
      }
    }
    return newBoard;
  }
  
  export function generateSudoku(difficulty: 'easy' | 'medium' | 'hard') {
    const solution = generateFullBoard();
    const puzzle = removeCells(solution, difficulty);
    return { puzzle, solution };
  }
  
  export function solveSudoku(board: number[][]): number[][] | null {
    const copy = JSON.parse(JSON.stringify(board));
    return solve(copy) ? copy : null;
  }
  