import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// 🚨 NEW: Import the StatusBar controller
import { StatusBar } from 'expo-status-bar'; 
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const ThemedNavigation = () => {
  const { colors, mode } = useTheme();

  // Web background sync
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.backgroundColor = colors.background;
    }
  }, [colors.background]);

  const customNavigationTheme = {
    ...DefaultTheme,
    dark: mode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: colors.userInput,
      background: colors.background, 
      card: colors.fixedBackground,
      text: colors.text,
      border: 'transparent',
      notification: colors.userInput,
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ✨ NEW: The Status Bar Controller ✨ */}
      <StatusBar 
        // Automatically switches text color based on your app's mode!
        style={mode === 'dark' ? 'light' : 'dark'} 
        // Matches the NavBar background perfectly
        backgroundColor={colors.fixedBackground} 
        // Ensures the app draws *under* it, so our insets.top in the NavBar works perfectly
        translucent={true} 
      />
      
      <NavigationContainer theme={customNavigationTheme}>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedNavigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}