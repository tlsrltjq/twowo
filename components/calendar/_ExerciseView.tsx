import { useMemo } from 'react';
import { SectionList, Text, View } from 'react-native';

import { CalendarEvent } from '../../core/calendar/schema';
import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { useColors } from '../../design-system/ThemeContext';
import { groupByYearMonth, TypeEventCard, TypeStatsBar, useSharedStyles } from './_shared';

export function ExerciseView({
  events,
  loading,
  myUid,
  partnerName,
}: {
  events: CalendarEvent[];
  loading: boolean;
  myUid?: string;
  partnerName?: string;
}) {
  const colors = useColors();
  const sharedStyles = useSharedStyles();
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return events.filter(
      ev => ev.date.getFullYear() === now.getFullYear() && ev.date.getMonth() === now.getMonth(),
    ).length;
  }, [events]);
  const sections = useMemo(() => groupByYearMonth(events), [events]);

  if (loading) {
    return (
      <View style={sharedStyles.skeletonContainer}>
        {[0, 1, 2].map(i => <Skeleton key={i} style={sharedStyles.skeletonRow} />)}
      </View>
    );
  }
  if (events.length === 0) {
    return <EmptyState title="운동 기록이 없어요" description="일정 추가 시 '운동' 타입을 선택해보세요" />;
  }
  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <TypeStatsBar
          emoji="🏃"
          total={events.length}
          monthCount={thisMonthCount}
          accentColor={colors.accent.warm}
          unitLabel="회"
        />
      }
      renderSectionHeader={({ section }) => (
        <Text style={sharedStyles.monthHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => <TypeEventCard event={item} {...(myUid ? { myUid, partnerName } : {})} />}
      contentContainerStyle={sharedStyles.listContent}
      stickySectionHeadersEnabled={false}
    />
  );
}
