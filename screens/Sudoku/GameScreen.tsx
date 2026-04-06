import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Cell } from '../../utils/types';
import { generateSudoku } from '../../services/sudokuGenerator';
import { cloneGrid, isComplete } from '../../utils/helpers';
import { saveStreak, resetStreak } from '../../services/streakManager';
import { loadGame, saveGame, clearSavedGame } from '../../storage/storageUtils';
// 🚨 IMPORT UPDATED HINT FUNCTIONS
import { useHint, getSudokuHint, getStats } from '../../services/hintManager';
import { useTheme } from '../../context/ThemeContext';

export default function GameScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SudokuGame'>>();
  const difficulty = route.params?.difficulty || 'easy';
  const isResumed = route.params?.resume || false;
  
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [grid, setGrid] = useState<Cell[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [time, setTime] = useState(0);
  const [numberUsage, setNumberUsage] = useState<{ [key: number]: number }>({});

  // ✨ NEW: Hint states for tokens, cooldowns, and the 2-step focus logic
  const [hintCooldown, setHintCooldown] = useState(0);
  const [hintTokens, setHintTokens] = useState(0);
  const [suggestedHint, setSuggestedHint] = useState<{ row: number, col: number, value: number } | null>(null);

  // ✨ TIMER & COOLDOWN: Simple 1-second interval counter
  useEffect(() => {
    const timer = setInterval(() => {
      setTime((t) => t + 1);
      setHintCooldown((c) => (c > 0 ? c - 1 : 0)); // Countdown hint lock
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ✨ FETCH TOKENS ON LOAD
  useEffect(() => {
    const fetchStats = async () => {
      const stats = await getStats();
      setHintTokens(stats.hints);
    };
    fetchStats();
  }, []);

  // ✨ SETUP GAME: Loads a saved game or generates a new one based on difficulty
  useEffect(() => {
    const setupGame = async () => {
      if (isResumed) {
        const saved = await loadGame();
        if (saved) {
          setGrid(saved.grid);
          setSolution(saved.solution);
          setTime(saved.time);
          setMistakes(saved.mistakes);
          updateNumberUsage(saved.grid, saved.solution);
          return;
        }
      }
      const { puzzle, solution } = generateSudoku(difficulty);
      setGrid(puzzle);
      setSolution(solution);
      updateNumberUsage(puzzle, solution);
    };
    setupGame();
  }, [isResumed, difficulty]);

  // ✨ KEYBOARD LISTENER: Allows PC users to use standard numbers and Numpad
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return; 
      const key = e.key;
      const code = e.code; 
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
        handleNumberInput(parseInt(key, 10));
      } else if (code && code.startsWith('Numpad')) {
        const num = parseInt(code.replace('Numpad', ''), 10);
        if (num >= 1 && num <= 9) handleNumberInput(num);
      } else if (key === 'Backspace' || key === 'Delete') {
        handleNumberInput(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, grid]); 

  // ✨ SMART USAGE TRACKER: Only counts numbers that are correctly placed
  const updateNumberUsage = (currentGrid: Cell[][], currentSolution: number[][]) => {
    if (!currentSolution.length) return;
    const usage: { [key: number]: number } = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = currentGrid[r][c];
        if (cell.value !== 0 && cell.value === currentSolution[r][c]) {
          usage[cell.value] = (usage[cell.value] || 0) + 1;
        }
      }
    }
    setNumberUsage(usage);
  };

  // ✨ CORE LOGIC: Handles inputs, clearing, overwriting, and mistakes
  const handleNumberInput = (num: number) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const currentCell = grid[row][col];
    if (currentCell.readOnly) return;
    const updatedGrid = cloneGrid(grid);

    // ✨ TOGGLE TO CLEAR: If user presses backspace (0) OR clicks the exact same number, erase it
    if (num === 0 || currentCell.value === num) {
      updatedGrid[row][col] = { ...currentCell, value: 0 };
      setGrid(updatedGrid);
      updateNumberUsage(updatedGrid, solution);
      saveGame({ grid: updatedGrid, solution, mistakes, time });
      return; 
    }

    updatedGrid[row][col] = { value: num, readOnly: false, notes: [] };

    // ✨ MISTAKE CHECK
    if (num !== solution[row][col]) {
      setMistakes((m) => {
        const newMistakes = m + 1;
        if (newMistakes >= 3) {
          resetStreak();
          navigation.goBack();
        }
        return newMistakes;
      });
    } else {
      // If they typed the correct number into the suggested hint cell manually, clear the hint!
      if (suggestedHint && suggestedHint.row === row && suggestedHint.col === col) {
        setSuggestedHint(null);
        setHintCooldown(60); // Start cooldown since the hint is resolved
      }
    }

    setGrid(updatedGrid);
    updateNumberUsage(updatedGrid, solution);
    saveGame({ grid: updatedGrid, solution, mistakes, time });

    if (isComplete(updatedGrid, solution)) {
      clearSavedGame();
      saveStreak();
      navigation.navigate('SudokuResult', { time, mistakes, difficulty });
    }
  };

  // ✨ NEW: 2-STEP HINT SYSTEM
  const handleHint = async () => {
    if (hintCooldown > 0) return;

    // STEP 2: If a hint is already highlighted, fill it in!
    if (suggestedHint) {
      const updatedGrid = cloneGrid(grid);
      updatedGrid[suggestedHint.row][suggestedHint.col].value = suggestedHint.value;
      updatedGrid[suggestedHint.row][suggestedHint.col].readOnly = false;
      
      setGrid(updatedGrid);
      updateNumberUsage(updatedGrid, solution);
      saveGame({ grid: updatedGrid, solution, mistakes, time });
      
      setSuggestedHint(null); // Clear the active hint
      setHintCooldown(60);    // Start the 60-second cooldown
      
      if (isComplete(updatedGrid, solution)) {
        clearSavedGame();
        saveStreak();
        navigation.navigate('SudokuResult', { time, mistakes, difficulty });
      }
      return;
    }

    // STEP 1: Check tokens and highlight a cell to focus on
    const hasToken = await useHint();
    if (!hasToken) {
      alert("İpucu kalmadı! Yıldız kazanarak yeni ipuçları alabilirsiniz.");
      return;
    }

    const hint = getSudokuHint(grid, solution);
    if (hint) {
      setHintTokens(prev => prev - 1); // Deduct token
      setSuggestedHint(hint);          // Save it in state
      setSelectedCell({ row: hint.row, col: hint.col }); // Move cursor to it automatically
      // Notice we DO NOT start the cooldown yet! They must click again to reveal.
    } else {
      alert("Tüm hücreler dolu!");
    }
  };

  // ✨ CELL RENDERER: Calculates borders and dynamic highlight colors
  const renderCell = (cell: Cell, rowIndex: number, colIndex: number) => {
    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
    const isIncorrect = cell.value !== 0 && cell.value !== solution[rowIndex][colIndex];
    // Check if this specific cell is the active hint focus target
    const isSuggestedHint = suggestedHint?.row === rowIndex && suggestedHint?.col === colIndex;
    
    let isRelated = false;
    let isSameNumber = false;

    if (selectedCell) {
      if (
        rowIndex === selectedCell.row || colIndex === selectedCell.col ||
        (Math.floor(rowIndex / 3) === Math.floor(selectedCell.row / 3) && Math.floor(colIndex / 3) === Math.floor(selectedCell.col / 3))
      ) {
        isRelated = true;
      }
      const selectedValue = grid[selectedCell.row][selectedCell.col].value;
      if (selectedValue !== 0 && cell.value === selectedValue) {
        isSameNumber = true;
      }
    }

    const borderStyle = {
      borderTopWidth: rowIndex % 3 === 0 ? 2 : 0.5,
      borderLeftWidth: colIndex % 3 === 0 ? 2 : 0.5,
      borderRightWidth: colIndex === 8 ? 2 : 0, 
      borderBottomWidth: rowIndex === 8 ? 2 : 0,
    };

    // ✨ COLOR HIERARCHY: Added the gold hint highlight!
    let cellBg = 'transparent';
    if (isSuggestedHint) cellBg = 'rgba(255, 215, 0, 0.4)'; // Gold/Yellow for Step-1 Hint
    else if (isSelected) cellBg = colors.selected; 
    else if (isIncorrect && !cell.readOnly) cellBg = '#ffcccc'; 
    else if (isSameNumber) cellBg = colors.highlight; 
    else if (isRelated) cellBg = colors.restricted; 
    else if (cell.readOnly) cellBg = colors.fixedBackground || 'rgba(150,150,150,0.2)'; 

    return (
      <TouchableOpacity
        key={colIndex}
        style={[styles.cell, borderStyle, { backgroundColor: cellBg }]}
        onPress={() => setSelectedCell({ row: rowIndex, col: colIndex })}
      >
        {cell.value !== 0 && (
          <Text style={[styles.cellText, { 
            color: cell.readOnly ? colors.text : (colors.userInput || colors.input), 
            fontWeight: cell.readOnly ? 'bold' : 'normal' 
          }]}>
            {cell.value}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>⏱ {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</Text>
        <Text style={styles.infoText}>❤️ {3 - mistakes}</Text>
        <Text style={styles.infoText}>🎯 {difficulty}</Text>
      </View>

      <View style={styles.grid}>
        {grid.length === 0 ? (
          <Text style={styles.infoText}>Sudoku hazırlanıyor...</Text>
        ) : (
          grid.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
            </View>
          ))
        )}
      </View>

      <View style={styles.controls}>
        {/* ✨ DYNAMIC HINT BUTTON */}
        <TouchableOpacity 
          onPress={handleHint} 
          style={[styles.controlBtn, hintCooldown > 0 && { opacity: 0.5 }]}
          disabled={hintCooldown > 0}
        >
          <Text style={[styles.noteToggle, suggestedHint && { color: '#b8860b' }]}>
            {hintCooldown > 0 ? `⏳ ${hintCooldown}s` : (suggestedHint ? `🔍 Çöz` : `🧠 İpucu (${hintTokens})`)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.controlBtn}>
          <Text style={styles.noteToggle}>🔄 Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.controlBtn}>
          <Text style={styles.noteToggle}>🏠 Çık</Text>
        </TouchableOpacity>
      </View>

      {/* ✨ THE PROFESSIONAL NUMBER ROW STYLING ✨ */}
      <View style={styles.inputRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const used = numberUsage[num] || 0;
          const disabled = used >= 9;
          return (
            <TouchableOpacity
              key={num}
              style={[styles.numButton, { backgroundColor: disabled ? 'rgba(150,150,150,0.3)' : colors.input }]}
              onPress={() => !disabled && handleNumberInput(num)}
              disabled={disabled}
            >
              <Text style={styles.numButtonText}>{num}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { padding: 16, alignItems: 'center', justifyContent: 'flex-start', flexGrow: 1, backgroundColor: colors.background },
  infoBar: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 400, marginBottom: 12 },
  infoText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  grid: { width: '100%', maxWidth: 400, aspectRatio: 1, borderWidth: 2, borderColor: colors.text },
  row: { flexDirection: 'row', flex: 1 },
  cell: { flex: 1, justifyContent: 'center', alignItems: 'center', borderColor: colors.text },
  cellText: { fontSize: 20 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', maxWidth: 400, marginVertical: 20 },
  controlBtn: { padding: 8, alignItems: 'center' },
  noteToggle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 400, marginTop: 10 },
  numButton: { flex: 1, marginHorizontal: 3, aspectRatio: 0.8, borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1 },
  numButtonText: { fontSize: 22, fontWeight: 'bold', color: colors.text },
});