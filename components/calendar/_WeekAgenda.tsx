import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CalendarEvent } from '../../core/calendar/schema';
import { toLocalYMD } from '../../core/utils/date';
import { Skeleton } from '../../design-system/Skeleton';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { radius, space, typography } from '../../design-system/tokens';
import { CalendarEventCard } from './_shared';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

export function WeekAgenda({
  weekDays,
  events,
  loading,
  myUid,
  partnerName,
  anniversaryMarkers = {},
  onPrevWeek,
  onNextWeek,
}: {
  weekDays: Date[];
  events: CalendarEvent[];
  loading: boolean;
  myUid: string;
  partnerName?: string;
  anniversaryMarkers?: Record<string, string>;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const todayYMD = toLocalYMD(new Date());

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      const key = toLocalYMD(ev.date);
      if (!map[key]) map[key] = [];
      map[key]!.push(ev);
    });
    return map;
  }, [events]);

  const first = weekDays[0]!;
  const last  = weekDays[6]!;
  const sameMonth = first.getMonth() === last.getMonth();
  const headerLabel = sameMonth
    ? `${first.getMonth() + 1}월 ${first.getDate()}일 - ${last.getDate()}일`
    : `${first.getMonth() + 1}월 ${first.getDate()}일 - ${last.getMonth() + 1}월 ${last.getDate()}일`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onPrevWeek} style={styles.navBtn} accessibilityLabel="이전 주">
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel}>{headerLabel}</Text>
        <TouchableOpacity onPress={onNextWeek} style={styles.navBtn} accessibilityLabel="다음 주">
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {weekDays.map((day, i) => {
          const ymd       = toLocalYMD(day);
          const isToday   = ymd === todayYMD;
          const dayEvents = eventsByDate[ymd] ?? [];

          return (
            <View key={ymd} style={styles.daySection}>
              <View style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
                <View style={styles.dayLabelRow}>
                  <Text style={[styles.weekdayText, isToday && styles.todayAccent]}>
                    {WEEKDAY[i]}
                  </Text>
                  <Text style={[styles.dateText, isToday && styles.todayAccent]}>
                    {day.getMonth() + 1}.{String(day.getDate()).padStart(2, '0')}
                  </Text>
                  {isToday && <View style={styles.todayChip}><Text style={styles.todayChipText}>오늘</Text></View>}
                  {anniversaryMarkers[ymd] && (
                    <View style={styles.anniversaryChip}>
                      <Text style={styles.anniversaryChipText}>{anniversaryMarkers[ymd]}</Text>
                    </View>
                  )}
                </View>
              </View>

              {loading ? (
                <Skeleton style={styles.skeleton} />
              ) : dayEvents.length === 0 ? (
                <Text style={styles.emptyText}>일정 없음</Text>
              ) : (
                <View style={styles.eventList}>
                  {dayEvents.map(ev => (
                    <CalendarEventCard key={ev.id} event={ev} myUid={myUid} {...(partnerName ? { partnerName } : {})} />
                  ))}
                </View>
              )}
            </View>
          );
        })}
        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg.base },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[4], paddingVertical: space[2], paddingHorizontal: space[4] },
  navBtn:          { padding: space[2] },
  navText:         { fontSize: 20, color: colors.accent.primary },
  headerLabel:     { ...typography.bodyBold, color: colors.text.primary, flex: 1, textAlign: 'center' },
  list:            { paddingHorizontal: space[4], gap: space[1] },
  daySection:      { gap: space[2] },
  dayHeader:       { paddingVertical: space[2], paddingHorizontal: space[2], borderRadius: radius.md },
  dayHeaderToday:  { backgroundColor: colors.accent.primary + '10' },
  dayLabelRow:     { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  weekdayText:     { ...typography.caption, color: colors.text.muted, width: 14 },
  dateText:        { ...typography.bodyBold, color: colors.text.primary },
  todayAccent:     { color: colors.accent.primary },
  todayChip:          { backgroundColor: colors.accent.primary, borderRadius: radius.pill, paddingHorizontal: space[2], paddingVertical: 1 },
  todayChipText:      { ...typography.tiny, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  anniversaryChip:    { backgroundColor: colors.accent.coral + '22', borderRadius: radius.pill, paddingHorizontal: space[2], paddingVertical: 1, borderWidth: 1, borderColor: colors.accent.coral + '66' },
  anniversaryChipText: { ...typography.tiny, color: colors.accent.coral, fontFamily: 'Pretendard-SemiBold' },
  emptyText:       { ...typography.caption, color: colors.text.muted, paddingLeft: space[2] + 14 + space[2], paddingBottom: space[2] },
  eventList:       { gap: space[2], paddingBottom: space[2] },
  skeleton:        { height: 56, borderRadius: radius.md, marginBottom: space[2] },
  bottomPad:       { height: 96 },
});
