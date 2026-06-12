import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from '../../core/auth';
import { db } from '../../core/config/firebase';
import { disconnectCouple, usePartnerProfile } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { getDaysSince } from '../../core/utils/date';
import { colors, space, typography } from '../../design-system/tokens';

function timestampToKST(ts: { seconds: number } | Date | null | undefined): string {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts.seconds * 1000);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
}

export default function SettingsScreen() {
  const { user, coupleId } = useAuthStore();
  const { couple, partnerName } = usePartnerProfile(coupleId, user?.uid ?? null);

  const [nickname, setNickname]         = useState('');
  const [nicknameEditing, setNicknameEditing] = useState(false);
  const [anniversaryInput, setAnniversaryInput] = useState('');
  const [anniversaryEditing, setAnniversaryEditing] = useState(false);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    if (user?.displayName) setNickname(user.displayName);
  }, [user?.displayName]);

  const dDay = (() => {
    if (!couple) return null;
    const base = couple.anniversaryDate ?? couple.createdAt;
    if (!base) return null;
    const baseStr = timestampToKST(base);
    if (!baseStr) return null;
    return getDaysSince(baseStr) + 1;
  })();

  // 닉네임 저장 (BR-S1)
  const saveNickname = async () => {
    if (!user || !nickname.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { displayName: nickname.trim() }, { merge: true });
      setNicknameEditing(false);
    } catch {
      Alert.alert('오류', '닉네임 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 기념일 저장
  const saveAnniversary = async () => {
    if (!coupleId || !anniversaryInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('오류', 'YYYY-MM-DD 형식으로 입력해주세요');
      return;
    }
    const [y, m, d] = anniversaryInput.split('-').map(Number);
    const date = new Date(Date.UTC(y!, m! - 1, d!));
    setSaving(true);
    try {
      await setDoc(doc(db, 'couples', coupleId), { anniversaryDate: date }, { merge: true });
      setAnniversaryEditing(false);
    } catch {
      Alert.alert('오류', '기념일 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 로그아웃 (BR-S2)
  const handleSignOut = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃', style: 'destructive',
        onPress: async () => {
          await signOut();
          // subscribeAuthState → user null → index.tsx → login
        },
      },
    ]);
  };

  // 커플 해제 (BR-D1) — 2단계 확인
  const handleDisconnect = () => {
    Alert.alert(
      '커플 연결 해제',
      '연결을 해제하면 상대방 앱에서도 즉시 연결이 끊깁니다.\n정말 해제하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제하기', style: 'destructive',
          onPress: () => Alert.alert(
            '마지막 확인',
            '연결을 해제하면 둘 다 커플 화면에서 나가게 됩니다.\n정말요?',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '네, 해제합니다', style: 'destructive',
                onPress: async () => {
                  if (!user || !coupleId) return;
                  try {
                    await disconnectCouple(user.uid, coupleId);
                    // BR-D2: _layout의 subscribeCouple이 status 변경 감지 → setCoupleId(null) 자동 처리
                  } catch {
                    Alert.alert('오류', '해제 중 문제가 발생했습니다. 다시 시도해주세요');
                  }
                },
              },
            ],
          ),
        },
      ],
    );
  };

  const anniversaryStr = couple?.anniversaryDate
    ? timestampToKST(couple.anniversaryDate)
    : couple?.createdAt ? timestampToKST(couple.createdAt) : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* 커플 정보 */}
      <Section title="커플 정보">
        {dDay !== null && (
          <Row label="함께한 날" value={`D+${dDay}일`} />
        )}
        {partnerName ? <Row label="상대방" value={partnerName} /> : null}

        {/* 기념일 설정 */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>기념일</Text>
          {anniversaryEditing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.input}
                value={anniversaryInput}
                onChangeText={setAnniversaryInput}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                autoFocus
              />
              <TouchableOpacity onPress={saveAnniversary} disabled={saving} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>저장</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAnniversaryEditing(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setAnniversaryInput(anniversaryStr); setAnniversaryEditing(true); }}>
              <Text style={styles.rowValue}>{anniversaryStr || '설정 안 됨'} ✏️</Text>
            </TouchableOpacity>
          )}
        </View>
      </Section>

      {/* 내 프로필 */}
      <Section title="내 프로필">
        <View style={styles.row}>
          <Text style={styles.rowLabel}>닉네임</Text>
          {nicknameEditing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                autoFocus
                maxLength={20}
              />
              <TouchableOpacity onPress={saveNickname} disabled={saving} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>저장</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setNicknameEditing(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setNicknameEditing(true)}>
              <Text style={styles.rowValue}>{nickname || user?.email || '-'} ✏️</Text>
            </TouchableOpacity>
          )}
        </View>
        <Row label="이메일" value={user?.email ?? '-'} />
      </Section>

      {/* 계정 */}
      <Section title="계정">
        <TouchableOpacity testID="btn-signout" onPress={handleSignOut} style={styles.actionRow}>
          <Text style={styles.actionText}>로그아웃</Text>
        </TouchableOpacity>
      </Section>

      {/* 위험 영역 */}
      <Section title="위험 영역">
        <Text style={styles.dangerDesc}>커플 연결을 해제하면 상대방 앱도 즉시 연결이 끊깁니다.</Text>
        <TouchableOpacity onPress={handleDisconnect} style={styles.dangerBtn}>
          <Text style={styles.dangerBtnText}>커플 연결 해제</Text>
        </TouchableOpacity>
      </Section>
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: colors.bg.base },
  flex:          { flex: 1 },
  scroll:        { flex: 1 },
  container:     { padding: space[4], gap: space[5] },

  section:       { gap: space[2] },
  sectionTitle:  { ...typography.caption, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBody:   { backgroundColor: colors.bg.surface, borderRadius: 12, overflow: 'hidden' },

  row:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[4], borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle },
  rowLabel:      { ...typography.body, color: colors.text.secondary },
  rowValue:      { ...typography.body, color: colors.text.primary },

  editRow:       { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1, justifyContent: 'flex-end' },
  input:         { ...typography.body, color: colors.text.primary, borderBottomWidth: 1, borderBottomColor: colors.accent.primary, minWidth: 120, paddingVertical: 2 },
  saveBtn:       { paddingHorizontal: space[3], paddingVertical: space[1], backgroundColor: colors.accent.primary, borderRadius: 6 },
  saveBtnText:   { ...typography.caption, color: colors.text.inverse },
  cancelBtn:     { paddingHorizontal: space[2], paddingVertical: space[1] },
  cancelBtnText: { ...typography.caption, color: colors.text.muted },

  actionRow:     { padding: space[4] },
  actionText:    { ...typography.body, color: colors.accent.primary },

  dangerDesc:    { ...typography.caption, color: colors.text.muted, padding: space[4], paddingBottom: 0 },
  dangerBtn:     { margin: space[4], padding: space[4], backgroundColor: colors.status.danger, borderRadius: 10, alignItems: 'center' },
  dangerBtnText: { ...typography.body, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
});
