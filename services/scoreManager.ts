import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveScore({ starsEarned, won }: { starsEarned: number; won: boolean }) {
  const data = await AsyncStorage.getItem('stats');
  const stats = data ? JSON.parse(data) : {
    gamesPlayed: 0,
    totalStars: 0,
    bestTime: null,
    streak: 0,
    totalHints: 0,
  };

  stats.gamesPlayed += 1;
  stats.totalStars += starsEarned;

  if (won) {
    stats.streak += 1;
  } else {
    stats.streak = 0;
  }

  await AsyncStorage.setItem('stats', JSON.stringify(stats));
}

export async function addHint(count = 1) {
  const data = await AsyncStorage.getItem('stats');
  const stats = data ? JSON.parse(data) : { totalHints: 0 };
  stats.totalHints += count;
  await AsyncStorage.setItem('stats', JSON.stringify(stats));
}

export async function useHint() {
  const data = await AsyncStorage.getItem('stats');
  const stats = data ? JSON.parse(data) : { totalHints: 0 };
  if (stats.totalHints > 0) {
    stats.totalHints -= 1;
    await AsyncStorage.setItem('stats', JSON.stringify(stats));
    return true;
  }
  return false;
}

export const getStats = async () => {
  const totalStars = parseInt(await AsyncStorage.getItem('stars') || '0', 10);
  const totalHints = parseInt(await AsyncStorage.getItem('hints') || '0', 10);
  return { totalStars, totalHints };
};


export async function clearStats() {
  await AsyncStorage.removeItem('stats');
}
