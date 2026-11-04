export const colors = {
  bg: {
    base: '#FFFFFF',
    surface: '#FFFFFF',
    subtle: '#F5F5F5',
  },
  text: {
    primary: '#111111',
    secondary: '#5C5C5C',
    muted: '#8A8A8A',
    inverse: '#FFFFFF',
  },
  accent: {
    primary: '#F2603A',
    coral: '#F59A80',
    warm: '#F2B544',
    calm: '#A3B8C2',
  },
  border: {
    subtle: '#EBEBEB',
    strong: '#D6D6D6',
  },
  status: {
    success: '#3F8F5B',
    warning: '#D9902B',
    danger: '#D64545',
  },
  overlay: 'rgba(17,17,17,0.4)',
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
  /** 섹션 머리말. 카드 대신 이 라벨 + 구분선으로 영역을 나눈다. */
  label:    { fontSize: 13, lineHeight: 18, fontWeight: '600' as const, fontFamily: 'Pretendard-SemiBold', letterSpacing: 0.2 },
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
  sm:   4,
  md:   6,
  lg:   10,
  xl:   14,
  pill: 999,
} as const;

/** 구분선 두께. 카드 테두리 대신 목록 사이에 쓴다. */
export const hairline = 0.5 as const;

/** 순수 검정 — shadowColor, 풀스크린 오버레이 배경 등에만 사용. 일반 텍스트/배경은 colors.text.* 사용. */
export const black = '#000000' as const;

export const shadow = {
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;
