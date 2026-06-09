import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { subscribeEvents, CalendarEvent } from '../../core/calendar';
import { subscribeCouple, Couple } from '../../core/couple';
import { scheduleMoodReminderIfNeeded } from '../../core/notifications';
import { useAuthStore } from '../../core/stores/auth.store';
import { getDaysSince, getTodayKST } from '../../core/utils/date';
import { Spinner } from '../../design-system/Spinner';
import { colors, space, typography } from '../../design-system/tokens';
import { getTodayMood, subscribePartnerMoodToday, MoodCheck } from '../../features/mood-share';

const MOOD_LABELS: Record<string, string> = {
  great: '최고 🌟',
  good:  '좋아 😊',
  okay:  '보통 😐',
  bad:   '별로 😔',
};

export default function HomeScreen() {
  const { user, coupleId } = useAuthStore();
  const [couple, setCouple]           = useState<Couple | null>(null);
  const [myMood, setMyMood]           = useState<MoodCheck | null | 'loading'>('loading');
  const [partnerMood, setPartnerMood] = useState<MoodCheck | null>(null);
  const [events, setEvents]           = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing]   = useState(false);

  const partnerUid = couple?.memberIds.find((id: string) => id !== user?.uid) ?? null;

  // D-Day 계산 (BR-2: anniversaryDate 우선, 없으면 createdAt 폴백)
  const dDay = (() => {
    if (!couple) return null;
    const base = couple.anniversaryDate ?? couple.createdAt;
    if (!base) return null;
    const baseStr = (() => {
      const d = base instanceof Date ? base : new Date((base as any).seconds * 1000);
      const kstMs = d.getTime() + 9 * 60 * 60 * 1000;
      const kst   = new Date(kstMs);
      const y = kst.getUTCFullYear();
      const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
      const dy = String(kst.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${dy}`;
    })();
    return getDaysSince(baseStr) + 1; // D+1부터 시작
  })();

  // 커플 구독
  useEffect(() => {
    if (!coupleId) return;
    return subscribeCouple(coupleId, setCouple);
  }, [coupleId]);

  // 내 컨디션 로드
  const loadMyMood = async () => {
    if (!coupleId || !user) return;
    try {
      const m = await getTodayMood(coupleId, user.uid);
      setMyMood(m);
    } catch {
      setMyMood(null);
    }
  };

  useEffect(() => {
    loadMyMood();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, user?.uid]);

  // 알림 스케줄 — 내 컨디션 상태 확정 후
  useEffect(() => {
    if (myMood === 'loading') return;
    scheduleMoodReminderIfNeeded(myMood !== null).catch(() => {});
  }, [myMood]);

  // 상대방 컨디션 실시간 구독
  useEffect(() => {
    if (!coupleId || !partnerUid) return;
    return subscribePartnerMoodToday(coupleId, partnerUid, setPartnerMood);
  }, [coupleId, partnerUid]);

  // 다가오는 일정 구독 (오늘~+7일, BR-3)
  useEffect(() => {
    if (!coupleId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const until = new Date(today);
    until.setDate(until.getDate() + 7);
    return subscribeEvents(coupleId, { from: today, to: until }, (evs) => {
      setEvents(evs.slice(0, 3)); // 최대 3개
    });
  }, [coupleId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyMood();
    setRefreshing(false);
  };

  if (!couple) {
    return (
      <View style={styles.center}>
        <Spinner />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* 헤더: 인사말 + D-Day */}
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요 👋</Text>
        {dDay !== null && (
          <Text style={styles.dday}>함께한 지 D+{dDay}일</Text>
        )}
      </View>

      {/* 오늘의 컨디션 카드 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>오늘의 컨디션</Text>
        <View style={styles.moodRow}>
          <MoodCard label="나" mood={myMood === 'loading' ? null : myMood} loading={myMood === 'loading'} />
          <MoodCard label="상대방" mood={partnerMood} />
        </View>
      </View>

      {/* 다가오는 일정 */}
      {events.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>다가오는 일정</Text>
          {events.map(ev => (
            <EventRow key={ev.id} event={ev} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function MoodCard({ label, mood, loading }: { label: string; mood: MoodCheck | null; loading?: boolean }) {
  return (
    <View style={styles.moodCard}>
      <Text style={styles.moodLabel}>{label}</Text>
      {loading ? (
        <Spinner />
      ) : mood ? (
        <>
          <Text style={styles.moodEnergy}>{'⚡'.repeat(mood.energy)}</Text>
          <Text style={styles.moodMood}>{MOOD_LABELS[mood.mood] ?? mood.mood}</Text>
          <Text style={styles.moodMeet}>{mood.canMeet ? '만남 가능 ✅' : '만남 어려움 ❌'}</Text>
        </>
      ) : (
        <Text style={styles.moodEmpty}>아직 입력 전이에요 ○</Text>
      )}
    </View>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const dateStr = (() => {
    const d = event.date instanceof Date ? event.date : new Date((event.date as any).seconds * 1000);
    const todayKST = getTodayKST();
    const evKST = (() => {
      const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      const y = kst.getUTCFullYear();
      const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
      const dy = String(kst.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${dy}`;
    })();
    return evKST === todayKST ? '오늘' : evKST.slice(5).replace('-', '/');
  })();

  return (
    <View style={styles.eventRow}>
      <Text style={styles.eventDate}>{dateStr}</Text>
      <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: colors.bg.base },
  container:    { padding: space[4], gap: space[5] },
  center:       { flex: 1, backgroundColor: colors.bg.base, alignItems: 'center', justifyContent: 'center' },

  header:       { gap: space[1] },
  greeting:     { ...typography.title1, color: colors.text.primary },
  dday:         { ...typography.body, color: colors.accent.primary },

  section:      { gap: space[3] },
  sectionTitle: { ...typography.caption, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  moodRow:      { flexDirection: 'row', gap: space[3] },
  moodCard:     {
    flex: 1, backgroundColor: colors.bg.surface,
    borderRadius: 12, padding: space[4], gap: space[1],
    alignItems: 'center', minHeight: 110,
    justifyContent: 'center',
  },
  moodLabel:    { ...typography.caption, color: colors.text.muted },
  moodEnergy:   { fontSize: 14 },
  moodMood:     { ...typography.body, color: colors.text.primary },
  moodMeet:     { ...typography.body, color: colors.text.secondary, fontSize: 11 },
  moodEmpty:    { ...typography.caption, color: colors.text.muted, textAlign: 'center' },

  eventRow:     {
    flexDirection: 'row', gap: space[3], alignItems: 'center',
    backgroundColor: colors.bg.surface, borderRadius: 10, padding: space[3],
  },
  eventDate:    { ...typography.caption, color: colors.accent.primary, width: 36 },
  eventTitle:   { ...typography.body, color: colors.text.primary, flex: 1 },
});
