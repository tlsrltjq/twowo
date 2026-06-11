import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarEvent } from '../../core/calendar/schema';
import { useCalendarEvents, useCalendarEventsByType } from '../../core/memory';
import { useAuthStore } from '../../core/stores/auth.store';
import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { Spinner } from '../../design-system/Spinner';
import { black, colors, radius, space, typography } from '../../design-system/tokens';

type ViewTab = 'calendar' | 'exercise' | 'date' | 'photos';

const VIEW_TABS: { key: ViewTab; label: string }[] = [
  { key: 'calendar', label: '📅 달력' },
  { key: 'exercise', label: '🏃 운동' },
  { key: 'date',     label: '💑 데이트' },
  { key: 'photos',   label: '🖼️ 사진' },
];

// BR-9: 타입별 점 색상
const DOT_COLOR: Record<string, string> = {
  date:     colors.accent.primary,
  exercise: colors.accent.warm,
  general:  colors.text.muted,
};

const TYPE_EMOJI: Record<string, string> = {
  date:     '💑',
  exercise: '🏃',
  general:  '📌',
};

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function groupByYearMonth(events: CalendarEvent[]): { title: string; data: CalendarEvent[]; key: string }[] {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const y = ev.date.getFullYear();
    const m = ev.date.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, data]) => {
      const [y, m] = key.split('-');
      return { title: `${y}년 ${Number(m)}월`, data, key };
    });
}

