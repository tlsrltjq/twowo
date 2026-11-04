/**
 * 일정 상세 사진 뷰어 회귀 테스트.
 * 뷰어 배경은 테마와 무관하게 검정이므로, 닫기 아이콘·쪽수 글씨도 테마와 무관하게 흰색이어야 한다.
 * (다크 모드에서 text.inverse 가 #111111 이 되어 검정 위에서 보이지 않던 문제)
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { buildColors } from '../../../design-system/themes';
import { white } from '../../../design-system/tokens';
import EventDetailScreen from '../[id]';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'e1' }),
}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('firebase/firestore', () => ({ doc: () => ({}) }));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));
jest.mock('../../../core/calendar', () => ({ deleteEvent: jest.fn() }));
jest.mock('../../../core/storage', () => ({ guardPhotoLimit: jest.fn(), uploadPhoto: jest.fn() }));
jest.mock('../../../core/stores/auth.store', () => ({ useAuthStore: () => ({ user: { uid: 'u1' } }) }));
jest.mock('../../../core/photos/PhotoImage', () => ({ PhotoImage: () => null }));
jest.mock('../../../core/firestore-hooks', () => ({
  useFirestoreDoc: () => ({
    loading: false,
    data: {
      title: '사진', type: 'date', coupleId: 'c1',
      date: { toDate: () => new Date('2026-11-04T00:00:00') },
      createdAt: { toDate: () => new Date('2026-11-04T00:00:00') },
      photoIds: ['p1'],
    },
  }),
}));
jest.mock('../../../core/memory', () => ({
  useEventPhotos: () => ({
    photos: [{ id: 'p1', thumbUrl: 'data:image/jpeg;base64,QQ==', originalUrl: 'fsphoto:c1/p1' }],
  }),
}));
// 아이콘 색을 확인할 수 있게 lucide 아이콘을 색을 드러내는 View 로 바꾼다.
jest.mock('lucide-react-native', () => {
  const { View: RNView } = jest.requireActual('react-native');
  const icon = (name: string) => (p: { color?: string }) => <RNView testID={`icon-${name}`} accessibilityHint={p.color} />;
  return { X: icon('x'), Image: icon('image') };
});

const mockColors = { current: buildColors({ accentId: 'orange', isDark: true }) };
jest.mock('../../../design-system/ThemeContext', () => ({ useColors: () => mockColors.current }));

function flatColor(el: { props: { style?: unknown } }): string | undefined {
  const styles = ([] as unknown[]).concat(el.props.style as unknown[]).flat(Infinity) as { color?: string }[];
  return styles.reduce<string | undefined>((c, s) => (s && s.color) ?? c, undefined);
}

describe('일정 상세 사진 뷰어', () => {
  it.each([
    ['다크', true],
    ['라이트', false],
  ])('%s 모드에서도 닫기 아이콘과 쪽수 글씨는 흰색', async (_label, isDark) => {
    mockColors.current = buildColors({ accentId: 'orange', isDark });
    const screen = await render(<EventDetailScreen />);
    await fireEvent.press(screen.getByTestId('photo-thumb-0'));

    // 화면에서 X 아이콘은 뷰어 닫기 버튼 하나뿐이다.
    expect(screen.getByTestId('btn-viewer-close')).toBeTruthy();
    const icon = screen.getByTestId('icon-x') as unknown as View & { props: { accessibilityHint?: string } };
    expect(icon.props.accessibilityHint).toBe(white);

    const counter = screen.getByText('1 / 1') as unknown as Text & { props: { style?: unknown } };
    expect(flatColor(counter)).toBe(white);
  });
});
