import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, space, typography } from '../../design-system/tokens';

// 달력 그리드 한 칸 — 사진 있으면 원형 배경, 없으면 일반 숫자 원
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
  const hasPhoto = Boolean(thumbnailUrl);

  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} disabled={isDisabled} activeOpacity={0.75}>
      {hasPhoto ? (
        <View style={[
          styles.photoWrap,
          isToday && !isSelected && styles.photoWrapToday,
          isSelected && styles.photoWrapSelected,
        ]}>
          <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} />
          {isSelected && <View style={styles.photoSelectedOverlay} />}
          <Text style={[styles.dayNumber, styles.dayNumberOnPhoto, isDisabled && styles.dayNumberDisabled]}>
            {day}
          </Text>
        </View>
      ) : (
        <View style={[styles.numberWrap, isSelected && styles.numberWrapSelected]}>
          <Text style={[
            styles.dayNumber,
            isSelected && styles.dayNumberSelected,
            isToday && !isSelected && styles.dayNumberToday,
            isDisabled && styles.dayNumberDisabled,
          ]}>
            {day}
          </Text>
        </View>
      )}
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
  cell:                 { alignItems: 'center', justifyContent: 'center', paddingVertical: space[1], minHeight: 52, minWidth: 36 },
  // 사진 없는 날짜
  numberWrap:           { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numberWrapSelected:   { backgroundColor: colors.accent.primary },
  dayNumber:            { ...typography.body, color: colors.text.primary },
  dayNumberSelected:    { color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  dayNumberToday:       { color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
  dayNumberDisabled:    { color: colors.text.muted },
  // 사진 있는 날짜 — 원형 포토 배경 + 숫자 오버레이
  photoWrap:            { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.subtle },
  photoWrapToday:       { borderWidth: 2, borderColor: colors.accent.primary },
  photoWrapSelected:    { borderWidth: 2.5, borderColor: colors.accent.primary },
  photoSelectedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.accent.primary + '44' },
  dayNumberOnPhoto:     { color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  dotsRow:              { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot:                  { width: 5, height: 5, borderRadius: 2.5 },
});
