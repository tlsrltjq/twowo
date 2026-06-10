import { getDoc, doc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';

import { db } from '../../core/config/firebase';
import { subscribeCouple } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { colors, radius, space, typography } from '../../design-system/tokens';
import { subscribeMessages, sendMessage, Message } from './index';

function formatTime(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function ChatScreen() {
  const { user, coupleId } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerName, setPartnerName] = useState<string>('상대방');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // 상대방 이름 한 번만 조회
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

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !coupleId || !user || sending) return;
    setSending(true);
    setInputText('');
    try {
      await sendMessage(coupleId, user.uid, text);
    } catch {
      setInputText(text); // 실패 시 복원
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMine = item.senderId === user?.uid;
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
        {!isMine && (
          <Text style={styles.senderName}>{partnerName}</Text>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubblePartner]}>
          <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextPartner]}>
            {item.text}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>대화를 시작해보세요</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={1000}
            returnKeyType="default"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
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
  safeArea:           { flex: 1, backgroundColor: colors.bg.base },
  flex:               { flex: 1 },
  header:             { paddingHorizontal: space[5], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  headerTitle:        { ...typography.title2, color: colors.text.primary },

  listContent:        { padding: space[4], gap: space[3], paddingBottom: space[2] },

  bubbleRow:          { gap: 4 },
  bubbleRowRight:     { alignItems: 'flex-end' },
  bubbleRowLeft:      { alignItems: 'flex-start' },
  senderName:         { ...typography.tiny, color: colors.text.muted, marginLeft: space[2] },

  bubble:             { maxWidth: '75%', borderRadius: radius.lg, paddingHorizontal: space[4], paddingVertical: space[3] },
  bubbleMine:         { backgroundColor: colors.accent.primary, borderBottomRightRadius: 4 },
  bubblePartner:      { backgroundColor: colors.bg.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border.subtle },
  bubbleText:         { ...typography.body, lineHeight: 22 },
  bubbleTextMine:     { color: colors.text.inverse },
  bubbleTextPartner:  { color: colors.text.primary },
  timestamp:          { ...typography.tiny, color: colors.text.muted, marginHorizontal: space[2] },

  empty:              { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3] },
  emptyIcon:          { fontSize: 48 },
  emptyText:          { ...typography.body, color: colors.text.muted },

  inputBar:           {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
    gap: space[3],
  },
  input:              {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.bg.subtle,
    borderRadius: radius.xl,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    maxHeight: 120,
  },
  sendBtn:            {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled:    { backgroundColor: colors.bg.subtle },
});
