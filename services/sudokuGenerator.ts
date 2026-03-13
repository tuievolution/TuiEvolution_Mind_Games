import { Cell } from '../utils/types';
import { solveSudoku, isValidPlacement } from './sudokuSolver';

const createEmptyGrid = (): number[][] =>
  Array(9).fill(0).map(() => Array(9).fill(0));

function fillGrid(grid: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = shuffle(Array.from({ length: 9 }, (_, i) => i + 1));
        for (let num of nums) {
          if (isValidPlacement(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function removeCells(grid: number[][], difficulty: 'easy' | 'medium' | 'hard' | 'extreme') {
  let attempts = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 45 : difficulty === 'hard' ? 55 : 60;
  const puzzle = grid.map((row) => [...row]);

  while (attempts > 0) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);

    if (puzzle[row][col] !== 0) {
      const backup = puzzle[row][col];
      puzzle[row][col] = 0;

      const gridCopy = puzzle.map((r) => [...r]);
      if (!hasUniqueSolution(gridCopy)) {
        puzzle[row][col] = backup;
      } else {
        attempts--;
      }
    }
  }

  return puzzle;
}

function hasUniqueSolution(grid: number[][]): boolean {
  let count = 0;
  const solver = (r = 0, c = 0): boolean => {
    if (r === 9) {
      count++;
      return count > 1; // erken çıkış
    }
    if (grid[r][c] !== 0) {
      return solver(c === 8 ? r + 1 : r, (c + 1) % 9);
    }
    for (let num = 1; num <= 9; num++) {
      if (isValidPlacement(grid, r, c, num)) {
        grid[r][c] = num;
        if (solver(c === 8 ? r + 1 : r, (c + 1) % 9)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  };

  solver();
  return count === 1;
}

function shuffle(array: number[]): number[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function generateSudoku(difficulty: 'easy' | 'medium' | 'hard' | 'extreme'): {
  puzzle: Cell[][];
  solution: number[][];
} {
  const solution = createEmptyGrid();
  fillGrid(solution);

  const puzzleGrid = removeCells(solution, difficulty);

  const puzzle: Cell[][] = puzzleGrid.map((row, r) =>
    row.map((val, c) => ({
      value: val,
      readOnly: val !== 0,
      notes: [],
    }))
  );

  return { puzzle, solution };
}
