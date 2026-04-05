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

  // ✨ TIMER: Simple 1-second interval counter
  useEffect(() => {
    const timer = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
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
    // Only attach this listener if running on a web browser
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return; // Do nothing if the user hasn't clicked a cell yet
      
      const key = e.key;
      const code = e.code; // code captures the physical key (like 'Numpad5')

      // 1. Standard Number Row (1-9)
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
        handleNumberInput(parseInt(key, 10));
      } 
      // 2. Physical Numpad check
      else if (code && code.startsWith('Numpad')) {
        const num = parseInt(code.replace('Numpad', ''), 10);
        if (num >= 1 && num <= 9) {
          handleNumberInput(num);
        }
      } 
      // 3. Backspace or Delete acts as a "clear cell" command (passing 0)
      else if (key === 'Backspace' || key === 'Delete') {
        handleNumberInput(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Cleanup function to prevent memory leaks when the component unmounts
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, grid]); 

  // ✨ SMART USAGE TRACKER: Only counts numbers that are correctly placed
  const updateNumberUsage = (currentGrid: Cell[][], currentSolution: number[][]) => {
    if (!currentSolution.length) return;
    const usage: { [key: number]: number } = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = currentGrid[r][c];
        // If the cell has a number AND it matches the background solution, count it
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

    // Don't allow changing the fixed numbers the game starts with
    if (currentCell.readOnly) return;

    const updatedGrid = cloneGrid(grid);

    // ✨ TOGGLE TO CLEAR: If user presses backspace (0) OR clicks the exact same number, erase it
    if (num === 0 || currentCell.value === num) {
      updatedGrid[row][col] = { ...currentCell, value: 0 };
      setGrid(updatedGrid);
      updateNumberUsage(updatedGrid, solution);
      saveGame({ grid: updatedGrid, solution, mistakes, time });
      return; // Stop executing so we don't count a mistake for clearing a cell
    }

    // ✨ OVERWRITE: Apply the new number directly (replaces whatever was there before)
    updatedGrid[row][col] = { value: num, readOnly: false, notes: [] };

    // ✨ MISTAKE CHECK: Compare the input to the hidden solution
    if (num !== solution[row][col]) {
      setMistakes((m) => {
        const newMistakes = m + 1;
        // Game Over condition
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

    // ✨ WIN CONDITION: Check if the grid perfectly matches the solution
    if (isComplete(updatedGrid, solution)) {
      clearSavedGame();
      saveStreak();
      navigation.navigate('SudokuResult', { time, mistakes, difficulty });
    }
  };

  // ✨ HINT SYSTEM: Finds an empty cell and magically fills the correct answer
  const handleHint = () => {
    const hint = getHint(grid, solution);
    if (hint) {
      const updatedGrid = cloneGrid(grid);
      updatedGrid[hint.row][hint.col].value = hint.value;
      updatedGrid[hint.row][hint.col].readOnly = false;
      updatedGrid[hint.row][hint.col].notes = [];
      setGrid(updatedGrid);
      updateNumberUsage(updatedGrid, solution);
      saveGame({ grid: updatedGrid, solution, mistakes, time });
    } else {
      alert("Tüm hücreler dolu!");
    }
  };

  // ✨ CELL RENDERER: Calculates borders and dynamic highlight colors
  const renderCell = (cell: Cell, rowIndex: number, colIndex: number) => {
    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
    const isIncorrect = cell.value !== 0 && cell.value !== solution[rowIndex][colIndex];
    
    let isRelated = false;
    let isSameNumber = false;

    if (selectedCell) {
      // ✨ CROSSHAIR LOGIC: Check if this cell is in the same row, col, or 3x3 box as the selected cell
      if (
        rowIndex === selectedCell.row ||
        colIndex === selectedCell.col ||
        (Math.floor(rowIndex / 3) === Math.floor(selectedCell.row / 3) && Math.floor(colIndex / 3) === Math.floor(selectedCell.col / 3))
      ) {
        isRelated = true;
      }

      // ✨ MATCHING NUMBER LOGIC: Check if this cell holds the exact same number as the clicked cell
      const selectedValue = grid[selectedCell.row][selectedCell.col].value;
      if (selectedValue !== 0 && cell.value === selectedValue) {
        isSameNumber = true;
      }
    }

    // Creates the thick 3x3 grid borders classic to Sudoku
    const borderStyle = {
      borderTopWidth: rowIndex % 3 === 0 ? 2 : 0.5,
      borderLeftWidth: colIndex % 3 === 0 ? 2 : 0.5,
      borderRightWidth: colIndex === 8 ? 2 : 0, 
      borderBottomWidth: rowIndex === 8 ? 2 : 0,
    };

    // ✨ COLOR HIERARCHY: Applies the highest-priority color state
    let cellBg = 'transparent';
    if (isSelected) cellBg = colors.selected; // 1. The exact clicked cell
    else if (isIncorrect && !cell.readOnly) cellBg = '#ffcccc'; // 2. Wrong inputs (Red)
    else if (isSameNumber) cellBg = colors.highlight; // 3. Identical numbers glow
    else if (isRelated) cellBg = colors.restricted; // 4. The Crosshair path
    else if (cell.readOnly) cellBg = colors.fixedBackground || 'rgba(150,150,150,0.2)'; // 5. Default fixed cells

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
        <TouchableOpacity onPress={handleHint}>
          <Text style={styles.noteToggle}>🧠 Hint</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.noteToggle}>🔄 Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.noteToggle}>🏠 Ana Sayfa</Text>
        </TouchableOpacity>
      </View>

      {/* INPUT BUTTONS */}
      <View style={styles.inputRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const used = numberUsage[num] || 0;
          const disabled = used >= 9; // Disables the button visually if 9 are correctly placed
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
  noteToggle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  
  // ✨ THE PROFESSIONAL NUMBER ROW STYLING ✨
  inputRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%', 
    maxWidth: 400,
    marginTop: 10,
    // By NOT having flexWrap: 'wrap' here, it forces them to stay on one line
  },
  numButton: { 
    flex: 1, // ✨ NEW: "flex: 1" tells all 9 buttons to share the available horizontal space equally.
    marginHorizontal: 3, // Tiny gap so they don't physically touch each other.
    aspectRatio: 0.8, // ✨ NEW: Forces the height to be slightly larger than the width, creating a tall rectangle rather than a squished box.
    borderRadius: 8, 
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1,
  },
  numButtonText: { fontSize: 22, fontWeight: 'bold', color: colors.text },
});