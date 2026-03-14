import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const THEME_OPTIONS = [
  { key: 'purple', hex: '#9370DB' },
  { key: 'blue', hex: '#6aa3ff' },
];

export const NavBar = () => {
  const navigation = useNavigation<any>();
  const { colors, mode, setMode, colorKey, setColorKey } = useTheme();

  // Function to open your brand link
  const openBrandLink = () => {
    Linking.openURL('https://tuievolution.vercel.app/');
  };

  return (
    <SafeAreaView style={{ backgroundColor: colors.fixedBackground }}>
      <View style={[styles.navContainer, { backgroundColor: colors.fixedBackground }]}>
        
        {/* LEFT SIDE: Home & Brand Link */}
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={[styles.homeButton, { borderColor: colors.text }]}
            onPress={() => navigation.navigate('Home')} 
          >
            <Text style={{ color: colors.text, fontWeight: 'bold' }}>🏠 Home</Text>
          </TouchableOpacity>

          {/* TUIEVOLUTION Brand Link */}
          <TouchableOpacity onPress={openBrandLink}>
            <Text style={[styles.brandLink, { color: mode === 'light' ? '#9333ea' : '#d0aaff' }]}>
              TUIEVOLUTION
            </Text>
          </TouchableOpacity>
        </View>

        {/* RIGHT SIDE: SELECTION SYSTEM */}
        <View style={styles.selectionContainer}>
          
          <View style={styles.colorRow}>
            {THEME_OPTIONS.map((theme) => {
              const isSelected = colorKey === theme.key;
              return (
                <TouchableOpacity
                  key={theme.key}
                  style={[
                    styles.swatch,
                    { backgroundColor: theme.hex },
                    isSelected && { borderWidth: 2, borderColor: colors.text, transform: [{ scale: 1.2 }] }
                  ]}
                  onPress={() => setColorKey(theme.key)}
                />
              );
            })}
          </View>

          <TouchableOpacity 
            style={[styles.modeToggle, { backgroundColor: colors.selected }]}
            onPress={() => setMode(mode === 'light' ? 'dark' : 'light')}
          >
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold' }}>
              {mode === 'light' ? '🌙 DARK' : '☀️ LIGHT'}
            </Text>
          </TouchableOpacity>

        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Adds space between the Home button and TuiEvolution text
  },
  homeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  brandLink: {
    fontSize: 18, // Roughly matches 1.5rem on mobile
    fontWeight: '800',
    letterSpacing: -0.5,
    // Note: Color is handled inline to adapt to light/dark mode
  },
  selectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15, 
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8, 
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  modeToggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
  }
});