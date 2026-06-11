/**
 * [BR-6] 미입력 시 오늘 20:00 KST 스케줄, 입력 후 cancel
 */

import * as Notifications from 'expo-notifications';

import { cancelMoodReminder,scheduleMoodReminderIfNeeded } from '..';

jest.mock('expo-notifications', () => ({
  setNotificationHandler:           jest.fn(),
  requestPermissionsAsync:          jest.fn(),
  getExpoPushTokenAsync:            jest.fn(),
  scheduleNotificationAsync:        jest.fn(),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes:     { DATE: 'date' },
}));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), setDoc: jest.fn() }));
jest.mock('../../config/firebase', () => ({ db: {} }));

describe('[BR-6] 로컬 알림 스케줄', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hasMoodToday=false → scheduleNotificationAsync 호출', async () => {
    // 현재 시각을 오전 10:00 KST (UTC 01:00)으로 고정해 20:00 이전 확보
    jest.useFakeTimers({ now: new Date('2026-06-09T01:00:00Z').getTime() });
    await scheduleMoodReminderIfNeeded(false);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.identifier).toBe('mood-reminder-daily');
    expect(call.content.title).toContain('컨디션');
    jest.useRealTimers();
  });

  it('hasMoodToday=true → schedule 없음', async () => {
    await scheduleMoodReminderIfNeeded(true);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
  });

  it('이미 20:00 KST 지남 → schedule 없음', async () => {
    // UTC 12:00 = KST 21:00 (이미 지남)
    jest.useFakeTimers({ now: new Date('2026-06-09T12:00:00Z').getTime() });
    await scheduleMoodReminderIfNeeded(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('cancelMoodReminder → cancelScheduledNotificationAsync 호출', async () => {
    await cancelMoodReminder();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('mood-reminder-daily');
  });
});
