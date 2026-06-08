export const colors = {
  bg: {
    base: '#FFFBF7',
    surface: '#FFFFFF',
    subtle: '#F5EFE8',
  },
  text: {
    primary: '#1A1614',
    secondary: '#6B635E',
    muted: '#9C938D',
    inverse: '#FFFFFF',
  },
  accent: {
    primary: '#E27396',
    coral: '#F0A8A0',
    warm: '#E8B86D',
    calm: '#A8BDB5',
  },
  border: {
    subtle: '#EDE5DD',
    strong: '#D4C8BE',
  },
  status: {
    success: '#7BA88F',
    warning: '#D4A05C',
    danger: '#C77575',
  },
  overlay: 'rgba(26,22,20,0.4)',
} as const;

export const typography = {
  display:  { fontSize: 32, lineHeight: 40, fontWeight: '700' as const, fontFamily: 'Pretendard-Bold' },
  title1:   { fontSize: 24, lineHeight: 32, fontWeight: '700' as const, fontFamily: 'Pretendard-Bold' },
  title2:   { fontSize: 20, lineHeight: 28, fontWeight: '600' as const, fontFamily: 'Pretendard-SemiBold' },
  body:     { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, fontFamily: 'Pretendard-Regular' },
  bodyBold: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const, fontFamily: 'Pretendard-SemiBold' },
  caption:  { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, fontFamily: 'Pretendard-Regular' },
  tiny:     { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, fontFamily: 'Pretendard-Medium' },
  button:   { fontSize: 16, lineHeight: 20, fontWeight: '600' as const, fontFamily: 'Pretendard-SemiBold' },
} as const;

export const space = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  pill: 999,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;
