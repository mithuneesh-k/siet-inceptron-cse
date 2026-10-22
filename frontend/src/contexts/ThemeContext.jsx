import { createContext, useContext, useState, useEffect } from 'react';

export const COLOR_THEMES = [
  { id: 'green', name: 'Showcase Forest & Gold', color: '#0b4a2c', primaryColor: '#0b4a2c', secondaryColor: '#facc15', gradient: 'linear-gradient(135deg, #0b4a2c, #15803d)', badge: 'Recommended' },
  { id: 'red',   name: 'Crimson Red',           color: '#ef4444', primaryColor: '#ef4444', secondaryColor: '#18181b', gradient: 'linear-gradient(135deg, #dc2626, #ef4444)', badge: 'Fire' },
  { id: 'blue',  name: 'Royal Blue',            color: '#2563eb', primaryColor: '#2563eb', secondaryColor: '#1e3a8a', gradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', badge: 'Classic' },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const [colorTheme, setColorThemeState] = useState(() => {
    const saved = localStorage.getItem('colorTheme');
    if (saved === 'gold') return 'blue';
    return saved || 'green';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', colorTheme);
    document.documentElement.dataset.accent = colorTheme;
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    try {
      if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.startViewTransition(() => {
          setTheme(nextTheme);
        });
      } else {
        setTheme(nextTheme);
      }
    } catch {
      setTheme(nextTheme);
    }
  };

  const setColorTheme = (newColor) => {
    try {
      if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.startViewTransition(() => {
          setColorThemeState(newColor);
        });
      } else {
        setColorThemeState(newColor);
      }
    } catch {
      setColorThemeState(newColor);
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      colorTheme,
      setColorTheme,
      colorThemes: COLOR_THEMES
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
