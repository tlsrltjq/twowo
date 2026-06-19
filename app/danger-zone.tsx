import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteAccount } from '../core/auth';
import { disconnectCouple } from '../core/couple';
import { useAuthStore } from '../core/stores/auth.store';
import { useColors } from '../design-system/ThemeContext';
import { Colors } from '../design-system/themes';
import { radius, space, typography } from '../design-system/tokens';

export default function DangerZonePage() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, coupleId } = useAuthStore();

  const [deleteStep, setDeleteStep]         = useState<'idle' | 'confirm'>('idle');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting]             = useState(false);

  const handleDisconnect = () => {
    Alert.alert('커플 연결 해제', '연결을 해제하면 상대방 앱에서도 즉시 연결이 끊깁니다.\n정말 해제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '해제하기', style: 'destructive',
        onPress: () => Alert.alert('마지막 확인', '정말요?', [
          { text: '취소', style: 'cancel' },
          {
            text: '네, 해제합니다', style: 'destructive',
            onPress: async () => {
              if (!user || !coupleId) return;
              try { await disconnectCouple(user.uid, coupleId); }
              catch { Alert.alert('오류', '해제 중 문제가 발생했습니다.'); }
            },
          },
        ]),
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      if (coupleId) await disconnectCouple(user.uid, coupleId);
      await deleteAccount(deletePassword);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        Alert.alert('오류', '비밀번호가 올바르지 않아요');
      } else {
        Alert.alert('오류', '탈퇴 중 문제가 발생했어요. 다시 시도해주세요');
      }
    } finally {
      setDeleting(false);
      setDeleteStep('idle');
      setDeletePassword('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity testID="btn-back" onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="뒤로가기">
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>연결 해제 · 탈퇴</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          {/* 커플 연결 해제 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>커플 연결 해제</Text>
            <View style={styles.card}>
              <Text style={styles.desc}>
                연결을 해제하면 상대방 앱에서도 즉시 연결이 끊깁니다.{'\n'}
                기존에 입력한 데이터(일정, 사진 등)는 유지됩니다.
              </Text>
              <TouchableOpacity onPress={handleDisconnect} style={styles.dangerBtn}>
                <Text style={styles.dangerBtnText}>커플 연결 해제</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 회원 탈퇴 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>회원 탈퇴</Text>
            <View style={styles.card}>
              <Text style={styles.desc}>
                탈퇴 시 계정과 모든 데이터가 즉시 삭제되며{'\n'}
                복구할 수 없습니다. 커플 연결도 함께 해제됩니다.
              </Text>

              {deleteStep === 'idle' && (
                <TouchableOpacity
                  testID="btn-delete-account"
                  onPress={() => setDeleteStep('confirm')}
                  style={[styles.dangerBtn, styles.dangerBtnOutline]}
                >
                  <Text style={[styles.dangerBtnText, { color: colors.status.danger }]}>회원 탈퇴</Text>
                </TouchableOpacity>
              )}

              {deleteStep === 'confirm' && (
                <View style={styles.reauthBox}>
                  <Text style={styles.reauthLabel}>비밀번호를 입력해 탈퇴를 확인하세요</Text>
                  <TextInput
                    style={styles.reauthInput}
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    placeholder="현재 비밀번호"
                    placeholderTextColor={colors.text.muted}
                    secureTextEntry
                    autoFocus
                  />
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => { setDeleteStep('idle'); setDeletePassword(''); }}
                    >
                      <Text style={styles.cancelBtnText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dangerBtn, { flex: 1, marginTop: 0 }]}
                      onPress={handleDeleteAccount}
                      disabled={deleting || !deletePassword.trim()}
                    >
                      <Text style={styles.dangerBtnText}>{deleting ? '처리 중...' : '탈퇴 확인'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:         { flex: 1, backgroundColor: colors.bg.base },
  flex:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[3] },
  backBtn:          { width: 40 },
  backText:         { fontSize: 28, color: colors.accent.primary, lineHeight: 32 },
  title:            { ...typography.bodyBold, color: colors.text.primary },
  body:             { padding: space[4], gap: space[5], paddingBottom: 48 },

  section:          { gap: space[2] },
  sectionTitle:     { ...typography.caption, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:             { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[5], gap: space[3] },

  desc:             { ...typography.caption, color: colors.text.secondary, lineHeight: 20 },
  dangerBtn:        { marginTop: space[1], padding: space[4], backgroundColor: colors.status.danger, borderRadius: 10, alignItems: 'center' },
  dangerBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.status.danger },
  dangerBtnText:    { ...typography.body, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },

  reauthBox:        { gap: space[3] },
  reauthLabel:      { ...typography.caption, color: colors.text.secondary },
  reauthInput:      { ...typography.body, color: colors.text.primary, backgroundColor: colors.bg.subtle, borderRadius: 8, padding: space[3] },
  btnRow:           { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  cancelBtn:        { paddingHorizontal: space[2], paddingVertical: space[1] },
  cancelBtnText:    { ...typography.caption, color: colors.text.muted },
});
