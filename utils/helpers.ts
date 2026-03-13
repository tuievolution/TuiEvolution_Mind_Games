import { Cell } from './types';
import { solveSudoku } from '../services/sudokuSolver';


export const cloneGrid = (grid: Cell[][]): Cell[][] =>
  grid.map((row) => row.map((cell) => ({ ...cell, notes: [...cell.notes] })));

export const isComplete = (grid: Cell[][], solution: number[][]): boolean =>
  grid.every((row, r) =>
    row.every((cell, c) => cell.value === solution[r][c])
  );
