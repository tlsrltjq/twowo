import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../../core/stores/auth.store';
import { Button } from '../../design-system/Button';
import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { Spinner } from '../../design-system/Spinner';
import { Toast } from '../../design-system/Toast';
import { black, colors, radius, space, typography } from '../../design-system/tokens';
import { addSong, deleteSong, subscribePlaylist } from './index';
import { PlaylistSong } from './schema';

type ToastState = { message: string; type: 'success' | 'error' | 'info'; visible: boolean };

export default function OurPlaylistScreen() {
  const { user, coupleId } = useAuthStore();
  const [songs, setSongs]   = useState<PlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle]   = useState('');
  const [artist, setArtist] = useState('');
  const [period, setPeriod] = useState('');
  const [memo, setMemo]     = useState('');
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const show = (msg: string, type: ToastState['type']) =>
    setToast({ message: msg, type, visible: true });

  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!coupleId) return;
    unsubRef.current = subscribePlaylist(coupleId, (list) => {
      setSongs(list);
      setLoading(false);
    });
    return () => unsubRef.current?.();
  }, [coupleId]);

  const resetForm = () => {
    setTitle(''); setArtist(''); setPeriod(''); setMemo('');
  };

  const handleAdd = async () => {
    if (!user || !coupleId) return;
    if (!title.trim() || !artist.trim()) {
      show('제목과 아티스트를 입력해 주세요', 'error');
      return;
    }
    setSaving(true);
    try {
      await addSong({
        coupleId,
        addedBy: user.uid,
        title:   title.trim(),
        artist:  artist.trim(),
        period:  period.trim() || undefined,
        memo:    memo.trim()   || undefined,
      });
      resetForm();
      setModalVisible(false);
      show('노래를 추가했어요 🎵', 'success');
    } catch {
      show('추가에 실패했어요', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLongPress = (song: PlaylistSong) => {
    if (song.addedBy !== user?.uid) return; // BR-6: 내가 추가한 것만
    Alert.alert('노래 삭제', `"${song.title}"을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteSong(song.id);
            show('삭제했어요', 'info');
          } catch {
            show('삭제에 실패했어요', 'error');
          }
        },
      },
    ]);
  };

  if (!coupleId) return <Spinner />;

  return (
    <SafeAreaView testID="screen-our-playlist" style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.body}>
        <Text style={styles.screenTitle}>우리의 플레이리스트</Text>

        {loading ? (
          <View style={styles.skeletonWrap}>
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </View>
        ) : songs.length === 0 ? (
          <EmptyState
            title="아직 노래가 없어요"
            description="우리 노래를 추가해보세요 🎵"
          />
        ) : (
          <View style={styles.list}>
            {songs.map(song => (
              <TouchableOpacity
                key={song.id}
                onLongPress={() => handleLongPress(song)}
                activeOpacity={0.85}
                testID={`song-card-${song.id}`}
              >
                <SongCard song={song} isMe={song.addedBy === user?.uid} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onHide={() => setToast(t => ({ ...t, visible: false }))}
        />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        testID="fab-add-song"
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      {/* 추가 모달 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { resetForm(); setModalVisible(false); }}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>노래 추가</Text>
            <TouchableOpacity onPress={() => { resetForm(); setModalVisible(false); }}>
              <Text style={styles.modalClose}>취소</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>제목 <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={t => { if (t.length <= 80) setTitle(t); }}
              placeholder="곡 제목"
              placeholderTextColor={colors.text.muted}
              maxLength={80}
              testID="input-song-title"
            />

            <Text style={styles.fieldLabel}>아티스트 <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={artist}
              onChangeText={t => { if (t.length <= 60) setArtist(t); }}
              placeholder="아티스트 / 밴드"
              placeholderTextColor={colors.text.muted}
              maxLength={60}
              testID="input-song-artist"
            />

            <Text style={styles.fieldLabel}>기간 (선택)</Text>
            <TextInput
              style={styles.input}
              value={period}
              onChangeText={t => { if (t.length <= 30) setPeriod(t); }}
              placeholder="2023 여름, 처음 만났을 때…"
              placeholderTextColor={colors.text.muted}
              maxLength={30}
              testID="input-song-period"
            />

            <Text style={styles.fieldLabel}>
              기억 메모 (선택){'  '}
              <Text style={styles.charCount}>{memo.length}/100</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.memoInput]}
              value={memo}
              onChangeText={t => { if (t.length <= 100) setMemo(t); }}
              placeholder="이 노래와 함께한 기억"
              placeholderTextColor={colors.text.muted}
              multiline
              maxLength={100}
              testID="input-song-memo"
            />

            <View style={styles.submitBtn}>
              <Button
                testID="btn-song-add"
                label={saving ? '추가 중...' : '추가하기'}
                onPress={handleAdd}
                disabled={saving || !title.trim() || !artist.trim()}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SongCard({ song, isMe }: { song: PlaylistSong; isMe: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>🎵 {song.title}</Text>
          <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
        </View>
        <View style={styles.cardMeta}>
          {song.period ? (
            <View style={styles.periodBadge}>
              <Text style={styles.periodText}>{song.period}</Text>
            </View>
          ) : null}
          <Text style={styles.addedBy}>{isMe ? '나' : '상대방'}</Text>
        </View>
      </View>
      {song.memo ? (
        <Text style={styles.songMemo} numberOfLines={2}>"{song.memo}"</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: colors.bg.base },
  container:     { flex: 1 },
  body:          { padding: space[5], gap: space[3], paddingBottom: space[12] },
  screenTitle:   { ...typography.title2, color: colors.text.primary },
  skeletonWrap:  { gap: space[3] },
  list:          { gap: space[3] },

  card:          { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[2], shadowColor: black, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo:      { flex: 1, gap: space[1] },
  cardMeta:      { alignItems: 'flex-end', gap: space[1] },
  songTitle:     { ...typography.bodyBold, color: colors.text.primary },
  songArtist:    { ...typography.caption, color: colors.text.secondary },
  periodBadge:   { backgroundColor: colors.accent.warm + '33', paddingVertical: 2, paddingHorizontal: space[2], borderRadius: radius.pill },
  periodText:    { ...typography.tiny, color: colors.accent.warm, fontFamily: 'Pretendard-SemiBold' },
  addedBy:       { ...typography.tiny, color: colors.text.muted },
  songMemo:      { ...typography.caption, color: colors.text.muted, fontStyle: 'italic' },

  fab:           { position: 'absolute', bottom: space[8], right: space[5], width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center', shadowColor: black, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabIcon:       { fontSize: 28, color: colors.text.inverse, lineHeight: 34 },

  modalSafe:     { flex: 1, backgroundColor: colors.bg.base },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[5], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  modalTitle:    { ...typography.bodyBold, color: colors.text.primary },
  modalClose:    { ...typography.body, color: colors.accent.primary },
  modalScroll:   { flex: 1 },
  modalBody:     { padding: space[5], gap: space[3], paddingBottom: space[10] },
  fieldLabel:    { ...typography.caption, color: colors.text.secondary },
  required:      { color: colors.status.danger },
  charCount:     { ...typography.tiny, color: colors.text.muted },
  input:         { backgroundColor: colors.bg.subtle, borderRadius: radius.md, padding: space[3], ...typography.body, color: colors.text.primary },
  memoInput:     { minHeight: 80 },
  submitBtn:     { marginTop: space[2] },
});
