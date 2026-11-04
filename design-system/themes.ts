export type Colors = {
  bg:     { base: string; surface: string; subtle: string };
  text:   { primary: string; secondary: string; muted: string; inverse: string };
  accent: { primary: string; coral: string; warm: string; calm: string };
  border: { subtle: string; strong: string };
  status: { success: string; warning: string; danger: string };
  overlay: string;
};

export type AccentId = 'orange' | 'rose' | 'coral' | 'violet' | 'blue' | 'green' | 'amber';

export const ACCENT_META: Record<AccentId, { label: string; preview: string }> = {
  orange: { label: '코랄 오렌지', preview: '#F2603A' },
  rose:   { label: '로즈',     preview: '#B5566B' },
  coral:  { label: '코랄',     preview: '#C0645A' },
  violet: { label: '바이올렛', preview: '#6E5E96' },
  blue:   { label: '블루',     preview: '#4A6A92' },
  green:  { label: '그린',     preview: '#4E7F68' },
  amber:  { label: '앰버',     preview: '#A8752E' },
};

// 흑백 바탕(노란 기 없는 무채색) + 포인트 색 하나 (2026-11 개편)
const LIGHT_BASE = {
  bg:     { base: '#FFFFFF', surface: '#FFFFFF', subtle: '#F5F5F5' },
  text:   { primary: '#111111', secondary: '#5C5C5C', muted: '#8A8A8A', inverse: '#FFFFFF' },
  border: { subtle: '#EBEBEB', strong: '#D6D6D6' },
  status: { success: '#3F8F5B', warning: '#D9902B', danger: '#D64545' },
  overlay: 'rgba(17,17,17,0.4)',
};

const DARK_BASE = {
  bg:     { base: '#111111', surface: '#1A1A1A', subtle: '#262626' },
  text:   { primary: '#F2F2F2', secondary: '#B3B3B3', muted: '#7A7A7A', inverse: '#111111' },
  border: { subtle: '#2A2A2A', strong: '#3D3D3D' },
  status: { success: '#5FB07D', warning: '#E8A94A', danger: '#F06A6A' },
  overlay: 'rgba(0,0,0,0.6)',
};

type AccentTokens = { primary: string; coral: string; warm: string; calm: string };

const ACCENT_PALETTES: Record<AccentId, { light: AccentTokens; dark: AccentTokens }> = {
  orange: {
    light: { primary: '#F2603A', coral: '#F59A80', warm: '#F2B544', calm: '#A3B8C2' },
    dark:  { primary: '#FF7A57', coral: '#FFB09A', warm: '#F5C25E', calm: '#9DB4BF' },
  },
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

export const DEFAULT_THEME: ThemeConfig = { accentId: 'orange', isDark: false };

export function buildColors({ accentId, isDark }: ThemeConfig): Colors {
  const base   = isDark ? DARK_BASE   : LIGHT_BASE;
  const accent = ACCENT_PALETTES[accentId][isDark ? 'dark' : 'light'];
  return { ...base, accent };
}
