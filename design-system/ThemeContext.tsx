import React, { createContext, useContext, useMemo } from 'react';

import { useThemeStore } from '../core/stores/theme.store';
import { buildColors, Colors, DEFAULT_THEME } from './themes';

const ThemeContext = createContext<Colors>(buildColors(DEFAULT_THEME));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { accentId, isDark } = useThemeStore();
  const colors = useMemo(() => buildColors({ accentId, isDark }), [accentId, isDark]);
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useColors(): Colors {
  return useContext(ThemeContext);
}
