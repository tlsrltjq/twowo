import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, space, typography } from '../../design-system/tokens';

// 달력 그리드 한 칸 — 월간 뷰(dayComponent)와 주간 뷰(_WeekStrip)에서 공용
export function CalendarDayCell({
  day,
  isSelected = false,
  isToday = false,
  isDisabled = false,
  dots,
  thumbnailUrl,
  onPress,
}: {
  day: number;
  isSelected?: boolean;
  isToday?: boolean;
  isDisabled?: boolean;
  dots: { color: string }[];
  thumbnailUrl?: string | undefined;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} disabled={isDisabled} activeOpacity={0.7}>
      <View style={styles.numberRow}>
        <View style={[styles.numberWrap, isSelected && styles.numberWrapSelected]}>
          <Text
            style={[
              styles.dayNumber,
              isSelected && styles.dayNumberSelected,
              isToday && !isSelected && styles.dayNumberToday,
              isDisabled && styles.dayNumberDisabled,
            ]}
          >
            {day}
          </Text>
        </View>
        {thumbnailUrl && <Image source={{ uri: thumbnailUrl }} style={styles.thumb} />}
      </View>
      {dots.length > 0 && (
        <View style={styles.dotsRow}>
          {dots.map((d, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: d.color }]} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// react-native-calendars Calendar의 dayComponent 어댑터
export function MonthDayComponent({
  date,
  state,
  dots,
  thumbnailUrl,
  onPress,
}: {
  date?: { day: number; dateString: string } | undefined;
  state?: string | undefined;
  dots: { color: string }[];
  thumbnailUrl?: string | undefined;
  onPress: () => void;
}) {
  if (!date) return null;
  return (
    <CalendarDayCell
      day={date.day}
      isSelected={state === 'selected'}
      isToday={state === 'today'}
      isDisabled={state === 'disabled'}
      dots={dots}
      thumbnailUrl={thumbnailUrl}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  cell:               { alignItems: 'center', justifyContent: 'center', paddingVertical: space[1], minHeight: 48, minWidth: 32 },
  numberRow:          { flexDirection: 'row', alignItems: 'center', gap: 2 },
  numberWrap:         { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numberWrapSelected: { backgroundColor: colors.accent.primary },
  dayNumber:          { ...typography.body, color: colors.text.primary },
  dayNumberSelected:  { color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  dayNumberToday:     { color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
  dayNumberDisabled:  { color: colors.text.muted },
  thumb:              { width: 14, height: 14, borderRadius: 4 },
  dotsRow:            { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot:                { width: 5, height: 5, borderRadius: 2.5 },
});
