import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from '../../core/auth';
import { db } from '../../core/config/firebase';
import { disconnectCouple, usePartnerProfile } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { useThemeStore } from '../../core/stores/theme.store';
import { getDaysSince } from '../../core/utils/date';
import { useColors } from '../../design-system/ThemeContext';
import { ACCENT_META, AccentId, Colors } from '../../design-system/themes';
import { space, typography } from '../../design-system/tokens';

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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, coupleId } = useAuthStore();
  const { couple, partnerName } = usePartnerProfile(coupleId, user?.uid ?? null);
  const { accentId, isDark, setAccent, setDark } = useThemeStore();

  const [nickname, setNickname]                   = useState('');
  const [nicknameEditing, setNicknameEditing]     = useState(false);
  const [anniversaryInput, setAnniversaryInput]   = useState('');
  const [anniversaryEditing, setAnniversaryEditing] = useState(false);
  const [saving, setSaving]                       = useState(false);

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

  const handleSignOut = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃', style: 'destructive',
        onPress: async () => { await signOut(); },
      },
    ]);
  };

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

  const accentIds = Object.keys(ACCENT_META) as AccentId[];

  return (
    <SafeAreaView testID="screen-settings" style={styles.safeArea} edges={['top']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      <Section title="테마" colors={colors}>
        <View style={styles.themeSection}>
          <Text style={styles.themeLabel}>색상</Text>
          <View style={styles.accentRow}>
            {accentIds.map(id => (
              <Pressable
                key={id}
                style={[
                  styles.accentCircle,
                  { backgroundColor: ACCENT_META[id].preview },
                  accentId === id && styles.accentCircleActive,
                ]}
                onPress={() => setAccent(id)}
              />
            ))}
          </View>
          <View style={styles.darkRow}>
            <Text style={styles.darkLabel}>다크 모드</Text>
            <Switch
              value={isDark}
              onValueChange={setDark}
              trackColor={{ false: colors.border.subtle, true: colors.accent.primary }}
              thumbColor={colors.bg.surface}
              ios_backgroundColor={colors.border.subtle}
            />
          </View>
        </View>
      </Section>

      <Section title="커플 정보" colors={colors}>
        {dDay !== null && (
          <Row label="함께한 날" value={`D+${dDay}일`} styles={styles} />
        )}
        {partnerName ? <Row label="상대방" value={partnerName} styles={styles} /> : null}

        <View style={styles.row}>
          <Text style={styles.rowLabel}>기념일</Text>
          {anniversaryEditing ? (
            <View style={styles.editRow}>
              <TextInput
                testID="input-anniversary"
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
            <TouchableOpacity testID="btn-edit-anniversary" onPress={() => { setAnniversaryInput(anniversaryStr); setAnniversaryEditing(true); }}>
              <Text style={styles.rowValue}>{anniversaryStr || '설정 안 됨'} ✏️</Text>
            </TouchableOpacity>
          )}
        </View>
      </Section>

      <Section title="내 프로필" colors={colors}>
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
        <Row label="이메일" value={user?.email ?? '-'} styles={styles} />
      </Section>

      <Section title="계정" colors={colors}>
        <TouchableOpacity testID="btn-signout" onPress={handleSignOut} style={styles.actionRow}>
          <Text style={styles.actionText}>로그아웃</Text>
        </TouchableOpacity>
      </Section>

      <Section title="위험 영역" colors={colors}>
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

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: Colors }) {
  const styles = useMemo(() => makeSectionStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const makeSectionStyles = (colors: Colors) => StyleSheet.create({
  section:      { gap: space[2] },
  sectionTitle: { ...typography.caption, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBody:  { backgroundColor: colors.bg.surface, borderRadius: 12, overflow: 'hidden' },
});

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: colors.bg.base },
  flex:          { flex: 1 },
  scroll:        { flex: 1 },
  container:     { padding: space[4], gap: space[5] },

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

  themeSection:  { padding: space[4], gap: space[4] },
  themeLabel:    { ...typography.caption, color: colors.text.secondary },
  accentRow:     { flexDirection: 'row', gap: space[3], flexWrap: 'wrap' },
  accentCircle:  { width: 32, height: 32, borderRadius: 16 },
  accentCircleActive: { borderWidth: 3, borderColor: colors.text.primary, transform: [{ scale: 1.15 }] },
  darkRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  darkLabel:     { ...typography.body, color: colors.text.primary },
});
