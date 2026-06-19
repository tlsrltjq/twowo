import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { db } from '../../core/config/firebase';
import { CalendarEvent } from '../../core/calendar/schema';
import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { radius, space, typography } from '../../design-system/tokens';
import { groupByYearMonth, TYPE_EMOJI, useSharedStyles } from './_shared';

// 이벤트 ID → 대표 썸네일 URL
function usePhotoThumbnails(events: CalendarEvent[]): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const eventsWithPhotos = useMemo(
    () => events.filter(ev => ev.photoIds.length > 0),
    [events],
  );

  useEffect(() => {
    if (eventsWithPhotos.length === 0) { setThumbs({}); return; }
    let cancelled = false;
    Promise.all(
      eventsWithPhotos.map(ev => {
        const photoId = ev.photoIds[ev.photoIds.length - 1]!;
        return getDoc(doc(db, 'photos', photoId)).then(snap => ({
          eventId: ev.id,
          url: snap.exists() ? (snap.data()?.thumbUrl as string | undefined) : undefined,
        }));
      }),
    ).then(results => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      results.forEach(r => { if (r.url) map[r.eventId] = r.url; });
      setThumbs(map);
    }).catch(err => console.error('[usePhotoThumbnails]', err));
    return () => { cancelled = true; };
  }, [eventsWithPhotos]);

  return thumbs;
}

function PhotoCard({ event, thumbUrl }: { event: CalendarEvent; thumbUrl?: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const photoBg: Record<string, string> = {
    date:     colors.accent.primary + '40',
    exercise: colors.accent.warm    + '40',
    general:  colors.accent.calm    + '40',
  };
  const bg = photoBg[event.type] ?? photoBg['general']!;

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${event.date.getFullYear()}.${pad(event.date.getMonth() + 1)}.${pad(event.date.getDate())}`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.85}
    >
      <View style={[styles.cardInner, { backgroundColor: bg }]}>
        {thumbUrl
          ? <Image source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <Text style={styles.emoji}>{TYPE_EMOJI[event.type] ?? '📌'}</Text>
        }
        {/* 배지 */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📷 {event.photoIds.length}</Text>
        </View>
        {/* 하단 오버레이 */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.footerDate}>{dateStr}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function PhotoView({ events, loading }: { events: CalendarEvent[]; loading: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const sharedStyles = useSharedStyles();
  const thumbs = usePhotoThumbnails(events);

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
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* 요약 카드 */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.accent.calm }]}>{totalPhotos}</Text>
          <Text style={styles.statLabel}>전체 사진</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.accent.calm }]}>{thisMonthPhotos}</Text>
          <Text style={styles.statLabel}>이달 사진</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.accent.calm }]}>{events.length}</Text>
          <Text style={styles.statLabel}>이벤트</Text>
        </View>
      </View>

      {/* 월별 그룹 */}
      {groups.map(group => (
        <View key={group.key} style={styles.monthSection}>
          <View style={styles.monthHeaderRow}>
            <Text style={styles.monthHeaderText}>{group.title}</Text>
            <Text style={styles.monthPhotoCount}>
              {group.data.reduce((s, ev) => s + ev.photoIds.length, 0)}장
            </Text>
          </View>
          <View style={styles.grid}>
            {group.data.map(ev => (
              <PhotoCard key={ev.id} event={ev} {...(thumbs[ev.id] !== undefined ? { thumbUrl: thumbs[ev.id] } : {})} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  scroll:          { padding: space[4], gap: space[4], paddingBottom: 96 },

  statsCard:       { flexDirection: 'row', backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], borderWidth: 1, borderColor: colors.border.subtle, alignItems: 'center', justifyContent: 'space-around' },
  statItem:        { alignItems: 'center', gap: 2 },
  statNum:         { ...typography.title2, fontFamily: 'Pretendard-Bold' },
  statLabel:       { ...typography.tiny, color: colors.text.muted },
  statDivider:     { width: 1, height: 28, backgroundColor: colors.border.subtle },

  monthSection:    { gap: space[2] },
  monthHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[1] },
  monthHeaderText: { ...typography.caption, fontFamily: 'Pretendard-SemiBold', color: colors.text.muted },
  monthPhotoCount: { ...typography.tiny, color: colors.text.muted },

  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  card:            { width: '47.5%' },
  cardInner:       { aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  emoji:           { fontSize: 36 },

  badge:           { position: 'absolute', top: space[2], right: space[2], backgroundColor: 'rgba(26,22,20,0.65)', borderRadius: radius.pill, paddingHorizontal: space[2], paddingVertical: 2 },
  badgeText:       { ...typography.tiny, color: colors.text.inverse },

  footer:          { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(26,22,20,0.6)', padding: space[2] },
  footerTitle:     { ...typography.tiny, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  footerDate:      { fontSize: 10, lineHeight: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Pretendard-Regular' },
});
