import * as ImagePicker from 'expo-image-picker';
import { getDoc, doc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImageIcon, RefreshCw, Send } from 'lucide-react-native';

import { db } from '../../core/config/firebase';
import { subscribeCouple } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { colors, radius, space, typography } from '../../design-system/tokens';
import { subscribeMessages, sendMessage, sendImageMessage, Message, PendingImage } from './index';

// ─── date helpers ─────────────────────────────────────────────────────────────

function getDateKey(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateLabel(date: Date | null): string {
  if (!date) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const key = getDateKey(date);
  if (key === getDateKey(today)) return '오늘';
  if (key === getDateKey(yesterday)) return '어제';
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── list items ───────────────────────────────────────────────────────────────

type MsgItem  = { type: 'msg';     key: string; data: Message };
type SepItem  = { type: 'sep';     key: string; label: string };
type PendItem = { type: 'pending'; key: string; data: PendingImage };
type ListItem = MsgItem | SepItem | PendItem;

function buildItems(messages: Message[]): (MsgItem | SepItem)[] {
  const items: (MsgItem | SepItem)[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;
    items.push({ type: 'msg', key: msg.id, data: msg });

    // After the last message in a date group, add a separator above that group
    const isLastInGroup =
      i === messages.length - 1 ||
      getDateKey(msg.createdAt) !== getDateKey(messages[i + 1]!.createdAt);

    if (isLastInGroup && msg.createdAt) {
      items.push({
        type: 'sep',
        key: `sep-${getDateKey(msg.createdAt)}`,
        label: formatDateLabel(msg.createdAt),
      });
    }
  }
  return items;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { user, coupleId } = useAuthStore();
  const [messages, setMessages]       = useState<Message[]>([]);
  const [partnerName, setPartnerName] = useState('상대방');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [inputText, setInputText]     = useState('');
  const [sending, setSending]         = useState(false);
  const inputRef = useRef<TextInput>(null);

  // 상대방 이름 조회
  useEffect(() => {
    if (!coupleId || !user) return;
    const unsub = subscribeCouple(coupleId, async couple => {
      const partnerUid = (couple.memberIds as string[]).find(id => id !== user.uid);
      if (!partnerUid) return;
      try {
        const snap = await getDoc(doc(db, 'users', partnerUid));
        const name = snap.data()?.displayName as string | undefined;
        if (name) setPartnerName(name);
      } catch {}
    });
    return unsub;
  }, [coupleId, user]);

  // 메시지 실시간 구독
  useEffect(() => {
    if (!coupleId) return;
    return subscribeMessages(coupleId, setMessages);
  }, [coupleId]);

  // 텍스트 전송
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !coupleId || !user || sending) return;
    setSending(true);
    setInputText('');
    try {
      await sendMessage(coupleId, user.uid, text);
    } catch {
      setInputText(text);
      Alert.alert('전송 실패', '메시지를 다시 보내주세요');
    } finally {
      setSending(false);
    }
  }, [inputText, coupleId, user, sending]);

  // 이미지 선택 + 업로드
  const handlePickImage = useCallback(async () => {
    if (!coupleId || !user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요해요');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;
    const tempId = `pending-${Date.now()}`;

    const addPending = (status: PendingImage['status']) =>
      setPendingImages(prev => {
        const next = prev.filter(p => p.tempId !== tempId);
        return status === 'uploading'
          ? [{ tempId, senderId: user.uid, localUri, status }, ...next]
          : [...next, { tempId, senderId: user.uid, localUri, status }];
      });

    addPending('uploading');
    try {
      await sendImageMessage(coupleId, user.uid, localUri);
      setPendingImages(prev => prev.filter(p => p.tempId !== tempId));
    } catch {
      addPending('failed');
    }
  }, [coupleId, user]);

  // 실패 이미지 재시도
  const handleRetry = useCallback(async (pending: PendingImage) => {
    if (!coupleId || !user) return;
    setPendingImages(prev =>
      prev.map(p => p.tempId === pending.tempId ? { ...p, status: 'uploading' } : p)
    );
    try {
      await sendImageMessage(coupleId, user.uid, pending.localUri);
      setPendingImages(prev => prev.filter(p => p.tempId !== pending.tempId));
    } catch {
      setPendingImages(prev =>
        prev.map(p => p.tempId === pending.tempId ? { ...p, status: 'failed' } : p)
      );
    }
  }, [coupleId, user]);

  // FlatList data: pending at front (= bottom in inverted), then Firestore messages with separators
  const listData: ListItem[] = [
    ...pendingImages.map<PendItem>(p => ({ type: 'pending', key: p.tempId, data: p })),
    ...buildItems(messages),
  ];

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'sep') {
      return (
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorLabel}>{item.label}</Text>
          <View style={styles.separatorLine} />
        </View>
      );
    }

    if (item.type === 'pending') {
      const p = item.data;
      const isMine = p.senderId === user?.uid;
      return (
        <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubblePartner, styles.imageBubble]}>
            <Image source={{ uri: p.localUri }} style={styles.chatImage} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              {p.status === 'uploading' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <TouchableOpacity onPress={() => handleRetry(p)} style={styles.retryBtn}>
                  <RefreshCw size={20} color="#fff" />
                  <Text style={styles.retryText}>재시도</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      );
    }

    const msg = item.data;
    const isMine = msg.senderId === user?.uid;
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
        {!isMine && <Text style={styles.senderName}>{partnerName}</Text>}
        {msg.imageUrl ? (
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubblePartner, styles.imageBubble]}>
            <Image source={{ uri: msg.imageUrl }} style={styles.chatImage} resizeMode="cover" />
          </View>
        ) : (
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubblePartner]}>
            <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextPartner]}>
              {msg.text}
            </Text>
          </View>
        )}
        <Text style={styles.timestamp}>{formatTime(msg.createdAt)}</Text>
      </View>
    );
  };

  const isEmpty = messages.length === 0 && pendingImages.length === 0;

  return (
    <SafeAreaView testID="screen-chat" style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isEmpty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>대화를 시작해보세요</Text>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={item => item.key}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.imageBtn} onPress={handlePickImage}>
            <ImageIcon size={22} color={colors.text.muted} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            testID="input-chat"
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            testID="btn-chat-send"
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Send size={20} color={inputText.trim() ? colors.text.inverse : colors.text.muted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:          { flex: 1, backgroundColor: colors.bg.base },
  flex:              { flex: 1 },

  header:            {
    paddingHorizontal: space[5],
    paddingVertical: space[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle:       { ...typography.title2, color: colors.text.primary },

  listContent:       { padding: space[4], gap: space[3], paddingBottom: space[2] },

  separator:         { flexDirection: 'row', alignItems: 'center', gap: space[3], marginVertical: space[2] },
  separatorLine:     { flex: 1, height: 1, backgroundColor: colors.border.subtle },
  separatorLabel:    { ...typography.tiny, color: colors.text.muted },

  bubbleRow:         { gap: 4 },
  bubbleRowRight:    { alignItems: 'flex-end' },
  bubbleRowLeft:     { alignItems: 'flex-start' },
  senderName:        { ...typography.tiny, color: colors.text.muted, marginLeft: space[2] },

  bubble:            { maxWidth: '75%', borderRadius: radius.lg, paddingHorizontal: space[4], paddingVertical: space[3] },
  bubbleMine:        { backgroundColor: colors.accent.primary, borderBottomRightRadius: 4 },
  bubblePartner:     { backgroundColor: colors.bg.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border.subtle },
  bubbleText:        { ...typography.body, lineHeight: 22 },
  bubbleTextMine:    { color: colors.text.inverse },
  bubbleTextPartner: { color: colors.text.primary },
  timestamp:         { ...typography.tiny, color: colors.text.muted, marginHorizontal: space[2] },

  imageBubble:       { padding: 0, overflow: 'hidden' },
  chatImage:         { width: 200, height: 200 },
  imageOverlay:      { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  retryBtn:          { alignItems: 'center', gap: space[1] },
  retryText:         { ...typography.tiny, color: '#fff' },

  empty:             { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3] },
  emptyIcon:         { fontSize: 48 },
  emptyText:         { ...typography.body, color: colors.text.muted },

  inputBar:          {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
    gap: space[2],
  },
  imageBtn:          { padding: space[2], alignSelf: 'flex-end', marginBottom: 2 },
  input:             {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.bg.subtle,
    borderRadius: radius.xl,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    maxHeight: 120,
  },
  sendBtn:           { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:   { backgroundColor: colors.bg.subtle },
});
