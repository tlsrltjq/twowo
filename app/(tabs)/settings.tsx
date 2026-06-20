import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
// TextInput은 닉네임/기념일 편집에 사용
import { SafeAreaView } from 'react-native-safe-area-context';

import appJson from '../../app.json';
import { signOut } from '../../core/auth';
import { db } from '../../core/config/firebase';
import { usePartnerProfile } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { useThemeStore } from '../../core/stores/theme.store';
import { getDaysSince } from '../../core/utils/date';
import { useColors } from '../../design-system/ThemeContext';
import { ACCENT_META, AccentId, Colors } from '../../design-system/themes';
import { space, typography } from '../../design-system/tokens';

const APP_VERSION = appJson.expo.version;
const SUPPORT_EMAIL = 'psl87531@gmail.com';

function timestampToKST(ts: { seconds: number } | Date | null | undefined): string {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts.seconds * 1000);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, coupleId } = useAuthStore();
  const { couple, partnerName } = usePartnerProfile(coupleId, user?.uid ?? null);
  const { accentId, isDark, setAccent, setDark } = useThemeStore();

  // 닉네임
  const [nickname, setNickname]               = useState('');
  const [nicknameEditing, setNicknameEditing] = useState(false);

  // 기념일
  const [anniversaryInput, setAnniversaryInput]     = useState('');
  const [anniversaryEditing, setAnniversaryEditing] = useState(false);

  // 알림
  const [notifGranted, setNotifGranted] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.displayName) setNickname(user.displayName);
  }, [user?.displayName]);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => setNotifGranted(status === 'granted'));
  }, []);

  const dDay = (() => {
    if (!couple) return null;
    const base = couple.anniversaryDate ?? couple.createdAt;
    if (!base) return null;
    const baseStr = timestampToKST(base);
    return baseStr ? getDaysSince(baseStr) + 1 : null;
  })();

  const anniversaryStr = couple?.anniversaryDate
    ? timestampToKST(couple.anniversaryDate)
    : couple?.createdAt ? timestampToKST(couple.createdAt) : '';

  const saveNickname = async () => {
    if (!user || !nickname.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { displayName: nickname.trim() }, { merge: true });
      setNicknameEditing(false);
    } catch {
      Alert.alert('오류', '닉네임 저장에 실패했습니다');
    } finally { setSaving(false); }
  };

  const saveAnniversary = async () => {
    if (!coupleId || !anniversaryInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('오류', 'YYYY-MM-DD 형식으로 입력해주세요'); return;
    }
    const [y, m, d] = anniversaryInput.split('-').map(Number);
    const date = new Date(Date.UTC(y!, m! - 1, d!));
    setSaving(true);
    try {
      await setDoc(doc(db, 'couples', coupleId), { anniversaryDate: date }, { merge: true });
      setAnniversaryEditing(false);
    } catch {
      Alert.alert('오류', '기념일 저장에 실패했습니다');
    } finally { setSaving(false); }
  };

  const handleNotifToggle = async () => {
    if (notifGranted) {
      Linking.openSettings();
    } else {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotifGranted(true);
      } else {
        Linking.openSettings();
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: async () => { await signOut(); } },
    ]);
  };

  const accentIds = Object.keys(ACCENT_META) as AccentId[];

  return (
    <SafeAreaView testID="screen-settings" style={styles.safeArea} edges={['top']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      {/* ── 테마 ── */}
      <Section title="테마" colors={colors}>
        <View style={styles.themeSection}>
          <Text style={styles.themeLabel}>색상</Text>
          <View style={styles.accentRow}>
            {accentIds.map(id => (
              <Pressable
                key={id}
                style={[styles.accentCircle, { backgroundColor: ACCENT_META[id].preview }, accentId === id && styles.accentCircleActive]}
                onPress={() => setAccent(id)}
              />
            ))}
          </View>
          <View style={styles.darkRow}>
            <Text style={styles.darkLabel}>다크 모드</Text>
            <Switch
              testID="switch-dark-mode"
              value={isDark}
              onValueChange={setDark}
              trackColor={{ false: colors.border.subtle, true: colors.accent.primary }}
              thumbColor={colors.bg.surface}
              ios_backgroundColor={colors.border.subtle}
            />
          </View>
        </View>
      </Section>

      {/* ── 알림 ── */}
      <Section title="알림" colors={colors}>
        <View style={styles.row}>
          <View style={styles.rowLabelGroup}>
            <Text style={styles.rowLabel}>푸시 알림</Text>
            <Text style={styles.rowSub}>{notifGranted ? '허용됨' : '꺼짐 — 탭하여 설정'}</Text>
          </View>
          <Switch
            value={notifGranted}
            onValueChange={handleNotifToggle}
            trackColor={{ false: colors.border.subtle, true: colors.accent.primary }}
            thumbColor={colors.bg.surface}
            ios_backgroundColor={colors.border.subtle}
          />
        </View>
      </Section>

      {/* ── 커플 정보 ── */}
      <Section title="커플 정보" colors={colors}>
        {dDay !== null && <Row label="함께한 날" value={`D+${dDay}일`} styles={styles} />}
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

      {/* ── 내 프로필 ── */}
      <Section title="내 프로필" colors={colors}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>닉네임</Text>
          {nicknameEditing ? (
            <View style={styles.editRow}>
              <TextInput style={styles.input} value={nickname} onChangeText={setNickname} autoFocus maxLength={20} />
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

      {/* ── 앱 정보 ── */}
      <Section title="앱 정보" colors={colors}>
        <Row label="버전" value={APP_VERSION} styles={styles} />
        <NavRow testID="btn-contact"  label="문의하기"         onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=twowo 문의`)} styles={styles} />
        <NavRow testID="btn-terms"    label="이용약관"         onPress={() => router.push('/legal/terms')}    styles={styles} />
        <NavRow testID="btn-privacy"  label="개인정보 처리방침" onPress={() => router.push('/legal/privacy')}  styles={styles} />
        <NavRow testID="btn-licenses" label="오픈소스 라이선스" onPress={() => router.push('/legal/licenses')} styles={styles} />
      </Section>

      {/* ── 계정 ── */}
      <Section title="계정" colors={colors}>
        <TouchableOpacity testID="btn-signout" onPress={handleSignOut} style={styles.actionRow}>
          <Text style={styles.actionText}>로그아웃</Text>
        </TouchableOpacity>
      </Section>

      {/* ── 위험 영역 ── */}
      <Section title="위험 영역" colors={colors}>
        <NavRow
          testID="btn-danger-zone"
          label="연결 해제 · 탈퇴"
          onPress={() => router.push('/danger-zone')}
          styles={styles}
          danger
        />
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

function NavRow({ label, onPress, styles, danger, testID }: { label: string; onPress: () => void; styles: ReturnType<typeof makeStyles>; danger?: boolean; testID?: string }) {
  const colors = useColors();
  return (
    <TouchableOpacity testID={testID} style={styles.row} onPress={onPress}>
      <Text style={[styles.rowLabel, danger && { color: colors.status.danger }]}>{label}</Text>
      <Text style={[styles.rowChevron, danger && { color: colors.status.danger }]}>›</Text>
    </TouchableOpacity>
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
  container:     { padding: space[4], gap: space[5], paddingBottom: 48 },

  row:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[4], borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle },
  rowLabelGroup: { gap: 2 },
  rowLabel:      { ...typography.body, color: colors.text.secondary },
  rowSub:        { ...typography.tiny, color: colors.text.muted },
  rowValue:      { ...typography.body, color: colors.text.primary },
  rowChevron:    { fontSize: 20, color: colors.text.muted },

  editRow:       { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1, justifyContent: 'flex-end' },
  input:         { ...typography.body, color: colors.text.primary, borderBottomWidth: 1, borderBottomColor: colors.accent.primary, minWidth: 120, paddingVertical: 2 },
  saveBtn:       { paddingHorizontal: space[3], paddingVertical: space[1], backgroundColor: colors.accent.primary, borderRadius: 6 },
  saveBtnText:   { ...typography.caption, color: colors.text.inverse },
  cancelBtn:     { paddingHorizontal: space[2], paddingVertical: space[1] },
  cancelBtnText: { ...typography.caption, color: colors.text.muted },

  actionRow:     { padding: space[4] },
  actionText:    { ...typography.body, color: colors.accent.primary },

  dangerDesc:    { ...typography.caption, color: colors.text.muted, padding: space[4], paddingBottom: 0 },
  dangerBtn:     { margin: space[4], marginTop: space[3], padding: space[4], backgroundColor: colors.status.danger, borderRadius: 10, alignItems: 'center' },
  dangerBtnText: { ...typography.body, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  deleteBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.status.danger },
  divider:       { height: 0.5, backgroundColor: colors.border.subtle, marginHorizontal: space[4] },

  reauthBox:     { margin: space[4], marginTop: space[3], gap: space[3] },
  reauthLabel:   { ...typography.caption, color: colors.text.secondary },
  reauthInput:   { ...typography.body, color: colors.text.primary, backgroundColor: colors.bg.subtle, borderRadius: 8, padding: space[3] },
  reauthBtnRow:  { flexDirection: 'row', alignItems: 'center', gap: space[3] },

  themeSection:  { padding: space[4], gap: space[4] },
  themeLabel:    { ...typography.caption, color: colors.text.secondary },
  accentRow:     { flexDirection: 'row', gap: space[3], flexWrap: 'wrap' },
  accentCircle:  { width: 32, height: 32, borderRadius: 16 },
  accentCircleActive: { borderWidth: 3, borderColor: colors.text.primary, transform: [{ scale: 1.15 }] },
  darkRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  darkLabel:     { ...typography.body, color: colors.text.primary },
});
