import { formatDateLabel } from '../helpers';

// ─── BR-8: formatDateLabel 순수 함수 ──────────────────────────────────────────

describe('[BR-8] formatDateLabel — 날짜 구분선 형식', () => {
  const FIXED_NOW = new Date('2024-06-15T12:00:00');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('오늘 날짜 → "오늘"', () => {
    expect(formatDateLabel(new Date('2024-06-15T08:00:00'))).toBe('오늘');
  });

  it('어제 날짜 → "어제"', () => {
    expect(formatDateLabel(new Date('2024-06-14T23:59:59'))).toBe('어제');
  });

  it('같은 연도 과거 → 연도 없이 월·일 포함', () => {
    const label = formatDateLabel(new Date('2024-03-10T10:00:00'));
    expect(label).toMatch(/3/);
    expect(label).toMatch(/10/);
    expect(label).not.toMatch(/2024/);
  });

  it('다른 연도 → 연도 포함', () => {
    const label = formatDateLabel(new Date('2023-01-05T10:00:00'));
    expect(label).toMatch(/2023/);
  });

  it('null → 빈 문자열', () => {
    expect(formatDateLabel(null)).toBe('');
  });
});

// ─── BR-9: 전송 실패 시 입력창 복원 ──────────────────────────────────────────
// Alert.alert 호출은 RN native module 구조상 unit test spy가 어렵고
// 실제 동작은 Maestro E2E 로 커버한다.
// 여기서는 핵심인 "inputText 복원 여부"를 검증한다.

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChatScreen from '../ChatScreen';

const mockSendMessage = jest.fn();

jest.mock('../index', () => ({
  subscribeMessages: (_: string, cb: (m: any[]) => void) => { cb([]); return () => {}; },
  sendMessage:       (...args: any[]) => mockSendMessage(...args),
  sendImageMessage:  jest.fn(),
}));

jest.mock('../../../core/stores/auth.store', () => ({
  useAuthStore: () => ({ user: { uid: 'u1', email: 'a@b.com' }, coupleId: 'c1' }),
}));

jest.mock('../../../core/couple', () => ({
  usePartnerProfile: () => ({ partnerName: '파트너' }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync:             jest.fn(),
  MediaTypeOptions:                    { Images: 'Images' },
}));

describe('[BR-9] 전송 실패 시 입력창 복원', () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
  });

  it('sendMessage 실패 → 입력창 원문 복원', async () => {
    mockSendMessage.mockRejectedValueOnce(new Error('network error'));

    const utils = await render(<ChatScreen />);
    const input = utils.getByTestId('input-chat');

    fireEvent.changeText(input, '복원될 메시지');
    fireEvent.press(utils.getByTestId('btn-chat-send'));

    await waitFor(() => {
      expect(input.props.value).toBe('복원될 메시지');
    });
  });

  it('sendMessage 성공 → 입력창 비워짐', async () => {
    mockSendMessage.mockResolvedValueOnce(undefined);

    const utils = await render(<ChatScreen />);
    const input = utils.getByTestId('input-chat');

    fireEvent.changeText(input, '전송 성공');
    fireEvent.press(utils.getByTestId('btn-chat-send'));

    await waitFor(() => {
      expect(input.props.value).toBe('');
    });
  });
});
