import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Cell } from '../../utils/types';
import { generateSudoku } from '../../services/sudokuGenerator';
import { cloneGrid, isComplete } from '../../utils/helpers';
import { saveStreak, resetStreak } from '../../services/streakManager';
import { loadGame, saveGame, clearSavedGame } from '../../storage/storageUtils';
import { getHint } from '../../services/hintManager';
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

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard Support (Web Only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;
      const key = e.key;
      const code = e.code;

      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
        handleNumberInput(parseInt(key, 10));
      } else if (code.startsWith('Numpad') && code.length === 7) {
        const num = parseInt(code.charAt(6), 10);
        if (num >= 1 && num <= 9) handleNumberInput(num);
      } else if (key === 'Backspace' || key === 'Delete') {
        handleNumberInput(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, grid]);

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
      const { puzzle, solution: sol } = generateSudoku(difficulty);
      setGrid(puzzle);
      setSolution(sol);
      updateNumberUsage(puzzle, sol);
    };
    setupGame();
  }, [isResumed, difficulty]);

  const updateNumberUsage = (currentGrid: Cell[][], currentSolution: number[][]) => {
    const usage: { [key: number]: number } = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = currentGrid[r][c];
        // Only count as "used" if the number is correct
        if (cell.value !== 0 && cell.value === currentSolution[r][c]) {
          usage[cell.value] = (usage[cell.value] || 0) + 1;
        }
      }
    }
    setNumberUsage(usage);
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const currentCell = grid[row][col];
    if (currentCell.readOnly) return;

    const updatedGrid = cloneGrid(grid);

    // Toggle/Clear Logic: If same number is pressed or 0, clear the cell
    if (num === 0 || currentCell.value === num) {
      updatedGrid[row][col].value = 0;
      setGrid(updatedGrid);
      updateNumberUsage(updatedGrid, solution);
      saveGame({ grid: updatedGrid, solution, mistakes, time });
      return;
    }

    updatedGrid[row][col] = { value: num, readOnly: false, notes: [] };

    if (num !== solution[row][col]) {
      setMistakes((m) => {
        const newMistakes = m + 1;
        if (newMistakes >= 3) {
          resetStreak();
          navigation.goBack();
        }
        return newMistakes;
      });
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

  const handleHint = () => {
    const hint = getHint(grid, solution);
    if (hint) {
      const updatedGrid = cloneGrid(grid);
      updatedGrid[hint.row][hint.col] = { value: hint.value, readOnly: false, notes: [] };
      setGrid(updatedGrid);
      updateNumberUsage(updatedGrid, solution);
      saveGame({ grid: updatedGrid, solution, mistakes, time });
    } else {
      alert("Tüm hücreler dolu!");
    }
  };

  const renderCell = (cell: Cell, rowIndex: number, colIndex: number) => {
    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
    const isIncorrect = cell.value !== 0 && cell.value !== solution[rowIndex][colIndex];
    
    let isRelated = false;
    let isSameNumber = false;

    if (selectedCell) {
      // Crosshair logic (Same Row, Col, or 3x3 Box)
      const sameRow = rowIndex === selectedCell.row;
      const sameCol = colIndex === selectedCell.col;
      const sameBlock = Math.floor(rowIndex / 3) === Math.floor(selectedCell.row / 3) && 
                        Math.floor(colIndex / 3) === Math.floor(selectedCell.col / 3);
      
      if (sameRow || sameCol || sameBlock) isRelated = true;

      // Matching Number logic
      const selectedValue = grid[selectedCell.row][selectedCell.col].value;
      if (selectedValue !== 0 && cell.value === selectedValue) isSameNumber = true;
    }

    const borderStyle = {
      borderTopWidth: rowIndex % 3 === 0 ? 2 : 0.5,
      borderLeftWidth: colIndex % 3 === 0 ? 2 : 0.5,
      borderRightWidth: colIndex === 8 ? 2 : 0.5,
      borderBottomWidth: rowIndex === 8 ? 2 : 0.5,
    };

    // Color Priority: Selected > Incorrect > SameNumber > Crosshair > Fixed/Base
    let cellBg = 'transparent';
    if (isSelected) cellBg = colors.selected;
    else if (isIncorrect && !cell.readOnly) cellBg = '#ffcccc';
    else if (isSameNumber) cellBg = colors.highlight; 
    else if (isRelated) cellBg = colors.restricted; 
    else if (cell.readOnly) cellBg = colors.fixedBackground;

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
        <TouchableOpacity onPress={handleHint} style={styles.controlBtn}>
          <Text style={styles.noteToggle}>🧠 Hint</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.controlBtn}>
          <Text style={styles.noteToggle}>🔄 Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.controlBtn}>
          <Text style={styles.noteToggle}>🏠 Home</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const used = numberUsage[num] || 0;
          const disabled = used >= 9;
          return (
            <TouchableOpacity
              key={num}
              style={[styles.numButton, { backgroundColor: disabled ? 'rgba(150,150,150,0.2)' : colors.input }]}
              onPress={() => !disabled && handleNumberInput(num)}
              disabled={disabled}
            >
              <Text style={[styles.numButtonText, { opacity: disabled ? 0.3 : 1 }]}>{num}</Text>
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
  infoText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  grid: { width: '100%', maxWidth: 400, aspectRatio: 1, borderWidth: 2, borderColor: colors.text },
  row: { flexDirection: 'row', flex: 1 },
  cell: { flex: 1, justifyContent: 'center', alignItems: 'center', minWidth: 30, minHeight: 30, borderColor: colors.text },
  cellText: { fontSize: 20 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', maxWidth: 400, marginVertical: 20 },
  controlBtn: { padding: 8 },
  noteToggle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  inputRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', maxWidth: 400 },
  numButton: { padding: 12, margin: 4, borderRadius: 8, width: 46, alignItems: 'center', elevation: 2 },
  numButtonText: { fontSize: 22, fontWeight: 'bold', color: colors.text },
});