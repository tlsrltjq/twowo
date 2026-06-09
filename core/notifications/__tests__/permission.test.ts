/**
 * [BR-4] 알림 권한 거부 시 schedule/send 모두 no-op (크래시 없음)
 */

jest.mock('expo-notifications', () => ({
  setNotificationHandler:             jest.fn(),
  requestPermissionsAsync:            jest.fn(),
  getExpoPushTokenAsync:              jest.fn(),
  scheduleNotificationAsync:          jest.fn(),
  cancelScheduledNotificationAsync:   jest.fn(),
  SchedulableTriggerInputTypes:       { DATE: 'date' },
}));

jest.mock('firebase/firestore', () => ({
  doc:    jest.fn(),
  setDoc: jest.fn(),
}));
jest.mock('../../config/firebase', () => ({ db: {} }));

import * as Notifications from 'expo-notifications';
import { ensurePermissionAndToken } from '..';

describe('[BR-4] 알림 권한 거부 시 no-op', () => {
  beforeEach(() => jest.clearAllMocks());

  it('권한 거부 → status:denied, 토큰 발급 안 함', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const result = await ensurePermissionAndToken('uid-123');
    expect(result.status).toBe('denied');
    expect(result.token).toBeUndefined();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('권한 허가 → status:granted + 토큰 반환', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'ExponentPushToken[test]' });
    const result = await ensurePermissionAndToken('uid-123');
    expect(result.status).toBe('granted');
    expect(result.token).toBe('ExponentPushToken[test]');
  });

  it('권한 허가 + 토큰 발급 실패 → status:granted, token undefined (크래시 없음)', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(new Error('simulator'));
    const result = await ensurePermissionAndToken('uid-123');
    expect(result.status).toBe('granted');
    expect(result.token).toBeUndefined();
  });
});
