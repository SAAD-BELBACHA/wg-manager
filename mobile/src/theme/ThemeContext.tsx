import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { buildColors, ThemeColors } from '@/theme/tokens';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'zofri.themeMode';

type ThemeContextValue = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
    });
  }, []);

  function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  }

  const resolvedTheme: ResolvedTheme = themeMode === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : themeMode;

  const colors = useMemo(() => buildColors(resolvedTheme), [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    themeMode,
    resolvedTheme,
    colors,
    setThemeMode
  }), [themeMode, resolvedTheme, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
