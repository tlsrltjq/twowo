import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CalendarEvent } from '../../core/calendar/schema';
import { addDays, toLocalYMD } from '../../core/utils/date';
import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { radius, space, typography } from '../../design-system/tokens';
import { TypeEventCard, useSharedStyles } from './_shared';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function calcStreaks(events: CalendarEvent[]): { current: number; best: number } {
  const daySet = new Set(events.map(ev => toLocalYMD(ev.date)));

  let current = 0;
  const today = new Date();
  for (let i = 0; ; i++) {
    if (daySet.has(toLocalYMD(addDays(today, -i)))) current++;
    else break;
  }

  const sorted = Array.from(daySet).sort();
  let best = 0, streak = 0, prevMs = 0;
  for (const ds of sorted) {
    const ms = new Date(ds).getTime();
    streak = prevMs && ms - prevMs === 86400000 ? streak + 1 : 1;
    best = Math.max(best, streak);
    prevMs = ms;
  }

  return { current, best };
}

function HeatmapCalendar({
  year, month, datesByDay, colors,
}: {
  year: number; month: number;
  datesByDay: Record<string, number>;
  colors: Colors;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const todayStr = toLocalYMD(new Date());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const weeks: (number | null)[][] = [];
  let row: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(d);
    if (row.length === 7) { weeks.push(row); row = []; }
  }
  if (row.length) { while (row.length < 7) row.push(null); weeks.push(row); }

  return (
    <View>
      <View style={styles.heatRow}>
        {WEEKDAY_LABELS.map(l => (
          <View key={l} style={styles.heatCell}>
            <Text style={styles.heatDowLabel}>{l}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.heatRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.heatCell} />;

            const pad = (n: number) => String(n).padStart(2, '0');
            const ds = `${year}-${pad(month + 1)}-${pad(day)}`;
            const count = datesByDay[ds] ?? 0;
            const isToday = ds === todayStr;
            const isFuture = ds > todayStr;

            const bgColor = count === 0
              ? 'transparent'
              : count === 1
                ? colors.accent.primary + '55'
                : colors.accent.primary;

            return (
              <View key={di} style={styles.heatCell}>
                <View style={[
                  styles.heatDot,
                  { backgroundColor: bgColor },
                  isToday && { borderWidth: 1.5, borderColor: colors.accent.primary },
                ]}>
                  <Text style={[
                    styles.heatDayNum,
                    count > 0 && !isFuture && { color: count >= 2 ? colors.text.inverse : colors.accent.primary },
                    isFuture && { color: colors.text.muted },
                  ]}>
                    {day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function DateView({
  events, loading, myUid, partnerName,
}: {
  events: CalendarEvent[];
  loading: boolean;
  myUid?: string;
  partnerName?: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const sharedStyles = useSharedStyles();

  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear  = viewMonth === 11 ? viewYear + 1 : viewYear;
    if (nextYear > today.getFullYear() || (nextYear === today.getFullYear() && nextMonth > today.getMonth())) return;
    setViewYear(nextYear); setViewMonth(nextMonth);
  };

  const datesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach(ev => {
      const k = toLocalYMD(ev.date);
      map[k] = (map[k] ?? 0) + 1;
    });
    return map;
  }, [events]);

  const { current: currentStreak, best: bestStreak } = useMemo(() => calcStreaks(events), [events]);

  const thisMonthCount = useMemo(() => {
    return events.filter(ev =>
      ev.date.getFullYear() === viewYear && ev.date.getMonth() === viewMonth,
    ).length;
  }, [events, viewYear, viewMonth]);

  const viewMonthEvents = useMemo(() => {
    return events
      .filter(ev => ev.date.getFullYear() === viewYear && ev.date.getMonth() === viewMonth)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, viewYear, viewMonth]);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  if (loading) {
    return (
      <View style={sharedStyles.skeletonContainer}>
        {[0, 1, 2].map(i => <Skeleton key={i} style={sharedStyles.skeletonRow} />)}
      </View>
    );
  }
  if (events.length === 0) {
    return <EmptyState title="데이트 기록이 없어요" description="일정 추가 시 '데이트' 타입을 선택해보세요" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {viewYear}년 {viewMonth + 1}월
          </Text>
          <TouchableOpacity onPress={goNext} style={styles.navBtn} disabled={isCurrentMonth}>
            <Text style={[styles.navArrow, isCurrentMonth && styles.navArrowDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        <HeatmapCalendar
          year={viewYear}
          month={viewMonth}
          datesByDay={datesByDay}
          colors={colors}
        />

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.accent.primary }]}>{thisMonthCount}</Text>
            <Text style={styles.statLabel}>이달 데이트</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.accent.primary }]}>{events.length}</Text>
            <Text style={styles.statLabel}>전체</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.accent.warm }]}>{currentStreak}</Text>
            <Text style={styles.statLabel}>현재 연속</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.accent.warm }]}>{bestStreak}</Text>
            <Text style={styles.statLabel}>최고 연속</Text>
          </View>
        </View>
      </View>

      {viewMonthEvents.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>{viewMonth + 1}월 데이트 기록</Text>
          {viewMonthEvents.map(item => (
            <TypeEventCard key={item.id} event={item} {...(myUid ? { myUid, partnerName } : {})} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  scroll:       { padding: space[4], gap: space[4], paddingBottom: 96 },

  card:         { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3], borderWidth: 1, borderColor: colors.border.subtle },

  monthNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[4] },
  navBtn:       { padding: space[2] },
  navArrow:     { fontSize: 22, color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
  navArrowDisabled: { color: colors.text.muted },
  monthLabel:   { ...typography.bodyBold, color: colors.text.primary, minWidth: 100, textAlign: 'center' },

  heatRow:      { flexDirection: 'row' },
  heatCell:     { flex: 1, alignItems: 'center', paddingVertical: 3 },
  heatDowLabel: { ...typography.tiny, color: colors.text.muted },
  heatDot:      { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  heatDayNum:   { ...typography.tiny, color: colors.text.secondary, fontFamily: 'Pretendard-SemiBold' },

  statRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: space[2], borderTopWidth: 1, borderTopColor: colors.border.subtle },
  statItem:     { alignItems: 'center', gap: 2 },
  statNum:      { ...typography.title2, fontFamily: 'Pretendard-Bold' },
  statLabel:    { ...typography.tiny, color: colors.text.muted },
  statDivider:  { width: 1, height: 28, backgroundColor: colors.border.subtle },

  listSection:  { gap: space[2] },
  listTitle:    { ...typography.caption, fontFamily: 'Pretendard-SemiBold', color: colors.text.muted, paddingLeft: space[1] },
});
