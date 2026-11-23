import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const storageKey = 'voxia-theme';
const darkPreference = '(prefers-color-scheme: dark)';
export const ThemeContext = createContext<Theme>('light');

function storedTheme() {
  try {
    const value = localStorage.getItem(storageKey);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function useThemePreference() {
  const [preference, setPreference] = useState<Theme | null>(storedTheme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(darkPreference).matches);
  const theme = preference ?? (systemDark ? 'dark' : 'light');

  useEffect(() => {
    const media = window.matchMedia(darkPreference);
    const onSystemChange = () => setSystemDark(media.matches);
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setPreference(storedTheme());
    };
    media.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorageChange);
    return () => {
      media.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorageChange);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d1424' : '#f4f6fb');
  }, [theme]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setPreference(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // The toggle remains usable when browser storage is disabled.
    }
  }

  return { theme, toggleTheme };
}

const chartThemes = {
  light: {
    colors: { incoming: '#4359f5', outgoing: '#10ad94', purple: '#8b55ea', amber: '#e99a28' },
    palette: ['#495cf5', '#19b29c', '#9060ed', '#fab359', '#61a0fa', '#ee79ae', '#96b1ce'],
    axis: '#64748b',
    grid: '#e8edf5',
    guide: '#cbd3e7',
    band: '#4359f514',
    empty: '#e9edf6',
    tooltipSurface: '#ffffff',
    tooltipBorder: '#e7ebf4',
    tooltipText: '#283550',
  },
  dark: {
    colors: { incoming: '#8798ff', outgoing: '#48ddc0', purple: '#bc9cff', amber: '#ffc176' },
    palette: ['#8798ff', '#48ddc0', '#bc9cff', '#ffc176', '#6fc4ff', '#f696c7', '#a2b9d6'],
    axis: '#abbad4',
    grid: '#2b3b57',
    guide: '#667ba3',
    band: '#a4b1ff1f',
    empty: '#2a3b58',
    tooltipSurface: '#1a2942',
    tooltipBorder: '#384b70',
    tooltipText: '#eaf0ff',
  },
};

export function useChartTheme() {
  return chartThemes[useContext(ThemeContext)];
}
