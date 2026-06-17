import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { toYMD } from '../../core/utils/date';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { space, typography } from '../../design-system/tokens';
import { CalendarDayCell } from './_CalendarDayCell';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function WeekStrip({
  weekDays,
  selectedDate,
  dotsByDate,
  thumbnails,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
}: {
  weekDays: Date[];
  selectedDate: string;
  dotsByDate: Record<string, { color: string }[]>;
  thumbnails: Record<string, string>;
  onSelectDate: (ymd: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const todayYMD = toYMD(new Date());
  const first = weekDays[0]!;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onPrevWeek} style={styles.navBtn} accessibilityLabel="이전 주">
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel}>{first.getFullYear()}년 {first.getMonth() + 1}월</Text>
        <TouchableOpacity onPress={onNextWeek} style={styles.navBtn} accessibilityLabel="다음 주">
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        {weekDays.map((date, i) => {
          const ymd = toYMD(date);
          return (
            <View key={ymd} style={styles.column}>
              <Text style={styles.weekdayLabel}>{WEEKDAY_LABELS[i]}</Text>
              <CalendarDayCell
                day={date.getDate()}
                isSelected={ymd === selectedDate}
                isToday={ymd === todayYMD}
                dots={dotsByDate[ymd] ?? []}
                thumbnailUrl={thumbnails[ymd]}
                onPress={() => onSelectDate(ymd)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container:    { backgroundColor: colors.bg.base, paddingBottom: space[2] },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[4], paddingVertical: space[2] },
  navBtn:       { padding: space[2] },
  navText:      { fontSize: 20, color: colors.accent.primary },
  headerLabel:  { ...typography.bodyBold, color: colors.text.primary },
  row:          { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: space[2] },
  column:       { alignItems: 'center', gap: 4 },
  weekdayLabel: { ...typography.tiny, color: colors.text.muted },
});
