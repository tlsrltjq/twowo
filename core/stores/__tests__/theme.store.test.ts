jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined),
}));

import { migrateThemeSettings } from '../theme.store';

describe('migrateThemeSettings (v0 → v1)', () => {
  it('예전 기본값 rose 는 새 기본값 orange 로 옮긴다', () => {
    expect(migrateThemeSettings({ accentId: 'rose', isDark: true }, 0)).toEqual({ accentId: 'orange', isDark: true });
  });

  it('사용자가 고른 다른 색은 그대로 둔다', () => {
    expect(migrateThemeSettings({ accentId: 'blue', isDark: false }, 0)).toEqual({ accentId: 'blue', isDark: false });
  });

  it('이미 v1 이면 건드리지 않는다', () => {
    expect(migrateThemeSettings({ accentId: 'rose' }, 1)).toEqual({ accentId: 'rose' });
  });

  it('저장값이 없어도 오류 없이 빈 상태', () => {
    expect(migrateThemeSettings(undefined, 0)).toEqual({});
  });
});
