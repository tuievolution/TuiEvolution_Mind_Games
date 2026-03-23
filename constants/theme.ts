// constants/theme.ts
export const themes = {
  purple: {
    light: {
      background: '#f3e9ff', 
      text: '#4b0082',
      fixedText: '#555',
      fixedBackground: '#e3d8f3',
      selected: '#d0aaff',
      userInput: '#673ab7',
      input: '#9370DB',
      highlight: '#e0c3fc', // NEW: For matching numbers
      restricted: 'rgba(103, 58, 183, 0.12)', // NEW: For row/col/box path
    },
    dark: {
      background: '#241738',
      text: '#d3bdf0',
      fixedText: '#aaa',
      fixedBackground: '#1b112c',
      selected: '#a47ffb',
      userInput: '#bb86fc',
      input: '#a77ff0',
      highlight: '#5e35b1',
      restricted: 'rgba(209, 170, 255, 0.12)',
    },
  },
  blue: {
    light: {
      background: '#e9f3ff',
      text: '#0050b3',
      fixedText: '#555',
      fixedBackground: '#d0e6ff',
      selected: '#9ecfff',
      userInput: '#1976d2',
      input: '#6aa3ff',
      highlight: '#bbdefb',
      restricted: 'rgba(25, 118, 210, 0.12)',
    },
    dark: {
      background: '#0d1b2a',
      text: '#a0c4ff',
      fixedText: '#aaa',
      fixedBackground: '#060d14',
      selected: '#6493ce',
      userInput: '#90caf9',
      input: '#4a90e2',
      highlight: '#1565c0',
      restricted: 'rgba(144, 202, 249, 0.12)',
    },
  },
};