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
  rose:   { label: '로즈',     preview: '#B5566B' },
  coral:  { label: '코랄',     preview: '#C0645A' },
  violet: { label: '바이올렛', preview: '#6E5E96' },
  blue:   { label: '블루',     preview: '#4A6A92' },
  green:  { label: '그린',     preview: '#4E7F68' },
  amber:  { label: '앰버',     preview: '#A8752E' },
};

const LIGHT_BASE = {
  bg:     { base: '#FAF8F5', surface: '#FFFFFF', subtle: '#F1EDE8' },
  text:   { primary: '#1C1917', secondary: '#5F5853', muted: '#9A928B', inverse: '#FFFFFF' },
  border: { subtle: '#E7E2DC', strong: '#CCC4BB' },
  status: { success: '#7BA88F', warning: '#D4A05C', danger: '#C77575' },
  overlay: 'rgba(28,25,23,0.4)',
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
    light: { primary: '#B5566B', coral: '#D4948A', warm: '#E8B86D', calm: '#A8BDB5' },
    dark:  { primary: '#DB8B9C', coral: '#E3AFA7', warm: '#FFCC80', calm: '#80CBC4' },
  },
  coral: {
    light: { primary: '#C0645A', coral: '#F4AEAE', warm: '#F0C87A', calm: '#90C5B5' },
    dark:  { primary: '#E0958C', coral: '#FFCCBC', warm: '#FFE082', calm: '#80DEEA' },
  },
  violet: {
    light: { primary: '#6E5E96', coral: '#C4B5FD', warm: '#DDD6FE', calm: '#A5B4FC' },
    dark:  { primary: '#A898CC', coral: '#D4B5FF', warm: '#EDE9FE', calm: '#BFDBFE' },
  },
  blue: {
    light: { primary: '#4A6A92', coral: '#93C5FD', warm: '#BAE6FD', calm: '#A5F3FC' },
    dark:  { primary: '#8FA9CC', coral: '#BAE6FD', warm: '#E0F2FE', calm: '#CCFBF1' },
  },
  green: {
    light: { primary: '#4E7F68', coral: '#6EE7B7', warm: '#D1FAE5', calm: '#A7F3D0' },
    dark:  { primary: '#86B39E', coral: '#86EFAC', warm: '#ECFDF5', calm: '#D1FAE5' },
  },
  amber: {
    light: { primary: '#A8752E', coral: '#FCD34D', warm: '#FEF3C7', calm: '#FDE68A' },
    dark:  { primary: '#D3A866', coral: '#FDE68A', warm: '#FEF9C3', calm: '#FEF3C7' },
  },
};

export type ThemeConfig = { accentId: AccentId; isDark: boolean };

export const DEFAULT_THEME: ThemeConfig = { accentId: 'rose', isDark: false };

export function buildColors({ accentId, isDark }: ThemeConfig): Colors {
  const base   = isDark ? DARK_BASE   : LIGHT_BASE;
  const accent = ACCENT_PALETTES[accentId][isDark ? 'dark' : 'light'];
  return { ...base, accent };
}
