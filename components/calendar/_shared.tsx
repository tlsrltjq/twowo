import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CalendarEvent } from '../../core/calendar/schema';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { hairline, radius, space, typography } from '../../design-system/tokens';

export function useDotColor(): Record<string, string> {
  const colors = useColors();
  return useMemo(() => ({
    date:     colors.accent.primary,
    exercise: colors.accent.warm,
    general:  colors.text.muted,
  }), [colors]);
}

export function useSharedStyles() {
  const colors = useColors();
  return useMemo(() => makeSharedStyles(colors), [colors]);
}

export function PersonBadge({ isMe, name }: { isMe: boolean; name: string }) {
  const colors = useColors();
  const sharedStyles = useMemo(() => makeSharedStyles(colors), [colors]);

  return (
    <View
      style={[sharedStyles.personBadge, isMe ? sharedStyles.personBadgeMe : sharedStyles.personBadgeOther]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[sharedStyles.personBadgeText, isMe ? sharedStyles.personBadgeTextMe : sharedStyles.personBadgeTextOther]}>
        {isMe ? '나' : name}
      </Text>
    </View>
  );
}

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

export function TypeEventCard({
  event,
  myUid,
  partnerName,
}: {
  event: CalendarEvent;
  myUid?: string;
  partnerName?: string;
}) {
  const colors = useColors();
  const sharedStyles = useMemo(() => makeSharedStyles(colors), [colors]);
  const dotColor = useDotColor();
  const showBadge = event.type !== 'date' && myUid != null;
  const isMe      = event.createdBy === myUid;

  return (
    <TouchableOpacity
      style={sharedStyles.typeEventCard}
      onPress={() => router.push(`/event/${event.id}`)}
      accessibilityLabel={event.title}
    >
      <View style={[sharedStyles.calEventDot, sharedStyles.typeEventDot, { backgroundColor: dotColor[event.type] ?? colors.text.muted }]} />
      <View style={sharedStyles.typeEventBody}>
        <View style={sharedStyles.typeEventDateRow}>
          <Text style={sharedStyles.typeEventDate}>{formatDate(event.date)}</Text>
          {showBadge && <PersonBadge isMe={isMe} name={partnerName ?? '상대방'} />}
        </View>
        <Text style={sharedStyles.typeEventTitle} numberOfLines={1}>{event.title}</Text>
        {event.placeName && (
          <Text style={sharedStyles.typeEventPlace} numberOfLines={1}>{event.placeName}</Text>
        )}
        {event.memo && (
          <Text style={sharedStyles.typeEventMemo} numberOfLines={2}>{event.memo}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CalendarEventCard({
  event,
  myUid,
  partnerName,
}: {
  event: CalendarEvent;
  myUid?: string;
  partnerName?: string;
}) {
  const colors = useColors();
  const sharedStyles = useMemo(() => makeSharedStyles(colors), [colors]);
  const dotColor = useDotColor();
  const showBadge = event.type !== 'date' && myUid != null;
  const isMe      = event.createdBy === myUid;

  return (
    <TouchableOpacity
      style={sharedStyles.calEventCard}
      onPress={() => router.push(`/event/${event.id}`)}
      accessibilityLabel={event.title}
    >
      <View style={[sharedStyles.calEventDot, { backgroundColor: dotColor[event.type] ?? colors.text.muted }]} />
      <View style={sharedStyles.calEventInfo}>
        <Text style={sharedStyles.calEventTitle} numberOfLines={1}>{event.title}</Text>
        {event.placeName && (
          <Text style={sharedStyles.calEventSub} numberOfLines={1}>{event.placeName}</Text>
        )}
      </View>
      {showBadge && <PersonBadge isMe={isMe} name={partnerName ?? '상대방'} />}
    </TouchableOpacity>
  );
}

const makeSharedStyles = (colors: Colors) => StyleSheet.create({
  skeletonContainer: { padding: space[4], gap: space[3] },
  skeletonRow:       { height: 60, borderRadius: radius.md },
  listContent:       { paddingHorizontal: space[5], paddingBottom: space[12] * 2 },
  monthHeader:       { ...typography.label, color: colors.text.secondary, paddingTop: space[6], paddingBottom: space[2], borderBottomWidth: hairline, borderBottomColor: colors.border.strong, backgroundColor: colors.bg.base },

  typeEventCard:    { flexDirection: 'row', paddingVertical: space[4], gap: space[3], borderBottomWidth: hairline, borderBottomColor: colors.border.subtle },
  typeEventDot:     { marginTop: space[1] + 1 },
  typeEventBody:    { flex: 1, gap: 2 },
  typeEventDateRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  typeEventDate:    { ...typography.tiny, color: colors.text.muted },
  typeEventTitle:   { ...typography.body, color: colors.text.primary },
  typeEventPlace:   { ...typography.caption, color: colors.text.secondary },
  typeEventMemo:    { ...typography.caption, color: colors.text.muted, marginTop: 2 },

  calEventCard:  { flexDirection: 'row', alignItems: 'center', paddingVertical: space[4], gap: space[3], borderBottomWidth: hairline, borderBottomColor: colors.border.subtle },
  calEventDot:   { width: space[2], height: space[2], borderRadius: radius.pill, flexShrink: 0 },
  calEventInfo:  { flex: 1 },
  calEventTitle: { ...typography.body, color: colors.text.primary },
  calEventSub:   { ...typography.caption, color: colors.text.secondary, marginTop: 2 },

  personBadge:         { paddingHorizontal: space[1], paddingVertical: 0 },
  personBadgeMe:       {},
  personBadgeOther:    {},
  personBadgeText:     { ...typography.tiny },
  personBadgeTextMe:   { color: colors.accent.primary },
  personBadgeTextOther: { color: colors.text.secondary },
});
