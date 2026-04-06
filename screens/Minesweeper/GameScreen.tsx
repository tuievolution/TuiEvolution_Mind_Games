import React, { useEffect, useState, useRef } from 'react';
// ✨ Added ScrollView to our imports
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { generateBoard } from '../../services/logic';
import { RootStackParamList } from '../../utils/types';
// 🚨 IMPORT UPDATED HINT FUNCTIONS
import { useHint, getMinesweeperHint, getStats } from '../../services/hintManager';
import { useTheme } from '../../context/ThemeContext';

type GameRoute = RouteProp<RootStackParamList, 'MinesweeperGame'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MinesweeperGameScreen() {
  const route = useRoute<GameRoute>();
  const navigation = useNavigation<Nav>();
  const { rows, cols, mines } = route.params;

  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [board] = useState(() => generateBoard(rows, cols, mines));
  const [revealed, setRevealed] = useState<boolean[][]>(() => Array(rows).fill(null).map(() => Array(cols).fill(false)));
  const [flags, setFlags] = useState<boolean[][]>(() => Array(rows).fill(null).map(() => Array(cols).fill(false)));
  const [gameOver, setGameOver] = useState(false);
  const [time, setTime] = useState(0);
  const [lives, setLives] = useState(3);
  const isFinishedRef = useRef(false);

  // ✨ NEW: Dynamic Zoom State (Defaults to 1x scale)
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2.0));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.4));

  // ✨ NEW: Hint Tracking State
  const [hintCooldown, setHintCooldown] = useState(0);
  const [hintTokens, setHintTokens] = useState(0);

  // ✨ TIMER & COOLDOWN
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isFinishedRef.current) {
        setTime((t) => t + 1);
        setHintCooldown((c) => (c > 0 ? c - 1 : 0)); // Countdown lock
      }
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

  const handleEndGame = async (status: 'won' | 'lost') => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setGameOver(true);
    setTimeout(() => {
      navigation.navigate('MinesweeperResult', { time, status });
    }, 400);
  };

  const revealCell = (r: number, c: number) => {
    if (gameOver || isFinishedRef.current || revealed[r][c] || flags[r][c]) return;
    const newRevealed = revealed.map(row => [...row]);
    const newFlags = flags.map(row => [...row]);
    const cell = board[r][c];

    if (cell === '💣') {
      const nextLives = lives - 1;
      setLives(nextLives);
      newRevealed[r][c] = true;
      newFlags[r][c] = true;
      setRevealed(newRevealed);
      setFlags(newFlags);
      if (nextLives <= 0) {
        handleEndGame('lost');
        return;
      }
    } else {
      if (cell === 0) revealZeros(r, c, newRevealed, newFlags);
      else newRevealed[r][c] = true;
      setRevealed(newRevealed);
    }

    let unrevealedSafeCells = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (board[i][j] !== '💣' && !newRevealed[i][j]) unrevealedSafeCells++;
      }
    }
    if (unrevealedSafeCells === 0) handleEndGame('won');
  };

  const revealZeros = (r: number, c: number, rev: boolean[][], flg: boolean[][]) => {
    const queue: [number, number][] = [[r, c]];
    rev[r][c] = true;
    while (queue.length > 0) {
      const [currR, currC] = queue.shift()!;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = currR + dr, nc = currC + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !rev[nr][nc] && !flg[nr][nc]) {
            rev[nr][nc] = true;
            if (board[nr][nc] === 0) queue.push([nr, nc]);
          }
        }
      }
    }
  };

  const toggleFlag = (r: number, c: number) => {
    if (revealed[r][c] || gameOver) return;
    const newFlags = flags.map(row => [...row]);
    newFlags[r][c] = !newFlags[r][c];
    setFlags(newFlags);
  };

  // ✨ NEW: MINESWEEPER HINT CONTROLLER
  const handleHint = async () => {
    if (hintCooldown > 0 || gameOver) return;

    const hasToken = await useHint();
    if (!hasToken) {
      alert("İpucu kalmadı! Yıldız kazanarak yeni ipuçları alabilirsiniz.");
      return;
    }

    const hint = getMinesweeperHint(board, revealed, flags, rows, cols);
    if (hint) {
      // Magically click a safe cell for the player
      revealCell(hint.row, hint.col);
      
      // Update UI and apply 60s cooldown
      setHintTokens(prev => prev - 1);
      setHintCooldown(60);
    }
  };

  const currentFlags = flags.flat().filter(f => f).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>⏱ {time}s | ❤️ {lives} | 🚩 {Math.max(0, mines - currentFlags)}</Text>
        
        {/* ✨ NEW: Control Row for Zooming and Exiting */}
        <View style={styles.controlRow}>
          <TouchableOpacity onPress={zoomOut} style={[styles.zoomButton, { backgroundColor: colors.selected }]}>
            <Text style={{ fontSize: 18, color: colors.text }}>🔍-</Text>
          </TouchableOpacity>
          
          {/* ✨ DYNAMIC HINT BUTTON */}
          <TouchableOpacity 
            onPress={handleHint} 
            disabled={hintCooldown > 0}
            style={[styles.hintButton, hintCooldown > 0 && { opacity: 0.5, borderColor: 'transparent' }]}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
              {hintCooldown > 0 ? `⏳ ${hintCooldown}s` : `🧠 İpucu (${hintTokens})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={styles.exitText}>🏠 Çık</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={zoomIn} style={[styles.zoomButton, { backgroundColor: colors.selected }]}>
            <Text style={{ fontSize: 18, color: colors.text }}>🔍+</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* ✨ NEW: 2D ScrollView Architecture */}
      <ScrollView style={styles.scrollVertical} contentContainerStyle={styles.scrollContent}>
        <ScrollView horizontal style={styles.scrollHorizontal} contentContainerStyle={styles.scrollContent}>
          
          <View style={[styles.boardContainer, { padding: 6 * zoom, borderRadius: 8 * zoom }]}>
            {board.map((row, r) => (
              <View key={`row-${r}`} style={styles.row}>
                {row.map((cell, c) => (
                  <View
                    key={`cell-wrapper-${r}-${c}`}
                    // @ts-expect-error
                    onContextMenu={(e: any) => {
                      if (Platform.OS === 'web') {
                        e.preventDefault();
                        toggleFlag(r, c);
                      }
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.cell, 
                        // ✨ NEW: Dynamically multiply dimensions by zoom state
                        { 
                          width: 36 * zoom, 
                          height: 36 * zoom, 
                          margin: 1 * zoom,
                          borderWidth: 1 * Math.max(0.5, zoom) 
                        },
                        revealed[r][c] ? { backgroundColor: colors.background } : { backgroundColor: 'rgba(255,255,255,0.4)' }
                      ]}
                      onPress={() => revealCell(r, c)}
                      onLongPress={() => toggleFlag(r, c)}
                      delayLongPress={200}
                      activeOpacity={0.7}
                    >
                      {/* ✨ NEW: Resize text inside the cell */}
                      <Text style={[styles.cellText, { color: getCellColor(cell), fontSize: 20 * zoom }]}>
                        {flags[r][c] ? '🚩' : (revealed[r][c] ? (cell === 0 ? '' : cell) : '')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </View>

        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const getCellColor = (val: any) => {
  const colors: any = { 1: '#0052cc', 2: '#27ae60', 3: '#e74c3c', 4: '#8e44ad', '💣': '#e74c3c' };
  return colors[val] || '#333';
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, alignItems: 'center', backgroundColor: colors.fixedBackground, elevation: 4, zIndex: 10 },
  headerText: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 15 },
  
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 350 },
  zoomButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  hintButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 2, borderColor: colors.text },
  exitText: { color: '#e74c3c', fontSize: 18, fontWeight: 'bold' },
  
  scrollVertical: { flex: 1, width: '100%' },
  scrollHorizontal: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  
  boardContainer: { backgroundColor: colors.input, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  row: { flexDirection: 'row' },
  cell: { justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,0,0,0.1)' },
  cellText: { fontWeight: '900' }
});