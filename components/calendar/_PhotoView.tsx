import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CalendarEvent } from '../../core/calendar/schema';
import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { radius, space, typography } from '../../design-system/tokens';
import { groupByYearMonth, TYPE_EMOJI, TypeStatsBar, useSharedStyles } from './_shared';

function PhotoCard({ event }: { event: CalendarEvent }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const photoBg: Record<string, string> = {
    date:     colors.accent.primary + '30',
    exercise: colors.accent.warm    + '30',
    general:  colors.accent.calm    + '30',
  };
  const bg = photoBg[event.type] ?? photoBg['general']!;

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
          <Text style={styles.photoCardDate}>{event.date.getFullYear()}.{String(event.date.getMonth() + 1).padStart(2, '0')}.{String(event.date.getDate()).padStart(2, '0')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function PhotoView({ events, loading }: { events: CalendarEvent[]; loading: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const sharedStyles = useSharedStyles();

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
      <View style={sharedStyles.skeletonContainer}>
        {[0, 1, 2].map(i => <Skeleton key={i} style={sharedStyles.skeletonRow} />)}
      </View>
    );
  }
  if (events.length === 0) {
    return <EmptyState title="사진이 없어요" description="일정에 사진을 추가해보세요" />;
  }
  return (
    <ScrollView contentContainerStyle={styles.photoListContent}>
      <TypeStatsBar
        emoji="📸"
        total={totalPhotos}
        monthCount={thisMonthPhotos}
        accentColor={colors.accent.calm}
        unitLabel="장"
      />
      {groups.map(group => (
        <View key={group.key}>
          <Text style={sharedStyles.monthHeader}>{group.title}</Text>
          <View style={styles.photoMonthGrid}>
            {group.data.map(ev => <PhotoCard key={ev.id} event={ev} />)}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  photoListContent: { padding: space[4], paddingBottom: 96 },
  photoMonthGrid:   { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[1] },
  photoCard:        { width: '33.33%', padding: space[1] },
  photoCardInner:   { aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photoCardEmoji:   { fontSize: 28 },
  photoBadge:       { position: 'absolute', top: space[1], right: space[1], backgroundColor: 'rgba(26,22,20,0.65)', borderRadius: radius.pill, paddingHorizontal: space[2], paddingVertical: 2 },
  photoBadgeText:   { ...typography.tiny, color: colors.text.inverse },
  photoCardFooter:  { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(26,22,20,0.55)', padding: space[2] },
  photoCardTitle:   { ...typography.tiny, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  photoCardDate:    { fontSize: 10, lineHeight: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Pretendard-Regular' },
});
