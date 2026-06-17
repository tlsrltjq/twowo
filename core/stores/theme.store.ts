import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AccentId } from '../../design-system/themes';

interface ThemeState {
  accentId: AccentId;
  isDark: boolean;
  setAccent: (id: AccentId) => void;
  setDark: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accentId: 'rose',
      isDark: false,
      setAccent: (id) => set({ accentId: id }),
      setDark: (dark) => set({ isDark: dark }),
    }),
    {
      name: 'theme-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
