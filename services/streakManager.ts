import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveStreak = async () => {
  const current = parseInt(await AsyncStorage.getItem('streak') || '0', 10);
  await AsyncStorage.setItem('streak', (current + 1).toString());
};

export const resetStreak = async () => {
  await AsyncStorage.setItem('streak', '1');
};

export const loadStreak = async () => {
  return parseInt(await AsyncStorage.getItem('streak') || '1', 10);
};
