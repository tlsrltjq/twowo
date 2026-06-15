import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateView } from '../../components/calendar/_DateView';
import { ExerciseView } from '../../components/calendar/_ExerciseView';
import { PersonBadge } from '../../components/calendar/_shared';
import { PhotoView } from '../../components/calendar/_PhotoView';
import { CalendarEvent } from '../../core/calendar/schema';
import { usePartnerProfile } from '../../core/couple/usePartnerProfile';
import { useCalendarEvents, useCalendarEventsByType, usePhotoEvents } from '../../core/memory';
import { useAuthStore } from '../../core/stores/auth.store';
import { EmptyState } from '../../design-system/EmptyState';
import { CalendarEmpty } from '../../design-system/illustrations';
import { Skeleton } from '../../design-system/Skeleton';
import { Spinner } from '../../design-system/Spinner';
import { black, colors, radius, space, typography } from '../../design-system/tokens';

type ViewTab = 'calendar' | 'exercise' | 'date' | 'photos';

const VIEW_TABS: { key: ViewTab; label: string }[] = [
  { key: 'calendar', label: '달력' },
  { key: 'exercise', label: '운동' },
  { key: 'date',     label: '데이트' },
  { key: 'photos',   label: '사진' },
];

// BR-9: 타입별 점 색상
const DOT_COLOR: Record<string, string> = {
  date:     colors.accent.primary,
  exercise: colors.accent.warm,
  general:  colors.text.muted,
};

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function EventCard({
  event,
  myUid,
  partnerName,
}: {
  event: CalendarEvent;
  myUid?: string;
  partnerName?: string;
}) {
  const showBadge = event.type !== 'date' && myUid != null;
  const isMe      = event.createdBy === myUid;

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
      {showBadge && <PersonBadge isMe={isMe} name={partnerName ?? '상대방'} />}
    </TouchableOpacity>
  );
}

export default function CalendarScreen() {
  const { coupleId, user } = useAuthStore();
  const myUid = user?.uid ?? '';
  const { partnerName } = usePartnerProfile(coupleId, myUid || null);

  const [activeView, setActiveView]     = useState<ViewTab>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(toYMD(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarKey, setCalendarKey]   = useState(0);

  const monthStart = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    [currentMonth],
  );
  const monthEnd = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0),
    [currentMonth],
  );

  const { events, loading } = useCalendarEvents(coupleId, { from: monthStart, to: monthEnd });
  const { events: exerciseEvents, loading: exerciseLoading } = useCalendarEventsByType(
    activeView === 'exercise' ? coupleId : null, 'exercise',
  );
  const { events: dateEvents, loading: dateLoading } = useCalendarEventsByType(
    activeView === 'date' ? coupleId : null, 'date',
  );
  const { events: photoEvents, loading: photoLoading } = usePhotoEvents(
    activeView === 'photos' ? coupleId : null,
  );

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

  const onDayPress    = useCallback((day: DateData) => setSelectedDate(day.dateString), []);
  const onMonthChange = useCallback((month: DateData) => setCurrentMonth(new Date(month.year, month.month - 1, 1)), []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(toYMD(today));
    setCurrentMonth(today);
    setCalendarKey(k => k + 1);
  }, []);

  if (!coupleId) return <Spinner />;

  return (
    <SafeAreaView testID="screen-calendar" style={styles.container} edges={['top']}>
      <View style={styles.viewTabBar}>
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
      </View>

      {activeView === 'calendar' && (
        <View style={styles.flex}>
          <View style={styles.calendarToolbar}>
            <TouchableOpacity onPress={goToToday} style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>오늘</Text>
            </TouchableOpacity>
          </View>
          <Calendar
            key={calendarKey}
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={onDayPress}
            onMonthChange={onMonthChange}
            theme={{
              backgroundColor:            colors.bg.base,
              calendarBackground:         colors.bg.base,
              selectedDayBackgroundColor: colors.accent.primary,
              todayTextColor:             colors.accent.primary,
              arrowColor:                 colors.accent.primary,
              textDayFontFamily:          'Pretendard-Regular',
              textMonthFontFamily:        'Pretendard-SemiBold',
              textDayHeaderFontFamily:    'Pretendard-Regular',
            }}
          />
          {loading ? (
            <View style={styles.skeletonContainer}>
              {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
            </View>
          ) : dayEvents.length === 0 ? (
            <EmptyState title="일정이 없어요" description="오른쪽 아래 + 버튼으로 추가해보세요" illustration={CalendarEmpty} />
          ) : (
            <FlatList
              data={dayEvents}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <EventCard event={item} myUid={myUid} partnerName={partnerName} />}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}

      {activeView === 'exercise' && <ExerciseView events={exerciseEvents} loading={exerciseLoading} myUid={myUid} partnerName={partnerName} />}
      {activeView === 'date'     && <DateView     events={dateEvents}     loading={dateLoading}     />}
      {activeView === 'photos'   && <PhotoView    events={photoEvents}    loading={photoLoading}    />}

      <Pressable
        testID="btn-new-event"
        style={styles.fab}
        onPress={() => router.push('/event/new')}
        accessibilityLabel="새 일정 추가"
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: colors.bg.base },
  flex:              { flex: 1 },
  viewTabBar:        { flexDirection: 'row', backgroundColor: colors.bg.surface, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  viewTab:           { flex: 1, paddingVertical: space[3], alignItems: 'center' },
  viewTabActive:     { borderBottomWidth: 2, borderBottomColor: colors.accent.primary },
  viewTabText:       { ...typography.caption, color: colors.text.secondary },
  viewTabTextActive: { ...typography.caption, color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
  skeletonContainer: { padding: space[4], gap: space[3] },
  skeletonRow:       { height: 60, borderRadius: radius.md },
  listContent:       { padding: space[4], gap: space[3], paddingBottom: 96 },
  calendarToolbar:   { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space[4], paddingVertical: space[2], backgroundColor: colors.bg.base },
  todayBtn:          { paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.accent.primary },
  todayBtnText:      { ...typography.tiny, color: colors.accent.primary },
  eventCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.surface, borderRadius: radius.md, padding: space[4], gap: space[3] },
  typeDot:           { width: 10, height: 10, borderRadius: 5 },
  eventInfo:         { flex: 1 },
  eventTitle:        { ...typography.bodyBold, color: colors.text.primary },
  eventSub:          { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  fab:               { position: 'absolute', right: space[5], bottom: space[6], width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center', shadowColor: black, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  fabText:           { fontSize: 28, color: colors.text.inverse, lineHeight: 32 },
});
