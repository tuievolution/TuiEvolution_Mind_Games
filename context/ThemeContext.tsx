import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

const themes = {
  purple: {
    light: {
      background: '#fff',
      text: '#000',
      fixedText: '#555',
      fixedBackground: '#e3d8f3',
      selected: '#d0aaff',
      userInput: '#673ab7',
    },
    dark: {
      background: '#121212',
      text: '#fff',
      fixedText: '#aaa',
      fixedBackground: '#3e2b55',
      selected: '#a47ffb',
      userInput: '#bb86fc',
    },
  },
  blue: {
    light: {
      background: '#fff',
      text: '#000',
      fixedText: '#555',
      fixedBackground: '#d0e6ff',
      selected: '#9ecfff',
      userInput: '#1976d2',
    },
    dark: {
      background: '#121212',
      text: '#fff',
      fixedText: '#aaa',
      fixedBackground: '#2a3c55',
      selected: '#6493ce',
      userInput: '#90caf9',
    },
  },
};

const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: any) => {
  const systemScheme = useColorScheme();
  const [colorKey, setColorKey] = useState<'purple' | 'blue'>('purple');
  const [mode, setMode] = useState<'light' | 'dark'>(systemScheme || 'light');

  const colors = themes[colorKey][mode];

  return (
    <ThemeContext.Provider value={{ colors, mode, setMode, colorKey, setColorKey }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
