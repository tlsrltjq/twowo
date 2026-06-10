import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { Spinner } from '../../design-system/Spinner';
import { colors, radius, space, typography } from '../../design-system/tokens';
import { CalendarEvent } from '../../core/calendar/schema';
import { useCalendarEvents, useCalendarEventsByType } from '../../core/memory';
import { useAuthStore } from '../../core/stores/auth.store';

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

  const photoEvents = useMemo(
    () => events.filter(ev => ev.photoIds.length > 0).sort((a, b) => b.date.getTime() - a.date.getTime()), // BR-10
    [events],
  );

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
        <TypeListView
          events={exerciseEvents}
          loading={exerciseLoading}
          emptyTitle="운동 기록이 없어요"
          emptyDescription="일정 추가 시 '운동' 타입을 선택해보세요"
        />
      )}

      {activeView === 'date' && (
        <TypeListView
          events={dateEvents}
          loading={dateLoading}
          emptyTitle="데이트 기록이 없어요"
          emptyDescription="일정 추가 시 '데이트' 타입을 선택해보세요"
        />
      )}

      {activeView === 'photos' && (
        /* 사진 뷰 — BR-10: event.date desc 정렬 */
        <View style={styles.flex}>
          {photoEvents.length === 0 ? (
            <EmptyState
              title="사진이 없어요"
              description="일정에 사진을 추가해보세요"
            />
          ) : (
            <FlatList
              data={photoEvents}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <PhotoCard event={item} />}
              numColumns={3}
              contentContainerStyle={styles.photoGrid}
            />
          )}
        </View>
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

function TypeListView({
  events,
  loading,
  emptyTitle,
  emptyDescription,
}: {
  events: CalendarEvent[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (loading) {
    return (
      <View style={styles.skeletonContainer}>
        {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
      </View>
    );
  }
  if (events.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <FlatList
      data={events}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <TypeEventCard event={item} />}
      contentContainerStyle={styles.listContent}
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

function PhotoCard({ event }: { event: CalendarEvent }) {
  return (
    <TouchableOpacity
      style={styles.photoCard}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <View style={styles.photoPlaceholder}>
        <Text style={styles.photoEmoji}>🖼️</Text>
        <Text style={styles.photoCount}>{event.photoIds.length}장</Text>
      </View>
      <Text style={styles.photoDate} numberOfLines={1}>{event.title}</Text>
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
  listContent:     { padding: space[4], gap: space[3] },

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

  // 사진 뷰
  photoGrid:       { padding: space[1] },
  photoCard:       { flex: 1/3, margin: space[1], aspectRatio: 1 },
  photoPlaceholder: { flex: 1, backgroundColor: colors.bg.subtle, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  photoEmoji:      { fontSize: 24 },
  photoCount:      { ...typography.tiny, color: colors.text.secondary },
  photoDate:       { ...typography.tiny, color: colors.text.secondary, marginTop: 2, textAlign: 'center' },

  fab:             { position: 'absolute', right: space[5], bottom: space[6], width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  fabText:         { fontSize: 28, color: colors.text.inverse, lineHeight: 32 },
});
