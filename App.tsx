import React, { useEffect } from 'react';
import { Platform, View } from 'react-native'; // Import Platform and View
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const ThemedNavigation = () => {
  const { colors, mode } = useTheme();

  // 1. THE WEB MAGIC TRICK: 
  // This physically reaches out to the browser and changes the HTML background 
  // every time you click a new theme color!
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
    // 2. THE NATIVE MAGIC TRICK:
    // We wrap the entire navigation container in a View with flex: 1
    // This ensures the deepest layer of the app uses your theme color.
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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