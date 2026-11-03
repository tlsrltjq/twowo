import { router } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDotColor } from '../../components/calendar/_shared';
import { CalendarEvent,subscribeEvents } from '../../core/calendar';
import { Couple,subscribeCouple } from '../../core/couple';
import { scheduleMoodReminderIfNeeded } from '../../core/notifications';
import { useSidebar } from '../../core/sidebar.context';
import { useAuthStore } from '../../core/stores/auth.store';
import { getDaysSince, getTodayKST } from '../../core/utils/date';
import { EmptyState } from '../../design-system/EmptyState';
import { SectionHeader } from '../../design-system/SectionHeader';
import { Skeleton } from '../../design-system/Skeleton';
import { Spinner } from '../../design-system/Spinner';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { hairline, radius, space, typography } from '../../design-system/tokens';
import { getUpcomingRange, sliceUpcoming } from '../../features/home/upcomingEvents';
import { MoodCheck,subscribeMyMoodToday, subscribePartnerMoodToday } from '../../features/mood-share';

const MOOD_LABELS: Record<string, string> = {
  great: '최고',
  good:  '좋음',
  okay:  '보통',
  bad:   '별로',
};

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function toKST(date: Date): Date {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

function toKSTDateStr(date: Date): string {
  const kst = toKST(date);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysFromToday(date: Date): number {
  return Math.round(
    (new Date(toKSTDateStr(date)).getTime() - new Date(getTodayKST()).getTime()) / 86400000,
  );
}

function formatToday(): string {
  const kst = toKST(new Date());
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${DAY_KO[kst.getUTCDay()]}요일`;
}

function formatEventDate(date: Date): string {
  const diff = daysFromToday(date);
  if (diff === 0) return '오늘';
  if (diff === 1) return '내일';
  const kst = toKST(date);
  return `${kst.getUTCMonth() + 1}.${String(kst.getUTCDate()).padStart(2, '0')} ${DAY_KO[kst.getUTCDay()]}`;
}

function toDate(value: CalendarEvent['date']): Date {
  return value instanceof Date ? value : new Date((value as { seconds: number }).seconds * 1000);
}

function describeMood(mood: MoodCheck): string {
  return [
    MOOD_LABELS[mood.mood] ?? mood.mood,
    `에너지 ${mood.energy}/5`,
    mood.canMeet ? '만날 수 있음' : '만나기 어려움',
  ].join(' · ');
}

function MoodRow({ label, mood, loading, onWrite }: {
  label: string;
  mood: MoodCheck | null;
  loading?: boolean;
  onWrite?: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {loading ? (
        <View style={styles.rowValueWrap}><Spinner /></View>
      ) : mood ? (
        <Text style={styles.rowValue}>{describeMood(mood)}</Text>
      ) : onWrite ? (
        <TouchableOpacity style={styles.rowValueWrap} onPress={onWrite} accessibilityRole="button">
          <Text style={styles.rowMuted}>아직 안 적었어요  <Text style={styles.rowLink}>적기</Text></Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.rowMuted}>아직 안 적었어요</Text>
      )}
    </View>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const date    = toDate(event.date);
  const isToday = daysFromToday(date) === 0;
  const typeColor = useDotColor()[event.type] ?? colors.text.muted;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.6}
    >
      <Text style={[styles.rowLabel, isToday && styles.rowLabelToday]}>{formatEventDate(date)}</Text>
      <View style={styles.eventBody}>
        <View style={styles.eventTitleLine}>
          <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        </View>
        {event.placeName ? (
          <Text style={styles.eventPlace} numberOfLines={1}>{event.placeName}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, coupleId } = useAuthStore();
  const { open: openSidebar } = useSidebar();
  const [couple, setCouple]           = useState<Couple | null>(null);
  const [myMood, setMyMood]           = useState<MoodCheck | null | 'loading'>('loading');
  const [partnerMood, setPartnerMood] = useState<MoodCheck | null>(null);
  const [events, setEvents]           = useState<CalendarEvent[] | null>(null);
  const [refreshing, setRefreshing]   = useState(false);

  const partnerUid = couple?.memberIds.find((id: string) => id !== user?.uid) ?? null;

  const dDay = (() => {
    if (!couple) return null;
    const base = couple.anniversaryDate ?? couple.createdAt;
    if (!base) return null;
    const baseStr = (() => {
      const d = base instanceof Date ? base : new Date((base as { seconds: number }).seconds * 1000);
      const kstMs = d.getTime() + 9 * 60 * 60 * 1000;
      const kst   = new Date(kstMs);
      const y = kst.getUTCFullYear();
      const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
      const dy = String(kst.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${dy}`;
    })();
    return getDaysSince(baseStr) + 1;
  })();

  useEffect(() => {
    if (!coupleId) return;
    return subscribeCouple(coupleId, setCouple);
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId || !user) return;
    return subscribeMyMoodToday(coupleId, user.uid, (m) => {
      setMyMood(m);
    });
  }, [coupleId, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (myMood === 'loading') return;
    scheduleMoodReminderIfNeeded(myMood !== null).catch(() => {});
  }, [myMood]);

  useEffect(() => {
    if (!coupleId || !partnerUid) return;
    return subscribePartnerMoodToday(coupleId, partnerUid, setPartnerMood);
  }, [coupleId, partnerUid]);

  useEffect(() => {
    if (!coupleId) return;
    const { from, to } = getUpcomingRange(new Date());
    return subscribeEvents(coupleId, { from, to }, (evs) => {
      setEvents(sliceUpcoming(evs));
    });
  }, [coupleId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 500));
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.today}>{formatToday()}</Text>
          {dDay !== null && (
            <Text style={styles.together}>
              함께한 지 <Text style={styles.togetherNum}>{dDay}</Text>일
            </Text>
          )}
        </View>
        <TouchableOpacity testID="btn-sidebar-open" onPress={openSidebar} style={styles.hamburger} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="메뉴 열기">
          <Menu size={22} color={colors.text.secondary} strokeWidth={1.6} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <SectionHeader title="오늘의 컨디션" />
        <MoodRow
          label="나"
          mood={myMood === 'loading' ? null : myMood}
          loading={myMood === 'loading'}
          onWrite={() => router.push('/mood')}
        />
        <MoodRow label="상대방" mood={partnerMood} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="다가오는 일정" />
        {events === null ? (
          <Skeleton style={styles.skeletonEvent} />
        ) : events.length === 0 ? (
          <EmptyState inset={false} title="일주일 안에 잡힌 일정이 없어요" description="캘린더에서 추가할 수 있어요" />
        ) : (
          events.map(ev => <EventRow key={ev.id} event={ev} />)
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: colors.bg.base },
  scroll:       { flex: 1 },
  container:    { paddingHorizontal: space[5], paddingTop: space[4], gap: space[8], paddingBottom: space[10] },
  center:       { flex: 1, backgroundColor: colors.bg.base, alignItems: 'center', justifyContent: 'center' },

  skeletonEvent: { height: space[12], borderRadius: radius.sm, marginTop: space[3] },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft:   { gap: space[1], flex: 1 },
  today:        { ...typography.title1, color: colors.text.primary },
  together:     { ...typography.body, color: colors.text.secondary },
  togetherNum:  { ...typography.bodyBold, color: colors.accent.primary },
  hamburger:    { padding: space[2], marginTop: space[1] },

  section:      { gap: 0 },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[4],
    paddingVertical: space[3],
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.subtle,
  },
  rowLabel:      { ...typography.caption, color: colors.text.secondary, width: space[12] + space[2] },
  rowLabelToday: { color: colors.accent.primary, fontFamily: typography.bodyBold.fontFamily },
  rowValueWrap:  { flex: 1, alignItems: 'flex-start' },
  rowValue:      { ...typography.caption, color: colors.text.primary, flex: 1 },
  rowMuted:      { ...typography.caption, color: colors.text.muted, flex: 1 },
  rowLink:       { ...typography.caption, color: colors.accent.primary },

  eventBody:      { flex: 1, gap: space[1] },
  eventTitleLine: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  typeDot:        { width: space[2] - 2, height: space[2] - 2, borderRadius: radius.pill },
  eventTitle:     { ...typography.body, color: colors.text.primary, flex: 1 },
  eventPlace:     { ...typography.caption, color: colors.text.muted, marginLeft: space[2] + space[2] - 2 },
});
