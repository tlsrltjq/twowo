import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { doc } from 'firebase/firestore';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteEvent } from '../../core/calendar';
import { CalendarEvent } from '../../core/calendar/schema';
import { db } from '../../core/config/firebase';
import { useFirestoreDoc } from '../../core/firestore-hooks';
import { EventPhoto,useEventPhotos } from '../../core/memory';
import { guardPhotoLimit, uploadPhoto } from '../../core/storage';
import { useAuthStore } from '../../core/stores/auth.store';
import { Spinner } from '../../design-system/Spinner';
import { Toast } from '../../design-system/Toast';
import { black, colors, radius, space, typography } from '../../design-system/tokens';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

type ToastState = { message: string; type: 'success' | 'error' | 'info'; visible: boolean };

function toCalendarEvent(id: string, data: Record<string, unknown>): CalendarEvent {
  return {
    ...(data as Omit<CalendarEvent, 'id' | 'date' | 'endDate' | 'createdAt' | 'updatedAt'>),
    id,
    date:      (data.date as { toDate(): Date }).toDate(),
    endDate:   data.endDate ? (data.endDate as { toDate(): Date }).toDate() : undefined,
    createdAt: (data.createdAt as { toDate(): Date }).toDate(),
    updatedAt: (data.updatedAt as { toDate(): Date }).toDate(),
    photoIds:  Array.isArray(data.photoIds) ? (data.photoIds as string[]) : [],
  };
}

