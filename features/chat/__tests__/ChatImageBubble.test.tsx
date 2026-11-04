/**
 * 채팅 이미지 말풍선 회귀 테스트.
 * 이미지 말풍선은 안쪽 여백 없이 사진이 말풍선을 꽉 채워야 한다.
 * (bubble 의 paddingHorizontal/Vertical 이 imageBubble 의 padding: 0 보다 우선해 사진 둘레에 두꺼운 테두리가 생기던 문제)
 */
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import ChatScreen from '../ChatScreen';

jest.mock('../index', () => ({
  subscribeMessages: (_: string, cb: (m: unknown[]) => void) => {
    cb([{ id: 'm1', senderId: 'u1', imageUrl: 'data:image/jpeg;base64,QQ==', createdAt: new Date('2026-11-04T14:04:00') }]);
    return () => {};
  },
  sendMessage:      jest.fn(),
  sendImageMessage: jest.fn(),
}));
jest.mock('../../../core/photos/PhotoImage', () => ({ PhotoImage: () => null }));
jest.mock('../../../core/stores/auth.store', () => ({
  useAuthStore: () => ({ user: { uid: 'u1', email: 'a@b.com' }, coupleId: 'c1' }),
}));
jest.mock('../../../core/couple', () => ({ usePartnerProfile: () => ({ partnerName: '파트너' }) }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync:             jest.fn(),
}));

describe('채팅 이미지 말풍선', () => {
  it('안쪽 여백이 0 이다', async () => {
    const utils = await render(<ChatScreen />);
    const style = StyleSheet.flatten(utils.getByTestId('chat-image-bubble').props.style);
    expect(style.paddingHorizontal ?? style.padding ?? 0).toBe(0);
    expect(style.paddingVertical ?? style.padding ?? 0).toBe(0);
  });
});