export default function CalendarScreen() {
  const { coupleId } = useAuthStore();
  const [activeView, setActiveView] = useState<ViewTab>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(toYMD(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = useMemo(() => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    return d;
  }, [currentMonth]);

  const monthEnd = useMemo(() => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return d;
  }, [currentMonth]);

  const { events, loading } = useCalendarEvents(coupleId, { from: monthStart, to: monthEnd });
  const { events: exerciseEvents, loading: exerciseLoading } = useCalendarEventsByType(coupleId, 'exercise');
  const { events: dateEvents,     loading: dateLoading }     = useCalendarEventsByType(coupleId, 'date');
  const { events: generalEvents,  loading: generalLoading }  = useCalendarEventsByType(coupleId, 'general');

  const markedDates = useMemo(() => {
    const marks: Record<string, { dots: { color: string }[]; selected?: boolean; selectedColor?: string }> = {};
    events.forEach(ev => {
      const key = toYMD(ev.date);
      if (!marks[key]) marks[key] = { dots: [] };
      marks[key]!.dots.push({ color: DOT_COLOR[ev.type] ?? colors.text.muted });
    });
    if (marks[selectedDate]) {
      marks[selectedDate]!.selected = true;
      marks[selectedDate]!.selectedColor = colors.accent.primary;
    } else {
      marks[selectedDate] = { dots: [], selected: true, selectedColor: colors.accent.primary };
    }
    return marks;
  }, [events, selectedDate]);

  const dayEvents = useMemo(
    () => events.filter(ev => toYMD(ev.date) === selectedDate),
    [events, selectedDate],
  );

  // BR-10: 전체 타입에서 사진 있는 이벤트만 추출, date desc
  const photoEvents = useMemo(() => {
    const all = [...exerciseEvents, ...dateEvents, ...generalEvents];
    return all.filter(ev => ev.photoIds.length > 0).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [exerciseEvents, dateEvents, generalEvents]);
  const photoLoading = exerciseLoading || dateLoading || generalLoading;

  const onDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  const onMonthChange = useCallback((month: DateData) => {
    setCurrentMonth(new Date(month.year, month.month - 1, 1));
  }, []);

  if (!coupleId) return <Spinner />;

  return (
    <SafeAreaView testID="screen-calendar" style={styles.container} edges={['top']}>
      {/* 뷰 전환 탭바 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.viewTabBar}
        contentContainerStyle={styles.viewTabBarContent}
      >
        {VIEW_TABS.map(v => (
          <TouchableOpacity
            key={v.key}
            style={[styles.viewTab, activeView === v.key && styles.viewTabActive]}
            onPress={() => setActiveView(v.key)}
          >
            <Text style={[styles.viewTabText, activeView === v.key && styles.viewTabTextActive]}>
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeView === 'calendar' && (
        <View style={styles.flex}>
          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={onDayPress}
            onMonthChange={onMonthChange}
            theme={{
              backgroundColor:           colors.bg.base,
              calendarBackground:        colors.bg.base,
              selectedDayBackgroundColor: colors.accent.primary,
              todayTextColor:            colors.accent.primary,
              arrowColor:                colors.accent.primary,
              textDayFontFamily:         'Pretendard-Regular',
              textMonthFontFamily:       'Pretendard-SemiBold',
              textDayHeaderFontFamily:   'Pretendard-Regular',
            }}
          />

          {loading ? (
            <View style={styles.skeletonContainer}>
              {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
            </View>
          ) : dayEvents.length === 0 ? (
            <EmptyState
              title="일정이 없어요"
              description="오른쪽 아래 + 버튼으로 추가해보세요"
            />
          ) : (
            <FlatList
              data={dayEvents}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <EventCard event={item} />}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}

      {activeView === 'exercise' && (
        <ExerciseView events={exerciseEvents} loading={exerciseLoading} />
      )}

      {activeView === 'date' && (
        <DateView events={dateEvents} loading={dateLoading} />
      )}

      {activeView === 'photos' && (
        <PhotoView events={photoEvents} loading={photoLoading} />
      )}

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/event/new')}
        accessibilityLabel="새 일정 추가"
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function TypeStatsBar({
  emoji,
  total,
  monthCount,
  accentColor,
  unitLabel,
}: {
  emoji: string;
  total: number;
  monthCount: number;
  accentColor: string;
  unitLabel: string;
}) {
  return (
    <View style={[styles.statsBar, { borderColor: accentColor + '40' }]}>
      <Text style={styles.statsEmoji}>{emoji}</Text>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: accentColor }]}>{total}</Text>
        <Text style={styles.statLabel}>전체 {unitLabel}</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: accentColor }]}>{monthCount}</Text>
        <Text style={styles.statLabel}>이번 달 {unitLabel}</Text>
      </View>
    </View>
  );
}

function ExerciseView({ events, loading }: { events: CalendarEvent[]; loading: boolean }) {
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return events.filter(ev =>
      ev.date.getFullYear() === now.getFullYear() && ev.date.getMonth() === now.getMonth(),
    ).length;
  }, [events]);
  const sections = useMemo(() => groupByYearMonth(events), [events]);

  if (loading) {
    return (
      <View style={styles.skeletonContainer}>
        {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
      </View>
    );
  }
  if (events.length === 0) {
    return <EmptyState title="운동 기록이 없어요" description="일정 추가 시 '운동' 타입을 선택해보세요" />;
  }
  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <TypeStatsBar emoji="🏃" total={events.length} monthCount={thisMonthCount} accentColor={colors.accent.warm} unitLabel="회" />
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.monthHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => <TypeEventCard event={item} />}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={false}
    />
  );
}

function DateView({ events, loading }: { events: CalendarEvent[]; loading: boolean }) {
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return events.filter(ev =>
      ev.date.getFullYear() === now.getFullYear() && ev.date.getMonth() === now.getMonth(),
    ).length;
  }, [events]);
  const sections = useMemo(() => groupByYearMonth(events), [events]);

  if (loading) {
    return (
      <View style={styles.skeletonContainer}>
        {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
      </View>
    );
  }
  if (events.length === 0) {
    return <EmptyState title="데이트 기록이 없어요" description="일정 추가 시 '데이트' 타입을 선택해보세요" />;
  }
  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <TypeStatsBar emoji="💑" total={events.length} monthCount={thisMonthCount} accentColor={colors.accent.primary} unitLabel="번" />
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.monthHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => <TypeEventCard event={item} />}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={false}
    />
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <View style={[styles.typeDot, { backgroundColor: DOT_COLOR[event.type] ?? colors.text.muted }]} />
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        {event.placeName && (
          <Text style={styles.eventSub} numberOfLines={1}>📍 {event.placeName}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function TypeEventCard({ event }: { event: CalendarEvent }) {
  return (
    <TouchableOpacity
      style={styles.typeEventCard}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <View style={styles.typeEventLeft}>
        <Text style={styles.typeEventEmoji}>{TYPE_EMOJI[event.type] ?? '📌'}</Text>
      </View>
      <View style={styles.typeEventBody}>
        <Text style={styles.typeEventDate}>{formatDate(event.date)}</Text>
        <Text style={styles.typeEventTitle} numberOfLines={1}>{event.title}</Text>
        {event.placeName && (
          <Text style={styles.typeEventPlace} numberOfLines={1}>📍 {event.placeName}</Text>
        )}
        {event.memo && (
          <Text style={styles.typeEventMemo} numberOfLines={2}>{event.memo}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const PHOTO_CARD_BG: Record<string, string> = {
  date:     colors.accent.primary + '30',
  exercise: colors.accent.warm    + '30',
  general:  colors.accent.calm    + '30',
};

function PhotoView({ events, loading }: { events: CalendarEvent[]; loading: boolean }) {
  const totalPhotos = useMemo(
    () => events.reduce((sum, ev) => sum + ev.photoIds.length, 0),
    [events],
  );
  const thisMonthPhotos = useMemo(() => {
    const now = new Date();
    return events
      .filter(ev => ev.date.getFullYear() === now.getFullYear() && ev.date.getMonth() === now.getMonth())
      .reduce((sum, ev) => sum + ev.photoIds.length, 0);
  }, [events]);
  const groups = useMemo(() => groupByYearMonth(events), [events]);

  if (loading) {
    return (
      <View style={styles.skeletonContainer}>
        {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
      </View>
    );
  }
  if (events.length === 0) {
    return <EmptyState title="사진이 없어요" description="일정에 사진을 추가해보세요" />;
  }
  return (
    <ScrollView contentContainerStyle={styles.photoListContent}>
      <TypeStatsBar emoji="📸" total={totalPhotos} monthCount={thisMonthPhotos} accentColor={colors.accent.calm} unitLabel="장" />
      {groups.map(group => (
        <View key={group.key}>
          <Text style={styles.monthHeader}>{group.title}</Text>
          <View style={styles.photoMonthGrid}>
            {group.data.map(ev => <PhotoCard key={ev.id} event={ev} />)}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function PhotoCard({ event }: { event: CalendarEvent }) {
  const bg = PHOTO_CARD_BG[event.type] ?? PHOTO_CARD_BG['general']!;
  return (
    <TouchableOpacity
      style={styles.photoCard}
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.85}
    >
      <View style={[styles.photoCardInner, { backgroundColor: bg }]}>
        <Text style={styles.photoCardEmoji}>{TYPE_EMOJI[event.type] ?? '📌'}</Text>
        <View style={styles.photoBadge}>
          <Text style={styles.photoBadgeText}>📷 {event.photoIds.length}</Text>
        </View>
        <View style={styles.photoCardFooter}>
          <Text style={styles.photoCardTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.photoCardDate}>{formatDate(event.date)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg.base },
  flex:            { flex: 1 },

  viewTabBar:      { flexGrow: 0, backgroundColor: colors.bg.surface, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  viewTabBarContent: { flexDirection: 'row' },
  viewTab:         { paddingHorizontal: space[4], paddingVertical: space[3], alignItems: 'center' },
  viewTabActive:   { borderBottomWidth: 2, borderBottomColor: colors.accent.primary },
  viewTabText:     { ...typography.caption, color: colors.text.secondary },
  viewTabTextActive: { ...typography.caption, color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },

  skeletonContainer: { padding: space[4], gap: space[3] },
  skeletonRow:     { height: 60, borderRadius: radius.md },
  listContent:     { padding: space[4], gap: space[3], paddingBottom: 96 },

  // 달력 뷰 이벤트 카드
  eventCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.surface, borderRadius: radius.md, padding: space[4], gap: space[3] },
  typeDot:         { width: 10, height: 10, borderRadius: 5 },
  eventInfo:       { flex: 1 },
  eventTitle:      { ...typography.bodyBold, color: colors.text.primary },
  eventSub:        { ...typography.caption, color: colors.text.secondary, marginTop: 2 },

  // 타입 뷰 이벤트 카드 (운동/데이트)
  typeEventCard:   { flexDirection: 'row', backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3] },
  typeEventLeft:   { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bg.subtle, alignItems: 'center', justifyContent: 'center' },
  typeEventEmoji:  { fontSize: 20 },
  typeEventBody:   { flex: 1, gap: 2 },
  typeEventDate:   { ...typography.tiny, color: colors.text.muted },
  typeEventTitle:  { ...typography.bodyBold, color: colors.text.primary },
  typeEventPlace:  { ...typography.caption, color: colors.text.secondary },
  typeEventMemo:   { ...typography.caption, color: colors.text.muted, marginTop: 2 },

  // 통계 바 (운동/데이트)
  statsBar:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], marginBottom: space[3], gap: space[5], borderWidth: 1 },
  statsEmoji:      { fontSize: 32 },
  statItem:        { alignItems: 'center', gap: 2 },
  statNumber:      { ...typography.title1, fontFamily: 'Pretendard-Bold' },
  statLabel:       { ...typography.tiny, color: colors.text.muted },
  statDivider:     { width: 1, height: 32, backgroundColor: colors.border.subtle },
  monthHeader:     { ...typography.caption, color: colors.text.muted, paddingTop: space[3], paddingBottom: space[2], textTransform: 'uppercase', letterSpacing: 0.5 },

  // 사진 뷰
  photoListContent: { padding: space[4], paddingBottom: 96 },
  photoMonthGrid:  { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[1] },
  photoCard:       { width: '33.33%', padding: space[1] },
  photoCardInner:  { aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photoCardEmoji:  { fontSize: 28 },
  photoBadge:      { position: 'absolute', top: space[1], right: space[1], backgroundColor: 'rgba(26,22,20,0.65)', borderRadius: radius.pill, paddingHorizontal: space[2], paddingVertical: 2 },
  photoBadgeText:  { ...typography.tiny, color: colors.text.inverse },
  photoCardFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(26,22,20,0.55)', padding: space[2] },
  photoCardTitle:  { ...typography.tiny, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  photoCardDate:   { fontSize: 10, lineHeight: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Pretendard-Regular' },

  fab:             { position: 'absolute', right: space[5], bottom: space[6], width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center', shadowColor: black, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  fabText:         { fontSize: 28, color: colors.text.inverse, lineHeight: 32 },
});
