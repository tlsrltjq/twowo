import { Calendar, Menu } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { subscribeEvents, CalendarEvent } from '../../core/calendar';
import { subscribeCouple, Couple } from '../../core/couple';
import { scheduleMoodReminderIfNeeded } from '../../core/notifications';
import { useSidebar } from '../../core/sidebar.context';
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
  const { open: openSidebar } = useSidebar();
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

  // 다가오는 일정 구독 (오늘~+90일, 최대 5개)
  useEffect(() => {
    if (!coupleId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const until = new Date(today);
    until.setDate(until.getDate() + 90);
    return subscribeEvents(coupleId, { from: today, to: until }, (evs) => {
      setEvents(evs.slice(0, 5));
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
    <SafeAreaView testID="screen-home" style={styles.safeArea} edges={['top']}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* 헤더: 인사말 + D-Day + 햄버거 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>안녕하세요 👋</Text>
          {dDay !== null && (
            <Text style={styles.dday}>함께한 지 D+{dDay}일</Text>
          )}
        </View>
        <TouchableOpacity onPress={openSidebar} style={styles.hamburger} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Menu size={24} color={colors.text.secondary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* 오늘의 컨디션 카드 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>오늘의 컨디션</Text>
        <View style={styles.moodRow}>
          <MoodCard label="나" mood={myMood === 'loading' ? null : myMood} loading={myMood === 'loading'} />
          <MoodCard label="상대방" mood={partnerMood} />
        </View>
      </View>

      {/* 다음 일정 카드 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>다음 일정</Text>
        {events.length === 0 ? (
          <EmptyEventCard />
        ) : (
          <>
            <NextEventCard event={events[0]!} />
            {events.slice(1).map(ev => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

// ─── 이벤트 타입 이모지 ───────────────────────────────────────────────────────
const TYPE_EMOJI: Record<string, string> = { date: '💕', exercise: '🏃', general: '📅' };

// ─── 날짜 → KST YYYY-MM-DD ────────────────────────────────────────────────────
function toKSTDateStr(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── D-Day 라벨 ───────────────────────────────────────────────────────────────
function getDdayLabel(date: Date): string {
  const eventStr = toKSTDateStr(date);
  const todayStr = getTodayKST();
  const diff = Math.round(
    (new Date(eventStr).getTime() - new Date(todayStr).getTime()) / 86400000,
  );
  if (diff === 0) return 'D-Day';
  if (diff === 1) return 'D-1';
  return `D-${diff}`;
}

// ─── 날짜 표시 문자열 ─────────────────────────────────────────────────────────
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
function formatEventDate(date: Date): string {
  const eventStr = toKSTDateStr(date);
  const todayStr = getTodayKST();
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const dayOfWeek = DAY_KO[kst.getUTCDay()]!;
  if (eventStr === todayStr) return `오늘 (${dayOfWeek})`;
  const diff = Math.round(
    (new Date(eventStr).getTime() - new Date(todayStr).getTime()) / 86400000,
  );
  if (diff === 1) return `내일 (${dayOfWeek})`;
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  return `${m}월 ${d}일 (${dayOfWeek})`;
}

// ─── NextEventCard ────────────────────────────────────────────────────────────
function NextEventCard({ event }: { event: CalendarEvent }) {
  const ddayLabel  = getDdayLabel(event.date instanceof Date ? event.date : new Date((event.date as any).seconds * 1000));
  const dateStr    = formatEventDate(event.date instanceof Date ? event.date : new Date((event.date as any).seconds * 1000));
  const emoji      = TYPE_EMOJI[event.type] ?? '📅';
  const isToday    = ddayLabel === 'D-Day';

  return (
    <TouchableOpacity
      style={[styles.nextCard, isToday && styles.nextCardToday]}
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.nextCardTop}>
        <View style={styles.nextCardTypeBadge}>
          <Text style={styles.nextCardTypeEmoji}>{emoji}</Text>
        </View>
        <View style={[styles.ddayBadge, isToday && styles.ddayBadgeToday]}>
          <Text style={[styles.ddayText, isToday && styles.ddayTextToday]}>{ddayLabel}</Text>
        </View>
      </View>

      <Text style={styles.nextCardTitle} numberOfLines={2}>{event.title}</Text>

      {event.placeName ? (
        <Text style={styles.nextCardPlace} numberOfLines={1}>📍 {event.placeName}</Text>
      ) : null}

      <Text style={styles.nextCardDate}>{dateStr}</Text>
    </TouchableOpacity>
  );
}

// ─── EmptyEventCard ───────────────────────────────────────────────────────────
function EmptyEventCard() {
  return (
    <View style={styles.emptyCard}>
      <Calendar size={28} color={colors.text.muted} strokeWidth={1.5} />
      <Text style={styles.emptyCardText}>아직 예정된 일정이 없어요</Text>
      <Text style={styles.emptyCardSub}>캘린더에서 일정을 추가해보세요</Text>
    </View>
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
  const date    = event.date instanceof Date ? event.date : new Date((event.date as any).seconds * 1000);
  const dateStr = formatEventDate(date);
  const emoji   = TYPE_EMOJI[event.type] ?? '📅';

  return (
    <View style={styles.eventRow}>
      <Text style={styles.eventDate}>{dateStr}</Text>
      <Text style={styles.eventTitle} numberOfLines={1}>{emoji} {event.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: colors.bg.base },
  scroll:       { flex: 1 },
  container:    { padding: space[4], gap: space[5] },
  center:       { flex: 1, backgroundColor: colors.bg.base, alignItems: 'center', justifyContent: 'center' },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft:   { gap: space[1], flex: 1 },
  greeting:     { ...typography.title1, color: colors.text.primary },
  dday:         { ...typography.body, color: colors.accent.primary },
  hamburger:    { padding: space[2], marginTop: space[1] },

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

  // next event card
  nextCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    padding: space[4],
    gap: space[2],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  nextCardToday: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary + '0D', // 5% tint
  },
  nextCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextCardTypeBadge: {
    width: 36, height: 36,
    borderRadius: 10,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center', justifyContent: 'center',
  },
  nextCardTypeEmoji: { fontSize: 18 },
  ddayBadge: {
    paddingHorizontal: space[3], paddingVertical: space[1],
    backgroundColor: colors.bg.subtle,
    borderRadius: 20,
  },
  ddayBadgeToday: { backgroundColor: colors.accent.primary },
  ddayText:  { ...typography.caption, color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
  ddayTextToday: { color: colors.text.inverse },
  nextCardTitle: { ...typography.title2, color: colors.text.primary, lineHeight: 28 },
  nextCardPlace: { ...typography.caption, color: colors.text.secondary },
  nextCardDate:  { ...typography.caption, color: colors.text.muted },

  // empty event card
  emptyCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16, padding: space[5],
    alignItems: 'center', gap: space[2],
    borderWidth: 1, borderColor: colors.border.subtle,
    borderStyle: 'dashed',
  },
  emptyCardText: { ...typography.body, color: colors.text.secondary },
  emptyCardSub:  { ...typography.caption, color: colors.text.muted },

  // compact event rows (2nd~ events)
  eventRow:     {
    flexDirection: 'row', gap: space[3], alignItems: 'center',
    backgroundColor: colors.bg.surface, borderRadius: 10, padding: space[3],
  },
  eventDate:    { ...typography.caption, color: colors.accent.primary, width: 36 },
  eventTitle:   { ...typography.body, color: colors.text.primary, flex: 1 },
});
