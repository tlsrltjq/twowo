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

/** v1: 기본 포인트 색을 로즈 → 코랄 오렌지로 바꾸며, 예전 기본값(rose)을 그대로 쓰던 저장값만 옮긴다. */
export function migrateThemeSettings(persisted: unknown, version: number): Partial<ThemeState> {
  const state = (persisted ?? {}) as Partial<ThemeState>;
  if (version < 1 && state.accentId === 'rose') return { ...state, accentId: 'orange' };
  return state;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accentId: 'orange',
      isDark: false,
      setAccent: (id) => set({ accentId: id }),
      setDark: (dark) => set({ isDark: dark }),
    }),
    {
      name: 'theme-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted, version) => migrateThemeSettings(persisted, version) as ThemeState,
    },
  ),
);
