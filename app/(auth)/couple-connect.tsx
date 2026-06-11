import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { doc, DocumentReference } from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '../../core/config/firebase';
import { createInvite, joinByCode } from '../../core/couple';
import { Couple, JoinError } from '../../core/couple/types';
import { useFirestoreDoc } from '../../core/firestore-hooks';
import { useAuthStore } from '../../core/stores/auth.store';
import { Button } from '../../design-system/Button';
import { TextField } from '../../design-system/TextField';
import { Toast } from '../../design-system/Toast';
import { colors, radius, space, typography } from '../../design-system/tokens';

function formatExpiry(expiresAt: Date): string {
  const hoursLeft = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 3600));
  if (hoursLeft <= 0) return '곧 만료됩니다';
  return `${hoursLeft}시간 후 만료`;
}

export default function CoupleConnectScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const setCoupleId = useAuthStore(s => s.setCoupleId);

  const [myCode, setMyCode] = useState<string | null>(null);
  const [myCodeExpiry, setMyCodeExpiry] = useState<Date | null>(null);
  const [createdCoupleId, setCreatedCoupleId] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<LottieView>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success'; visible: boolean }>({
    message: '', type: 'error', visible: false,
  });

  // 코드 생성 후 상대방이 조인했는지 실시간으로 감지
  const coupleRef = createdCoupleId
    ? (doc(db, 'couples', createdCoupleId) as DocumentReference<Couple>)
    : null;
  const { data: coupleData } = useFirestoreDoc<Couple>(coupleRef);

  const handleSuccess = useCallback((coupleId: string) => {
    setCoupleId(coupleId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowConfetti(true);
    setTimeout(() => router.replace('/(tabs)'), 2000);
  }, [setCoupleId, router]);

  useEffect(() => {
    if (coupleData?.memberIds?.length === 2) {
      handleSuccess(createdCoupleId!);
    }
  }, [coupleData, createdCoupleId, handleSuccess]);

  // Guard: signup.tsx sets user in store before navigating here, but defend against any race
  if (!user) return null;
  const uid = user.uid;

  const handleCreateCode = async () => {
    setCreateLoading(true);
    try {
      const { code, expiresAt, coupleId } = await createInvite(uid);
      setMyCode(code);
      setMyCodeExpiry(expiresAt);
      setCreatedCoupleId(coupleId);
    } catch {
      setToast({ message: '코드 생성에 실패했습니다. 다시 시도해주세요', type: 'error', visible: true });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleShare = async () => {
    if (!myCode) return;
    await Share.share({ message: `둘다좋아 초대 코드: ${myCode}\n앱에서 코드를 입력하면 바로 연결돼요!` });
  };

  const handleJoin = async () => {
    const code = inputCode.trim().toUpperCase();
    if (code.length !== 6) {
      setInputError('6자리 코드를 입력해주세요');
      return;
    }
    setInputError(null);
    setJoinLoading(true);
    try {
      const { coupleId } = await joinByCode(uid, code);
      handleSuccess(coupleId);
    } catch (e) {
      if (e instanceof JoinError) {
        const msgs: Record<string, string> = {
          expired:       '코드가 만료되었습니다. 상대방에게 새 코드를 요청해주세요',
          not_found:     '잘못된 코드입니다. 오타가 없는지 확인해주세요',
          self:          '내가 만든 코드는 입력할 수 없습니다',
          already_joined:'이미 다른 커플에 연결되어 있습니다',
          couple_full:   '이미 두 명이 연결된 코드입니다',
        };
        setInputError(msgs[e.reason] ?? '연결에 실패했습니다');
      } else {
        setToast({ message: '연결에 실패했습니다. 다시 시도해주세요', type: 'error', visible: true });
      }
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>커플 연결</Text>
        <Text style={styles.subtitle}>코드를 공유하거나 입력해서 연결하세요</Text>

        {/* 코드 생성 섹션 */}
        <View style={styles.section}>
          {myCode ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>초대 코드</Text>
              <Text style={styles.codeText}>{myCode}</Text>
              {myCodeExpiry && (
                <Text style={styles.expiry}>{formatExpiry(myCodeExpiry)}</Text>
              )}
              <Text style={styles.waitingText}>상대방이 코드를 입력하면 자동으로 연결됩니다</Text>
              <Button label="코드 공유하기" onPress={handleShare} variant="secondary" />
              <Button label="새 코드 발급" onPress={handleCreateCode} variant="ghost" loading={createLoading} />
            </View>
          ) : (
            <Button
              label="내 코드 만들기"
              onPress={handleCreateCode}
              loading={createLoading}
              size="lg"
            />
          )}
        </View>

        {/* 구분선 */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 코드 입력 섹션 */}
        <View style={styles.section}>
          <TextField
            label="상대방 코드 입력"
            value={inputCode}
            onChangeText={(v) => { setInputCode(v.toUpperCase()); setInputError(null); }}
            placeholder="6자리 코드"
            autoCapitalize="none"
            maxLength={6}
            error={inputError ?? undefined}
          />
          <Button
            label="연결하기"
            onPress={handleJoin}
            loading={joinLoading}
            disabled={inputCode.trim().length === 0}
            size="lg"
          />
        </View>
      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />
    </KeyboardAvoidingView>

    {showConfetti && (
      <View style={styles.confettiOverlay} pointerEvents="none">
        <Text style={styles.confettiText}>연결됐어요! 🎉</Text>
        <LottieView
          ref={confettiRef}
          source={require('../../assets/lottie/confetti.json')}
          autoPlay
          loop={false}
          style={styles.confettiAnim}
        />
      </View>
    )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: colors.bg.base, },
  container:   { flexGrow: 1, padding: space[6], gap: space[6] },
  title:       { ...typography.title1, color: colors.text.primary, textAlign: 'center', marginTop: space[8] },
  subtitle:    { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
  section:     { gap: space[3] },
  codeBox:     {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: space[6],
    alignItems: 'center',
    gap: space[3],
  },
  codeLabel:   { ...typography.caption, color: colors.text.secondary },
  codeText:    { ...typography.display, color: colors.accent.primary, letterSpacing: 8 },
  expiry:      { ...typography.tiny, color: colors.text.muted },
  waitingText: { ...typography.caption, color: colors.text.secondary, textAlign: 'center' },
  divider:     { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.subtle },
  dividerText: { ...typography.caption, color: colors.text.muted },
  confettiOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
    zIndex: 100,
  },
  confettiText: {
    ...typography.title1,
    color: colors.text.inverse,
    zIndex: 101,
  },
  confettiAnim: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
});
