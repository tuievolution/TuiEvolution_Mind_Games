import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveGame(gameState: any) {
  await AsyncStorage.setItem('savedGame', JSON.stringify(gameState));
}

export async function loadGame() {
  const data = await AsyncStorage.getItem('savedGame');
  return data ? JSON.parse(data) : null;
}

export async function clearSavedGame() {
  await AsyncStorage.removeItem('savedGame');
}
