export type Colors = {
  bg:     { base: string; surface: string; subtle: string };
  text:   { primary: string; secondary: string; muted: string; inverse: string };
  accent: { primary: string; coral: string; warm: string; calm: string };
  border: { subtle: string; strong: string };
  status: { success: string; warning: string; danger: string };
  overlay: string;
};

export type AccentId = 'rose' | 'coral' | 'violet' | 'blue' | 'green' | 'amber';

export const ACCENT_META: Record<AccentId, { label: string; preview: string }> = {
  rose:   { label: '로즈',     preview: '#E27396' },
  coral:  { label: '코랄',     preview: '#E05C5C' },
  violet: { label: '바이올렛', preview: '#7C3AED' },
  blue:   { label: '블루',     preview: '#3B82F6' },
  green:  { label: '그린',     preview: '#10B981' },
  amber:  { label: '앰버',     preview: '#D97706' },
};

const LIGHT_BASE = {
  bg:     { base: '#FFFBF7', surface: '#FFFFFF', subtle: '#F5EFE8' },
  text:   { primary: '#1A1614', secondary: '#6B635E', muted: '#9C938D', inverse: '#FFFFFF' },
  border: { subtle: '#EDE5DD', strong: '#D4C8BE' },
  status: { success: '#7BA88F', warning: '#D4A05C', danger: '#C77575' },
  overlay: 'rgba(26,22,20,0.4)',
};

const DARK_BASE = {
  bg:     { base: '#1C1C1E', surface: '#2C2C2E', subtle: '#3A3A3C' },
  text:   { primary: '#EBEBF5', secondary: '#AEAEB2', muted: '#636366', inverse: '#1C1C1E' },
  border: { subtle: '#38383A', strong: '#545458' },
  status: { success: '#30D158', warning: '#FFD60A', danger: '#FF453A' },
  overlay: 'rgba(0,0,0,0.6)',
};

type AccentTokens = { primary: string; coral: string; warm: string; calm: string };

const ACCENT_PALETTES: Record<AccentId, { light: AccentTokens; dark: AccentTokens }> = {
  rose: {
    light: { primary: '#E27396', coral: '#F0A8A0', warm: '#E8B86D', calm: '#A8BDB5' },
    dark:  { primary: '#F48FB1', coral: '#F8BBD9', warm: '#FFCC80', calm: '#80CBC4' },
  },
  coral: {
    light: { primary: '#E05C5C', coral: '#F4AEAE', warm: '#F0C87A', calm: '#90C5B5' },
    dark:  { primary: '#FF8A80', coral: '#FFCCBC', warm: '#FFE082', calm: '#80DEEA' },
  },
  violet: {
    light: { primary: '#7C3AED', coral: '#C4B5FD', warm: '#DDD6FE', calm: '#A5B4FC' },
    dark:  { primary: '#A78BFA', coral: '#D4B5FF', warm: '#EDE9FE', calm: '#BFDBFE' },
  },
  blue: {
    light: { primary: '#3B82F6', coral: '#93C5FD', warm: '#BAE6FD', calm: '#A5F3FC' },
    dark:  { primary: '#60A5FA', coral: '#BAE6FD', warm: '#E0F2FE', calm: '#CCFBF1' },
  },
  green: {
    light: { primary: '#10B981', coral: '#6EE7B7', warm: '#D1FAE5', calm: '#A7F3D0' },
    dark:  { primary: '#34D399', coral: '#86EFAC', warm: '#ECFDF5', calm: '#D1FAE5' },
  },
  amber: {
    light: { primary: '#D97706', coral: '#FCD34D', warm: '#FEF3C7', calm: '#FDE68A' },
    dark:  { primary: '#FBBF24', coral: '#FDE68A', warm: '#FEF9C3', calm: '#FEF3C7' },
  },
};

export type ThemeConfig = { accentId: AccentId; isDark: boolean };

export const DEFAULT_THEME: ThemeConfig = { accentId: 'rose', isDark: false };

export function buildColors({ accentId, isDark }: ThemeConfig): Colors {
  const base   = isDark ? DARK_BASE   : LIGHT_BASE;
  const accent = ACCENT_PALETTES[accentId][isDark ? 'dark' : 'light'];
  return { ...base, accent };
}
