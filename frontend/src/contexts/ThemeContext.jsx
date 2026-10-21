import { createContext, useContext, useState, useEffect } from 'react';

export const COLOR_THEMES = [
  { id: 'green', name: 'Showcase Forest & Gold', color: '#0b4a2c', primaryColor: '#0b4a2c', secondaryColor: '#facc15', gradient: 'linear-gradient(135deg, #0b4a2c, #15803d)', badge: 'Recommended' },
  { id: 'red',   name: 'Crimson Red',           color: '#ef4444', primaryColor: '#ef4444', secondaryColor: '#18181b', gradient: 'linear-gradient(135deg, #dc2626, #ef4444)', badge: 'Fire' },
  { id: 'gold',  name: 'Royal Gold',           color: '#f59e0b', primaryColor: '#f59e0b', secondaryColor: '#451a03', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', badge: 'Luxury' },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const [colorTheme, setColorThemeState] = useState(() => {
    return localStorage.getItem('colorTheme') || 'green';
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