const TYPE_LABEL: Record<string, string> = {
  date: '💑 데이트', exercise: '🏃 운동', general: '📅 일정',
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const viewerRef = useRef<FlatList<EventPhoto>>(null);

  const { photos } = useEventPhotos(id);

  const show = (message: string, type: ToastState['type']) =>
    setToast({ message, type, visible: true });

  const eventRef = doc(db, 'calendarEvents', id);
  const { data: raw, loading } = useFirestoreDoc(eventRef);

  const event: CalendarEvent | null = raw
    ? toCalendarEvent(id, raw as Record<string, unknown>)
    : null;

  const handleAddPhoto = useCallback(async () => {
    if (!event || !user) return;
    try {
      guardPhotoLimit(event.photoIds.length);
    } catch {
      show('사진은 최대 20장까지 첨부할 수 있어요', 'error');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('사진 접근 권한이 필요해요', '설정에서 사진 접근을 허용해주세요');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    show('사진을 업로드 중이에요...', 'info');

    try {
      await uploadPhoto(asset.uri, {
        coupleId:          event.coupleId,
        eventId:           id,
        currentPhotoCount: event.photoIds.length,
        width:             asset.width,
        height:            asset.height,
      });
      show('사진이 추가됐어요 📷', 'success');
    } catch {
      show('사진 업로드에 실패했어요', 'error');
    }
  }, [event, id, user]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      '일정 삭제',
      '삭제하면 첨부된 사진도 함께 삭제돼요. 계속할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(id);
              router.back();
            } catch {
              show('삭제에 실패했어요', 'error');
            }
          },
        },
      ],
    );
  }, [id]);

  if (loading) return <Spinner />;
  if (!event)  return (
    <View style={styles.center}>
      <Text style={styles.notFound}>일정을 찾을 수 없어요</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push(`/event/edit/${id}`)}>
            <Text style={styles.editText}>수정</Text>
          </Pressable>
          <Pressable onPress={handleDelete}>
            <Text style={styles.deleteText}>삭제</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.typeLabel}>{TYPE_LABEL[event.type] ?? event.type}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.date}>
          {event.date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>

        {event.placeName && (
          <View style={styles.row}>
            <Text style={styles.rowText}>📍 {event.placeName}</Text>
          </View>
        )}

        {event.memo && (
          <View style={styles.memoBox}>
            <Text style={styles.memoText}>{event.memo}</Text>
          </View>
        )}

        <View style={styles.photoHeader}>
          <Text style={styles.sectionTitle}>사진 ({event.photoIds.length}/20)</Text>
          <Pressable onPress={handleAddPhoto} style={styles.addPhotoBtn}>
            <Text style={styles.addPhotoText}>＋ 추가</Text>
          </Pressable>
        </View>

        {photos.length === 0 ? (
          <View style={styles.photoEmpty}>
            <Text style={styles.photoEmptyText}>아직 사진이 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={p => p.id}
            numColumns={3}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <Pressable style={styles.photoCell} onPress={() => setViewerIndex(index)}>
                {item.thumbUrl ? (
                  <Image source={{ uri: item.thumbUrl }} style={styles.photoThumb} resizeMode="cover" />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text>🖼️</Text>
                  </View>
                )}
              </Pressable>
            )}
          />
        )}
      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      <Modal
        visible={viewerIndex !== null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewerIndex(null)}
      >
        <View style={styles.viewer}>
          <Pressable style={styles.viewerClose} onPress={() => setViewerIndex(null)}>
            <Text style={styles.viewerCloseText}>✕</Text>
          </Pressable>
          <FlatList
            ref={viewerRef}
            data={photos}
            keyExtractor={p => p.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex ?? 0}
            getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
            renderItem={({ item }) => (
              <View style={styles.viewerPage}>
                {item.originalUrl ? (
                  <Image
                    source={{ uri: item.originalUrl }}
                    style={styles.viewerImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.viewerPlaceholder}>
                    <Text style={styles.viewerPlaceholderText}>🖼️</Text>
                  </View>
                )}
              </View>
            )}
          />
          <Text style={styles.viewerCounter}>
            {viewerIndex !== null ? `${viewerIndex + 1} / ${photos.length}` : ''}
          </Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg.base },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:         { ...typography.body, color: colors.text.secondary },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle, backgroundColor: colors.bg.surface },
  headerRight:      { flexDirection: 'row', gap: space[4] },
  backText:         { ...typography.body, color: colors.accent.primary },
  editText:         { ...typography.body, color: colors.text.secondary },
  deleteText:       { ...typography.body, color: colors.status.danger },
  body:             { padding: space[5], gap: space[4] },
  typeLabel:        { ...typography.caption, color: colors.text.secondary },
  title:            { ...typography.title1, color: colors.text.primary },
  date:             { ...typography.body, color: colors.text.secondary },
  row:              { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  rowText:          { ...typography.body, color: colors.text.secondary },
  memoBox:          { backgroundColor: colors.bg.subtle, borderRadius: radius.md, padding: space[4] },
  memoText:         { ...typography.body, color: colors.text.primary },
  photoHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:     { ...typography.bodyBold, color: colors.text.primary },
  addPhotoBtn:      { paddingVertical: space[1], paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: colors.accent.primary },
  addPhotoText:     { ...typography.caption, color: colors.text.inverse },
  photoEmpty:       { height: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.subtle, borderRadius: radius.md },
  photoEmptyText:   { ...typography.caption, color: colors.text.muted },
  photoCell:        { flex: 1, aspectRatio: 1, padding: space[1] },
  photoThumb:       { flex: 1, borderRadius: radius.sm },
  photoPlaceholder: { flex: 1, backgroundColor: colors.bg.subtle, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  viewer:               { flex: 1, backgroundColor: black },
  viewerClose:          { position: 'absolute', top: 56, right: space[5], zIndex: 10, padding: space[2] },
  viewerCloseText:      { fontSize: 24, color: colors.text.inverse },
  viewerPage:           { width: SCREEN_W, height: SCREEN_H, alignItems: 'center', justifyContent: 'center' },
  viewerImage:          { width: SCREEN_W, height: SCREEN_H },
  viewerPlaceholder:    { alignItems: 'center', justifyContent: 'center' },
  viewerPlaceholderText: { fontSize: 64 },
  viewerCounter:        { position: 'absolute', bottom: 48, width: '100%', textAlign: 'center', color: colors.text.inverse, ...typography.caption },
});
