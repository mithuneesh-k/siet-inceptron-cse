import { createContext, useContext, useState, useEffect } from 'react';

export const COLOR_THEMES = [
  { id: 'green',   name: 'Lime Green',      color: '#84cc16', primaryColor: '#84cc16', secondaryColor: '#1e293b', gradient: 'linear-gradient(135deg, #65a30d, #84cc16)', badge: 'Default' },
  { id: 'orange',  name: 'Vibrant Orange',  color: '#f97316', primaryColor: '#f97316', secondaryColor: '#0f172a', gradient: 'linear-gradient(135deg, #ea580c, #f97316)', badge: 'Hot' },
  { id: 'red',     name: 'Crimson Red',      color: '#ef4444', primaryColor: '#ef4444', secondaryColor: '#18181b', gradient: 'linear-gradient(135deg, #dc2626, #ef4444)', badge: 'Fire' },
  { id: 'purple',   name: 'Electric Purple', color: '#a855f7', primaryColor: '#a855f7', secondaryColor: '#1e1e2e', gradient: 'linear-gradient(135deg, #9333ea, #a855f7)', badge: 'Popular' },
  { id: 'blue',     name: 'Cyber Blue',      color: '#3b82f6', primaryColor: '#3b82f6', secondaryColor: '#06b6d4', gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', badge: 'Cool' },
  { id: 'emerald',  name: 'Deep Emerald',    color: '#10b981', primaryColor: '#10b981', secondaryColor: '#f59e0b', gradient: 'linear-gradient(135deg, #059669, #10b981)', badge: 'Fresh' },
  { id: 'pink',     name: 'Neon Pink',       color: '#ec4899', primaryColor: '#ec4899', secondaryColor: '#7e22ce', gradient: 'linear-gradient(135deg, #db2777, #ec4899)', badge: 'Vibrant' },
  { id: 'gold',     name: 'Royal Gold',      color: '#f59e0b', primaryColor: '#f59e0b', secondaryColor: '#451a03', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', badge: 'Luxury' },
  { id: 'cyan',     name: 'Aqua Cyan',       color: '#06b6d4', primaryColor: '#06b6d4', secondaryColor: '#0f172a', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', badge: 'Future' },
  { id: 'indigo',   name: 'Indigo',          color: '#6366f1', primaryColor: '#6366f1', secondaryColor: '#14b8a6', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', badge: 'Pro' },
  { id: 'teal',     name: 'Teal',            color: '#14b8a6', primaryColor: '#14b8a6', secondaryColor: '#4f46e5', gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)', badge: 'Modern' },
  { id: 'rose',     name: 'Rose',            color: '#f43f5e', primaryColor: '#f43f5e', secondaryColor: '#334155', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', badge: 'Elegant' },
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
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => {
        setTheme(nextTheme);
      });
    } else {
      setTheme(nextTheme);
    }
  };

  const setColorTheme = (newColor) => {
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => {
        setColorThemeState(newColor);
      });
    } else {
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
