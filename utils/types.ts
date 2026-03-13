export type Cell = {
  value: number;
  readOnly: boolean;
  notes: number[];
};

// export type RootStackParamList = {
//   Home: undefined;
//   Difficulty: undefined;
//   Game: { difficulty?: 'easy' | 'medium' | 'hard' | 'extreme'; resume?: boolean };
//   Result: { time: number; mistakes: number; difficulty: string };
//   Stats: undefined;
// };
export type RootStackParamList = {
  Home: undefined;
  SudokuDifficulty: undefined;
  SudokuGame: { difficulty: "easy" | "medium" | "hard" | "extreme"; resume?: boolean };
  SudokuResult: { time: number; mistakes: number; difficulty: string };
  SudokuStats: undefined;
  MinesweeperDifficulty: undefined;
  MinesweeperGame: { rows: number; cols: number; mines: number };
  MinesweeperResult: { time: number; status: 'won' | 'lost' };
  

};
