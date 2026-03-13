import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cell } from '../utils/types';

export const getStats = async () => {
  const stars = Number(await AsyncStorage.getItem('totalStars')) || 0;
  const hints = Number(await AsyncStorage.getItem('hintTokens')) || 0;
  return { stars, hints };
};

export const useHint = async () => {
  const stats = await getStats();
  if (stats.hints <= 0) return false;
  await AsyncStorage.setItem('hintTokens', (stats.hints - 1).toString());
  return true;
};

export const addStarsAndHints = async (starsToAdd: number) => {
  const { stars, hints } = await getStats();
  const newStars = stars + starsToAdd;
  const newHints = hints + Math.floor(newStars / 15) - Math.floor(stars / 15);
  await AsyncStorage.setItem('totalStars', newStars.toString());
  await AsyncStorage.setItem('hintTokens', newHints.toString());
};

export function getHint(grid: Cell[][], solution: number[][]): { row: number; col: number; value: number } | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c].value === 0) {
        return { row: r, col: c, value: solution[r][c] };
      }
    }
  }
  return null;
}
