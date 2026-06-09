import * as Notifications from 'expo-notifications';
import { doc, setDoc } from 'firebase/firestore';

import { db } from '../config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermissionAndToken(uid: string): Promise<{
  status: 'granted' | 'denied';
  token?: string;
}> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return { status: 'denied' };

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await setDoc(doc(db, 'users', uid), { expoPushToken: token }, { merge: true });
    return { status: 'granted', token };
  } catch (e) {
    // 시뮬레이터 등 토큰 발급 불가 환경 — 권한은 granted지만 토큰 없음
    if (__DEV__) console.warn('[notifications] push token unavailable:', e);
    return { status: 'granted' };
  }
}

const MOOD_REMINDER_ID = 'mood-reminder-daily';

export async function scheduleMoodReminderIfNeeded(hasMoodToday: boolean): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MOOD_REMINDER_ID).catch(() => {});

  if (hasMoodToday) return;

  // 오늘 20:00 KST = UTC 11:00
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const trigger = new Date(Date.UTC(
    kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(),
    11, 0, 0,
  ));

  if (trigger <= now) return; // 이미 20시 지남

  await Notifications.scheduleNotificationAsync({
    identifier: MOOD_REMINDER_ID,
    content: {
      title: '오늘 컨디션을 알려주세요 💌',
      body: '상대방이 기다리고 있어요',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
  });
}

export async function cancelMoodReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MOOD_REMINDER_ID).catch(() => {});
}
