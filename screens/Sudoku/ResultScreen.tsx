import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../utils/types';


export default function ResultScreen() {

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();


  const { params } = useRoute<any>();
  // const navigation = useNavigation();
  const { colors } = useTheme();
  const [stars, setStars] = useState(0);
  const [totalStars, setTotalStars] = useState(0);

  const { time, mistakes, difficulty } = params;

  useEffect(() => {
    const computedStars = calculateStars(time, mistakes, difficulty);
    setStars(computedStars);
    saveResult(time, mistakes, difficulty, computedStars);
    updateTotalStars(computedStars);
  }, []);

  const calculateStars = (time: number, mistakes: number, difficulty: string) => {
    const maxTime = difficulty === 'hard' ? 900 : difficulty === 'medium' ? 600 : 400;
    let starCount = 5;
    if (time > maxTime) starCount -= 1;
    if (mistakes >= 1) starCount -= 1;
    if (mistakes >= 2) starCount -= 1;
    return Math.max(1, starCount);
  };

  const saveResult = async (time: number, mistakes: number, difficulty: string, stars: number) => {
    const history = JSON.parse(await AsyncStorage.getItem('history') || '[]');
    const updated = [{ time, mistakes, difficulty, stars, date: new Date().toISOString() }, ...history];
    await AsyncStorage.setItem('history', JSON.stringify(updated));
  };

  const updateTotalStars = async (earned: number) => {
    const current = parseInt(await AsyncStorage.getItem('stars') || '0', 10);
    const newTotal = current + earned;
    setTotalStars(newTotal);
    await AsyncStorage.setItem('stars', newTotal.toString());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>🎉 Completed!</Text>
      <Text style={{ color: colors.text }}>⏱️ Time: {Math.floor(time / 60)}m {time % 60}s</Text>
      <Text style={{ color: colors.text }}>❌ Mistakes: {mistakes}/3</Text>
      <Text style={{ color: colors.text }}>🏷️ Difficulty: {difficulty}</Text>
      <Text style={[styles.stars, { color: colors.text }]}>⭐ {stars} Stars</Text>
      <Text style={{ color: colors.text }}>Total Stars: {totalStars}</Text>
      <Button title="Back to Menu" onPress={() => navigation.navigate("Home")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 30, alignItems: 'center', flex: 1, justifyContent: 'center' },
  header: { fontSize: 24, marginBottom: 10 },
  stars: { fontSize: 20, marginVertical: 8 },
});
