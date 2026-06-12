import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CalendarEvent } from '../../core/calendar/schema';
import { colors, radius, space, typography } from '../../design-system/tokens';

export function formatDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function groupByYearMonth(
  events: CalendarEvent[],
): { title: string; data: CalendarEvent[]; key: string }[] {
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

export const TYPE_EMOJI: Record<string, string> = {
  date:     '💑',
  exercise: '🏃',
  general:  '📌',
};

export function TypeStatsBar({
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
    <View style={[sharedStyles.statsBar, { borderColor: accentColor + '40' }]}>
      <Text style={sharedStyles.statsEmoji}>{emoji}</Text>
      <View style={sharedStyles.statItem}>
        <Text style={[sharedStyles.statNumber, { color: accentColor }]}>{total}</Text>
        <Text style={sharedStyles.statLabel}>전체 {unitLabel}</Text>
      </View>
      <View style={sharedStyles.statDivider} />
      <View style={sharedStyles.statItem}>
        <Text style={[sharedStyles.statNumber, { color: accentColor }]}>{monthCount}</Text>
        <Text style={sharedStyles.statLabel}>이번 달 {unitLabel}</Text>
      </View>
    </View>
  );
}

export function TypeEventCard({ event }: { event: CalendarEvent }) {
  return (
    <TouchableOpacity
      style={sharedStyles.typeEventCard}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <View style={sharedStyles.typeEventLeft}>
        <Text style={sharedStyles.typeEventEmoji}>{TYPE_EMOJI[event.type] ?? '📌'}</Text>
      </View>
      <View style={sharedStyles.typeEventBody}>
        <Text style={sharedStyles.typeEventDate}>{formatDate(event.date)}</Text>
        <Text style={sharedStyles.typeEventTitle} numberOfLines={1}>{event.title}</Text>
        {event.placeName && (
          <Text style={sharedStyles.typeEventPlace} numberOfLines={1}>📍 {event.placeName}</Text>
        )}
        {event.memo && (
          <Text style={sharedStyles.typeEventMemo} numberOfLines={2}>{event.memo}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const sharedStyles = StyleSheet.create({
  skeletonContainer: { padding: space[4], gap: space[3] },
  skeletonRow:       { height: 60, borderRadius: radius.md },
  listContent:       { padding: space[4], gap: space[3], paddingBottom: 96 },
  monthHeader:       { ...typography.caption, color: colors.text.muted, paddingTop: space[3], paddingBottom: space[2], textTransform: 'uppercase', letterSpacing: 0.5 },

  statsBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], marginBottom: space[3], gap: space[5], borderWidth: 1 },
  statsEmoji:     { fontSize: 32 },
  statItem:       { alignItems: 'center', gap: 2 },
  statNumber:     { ...typography.title1, fontFamily: 'Pretendard-Bold' },
  statLabel:      { ...typography.tiny, color: colors.text.muted },
  statDivider:    { width: 1, height: 32, backgroundColor: colors.border.subtle },

  typeEventCard:  { flexDirection: 'row', backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3] },
  typeEventLeft:  { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bg.subtle, alignItems: 'center', justifyContent: 'center' },
  typeEventEmoji: { fontSize: 20 },
  typeEventBody:  { flex: 1, gap: 2 },
  typeEventDate:  { ...typography.tiny, color: colors.text.muted },
  typeEventTitle: { ...typography.bodyBold, color: colors.text.primary },
  typeEventPlace: { ...typography.caption, color: colors.text.secondary },
  typeEventMemo:  { ...typography.caption, color: colors.text.muted, marginTop: 2 },
});
