import { playlistSongInputSchema } from '../schema';

const base = { coupleId: 'c1', addedBy: 'u1', title: '봄날', artist: 'BTS' };

describe('[BR-1] title 유효성', () => {
  test('1자 → 허용', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, title: 'A' })).not.toThrow();
  });
  test('80자 → 허용', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, title: 'a'.repeat(80) })).not.toThrow();
  });
  test('[BR-1] 빈 문자열 → 거부', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, title: '' })).toThrow();
  });
  test('[BR-1] 81자 → 거부', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, title: 'a'.repeat(81) })).toThrow();
  });
});

describe('[BR-2] artist 유효성', () => {
  test('60자 → 허용', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, artist: 'a'.repeat(60) })).not.toThrow();
  });
  test('[BR-2] 빈 문자열 → 거부', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, artist: '' })).toThrow();
  });
  test('[BR-2] 61자 → 거부', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, artist: 'a'.repeat(61) })).toThrow();
  });
});

describe('[BR-3] period 유효성', () => {
  test('미입력 → 허용', () => {
    expect(() => playlistSongInputSchema.parse(base)).not.toThrow();
  });
  test('30자 → 허용', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, period: 'a'.repeat(30) })).not.toThrow();
  });
  test('[BR-3] 31자 → 거부', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, period: 'a'.repeat(31) })).toThrow();
  });
});

describe('[BR-4] memo 유효성', () => {
  test('100자 → 허용', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, memo: 'a'.repeat(100) })).not.toThrow();
  });
  test('[BR-4] 101자 → 거부', () => {
    expect(() => playlistSongInputSchema.parse({ ...base, memo: 'a'.repeat(101) })).toThrow();
  });
});
