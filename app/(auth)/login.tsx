import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { signInWithEmail } from '../../core/auth';
import { LoginInput,loginSchema } from '../../core/auth/schema';
import { getUserCoupleId } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { Button } from '../../design-system/Button';
import { TextField } from '../../design-system/TextField';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { Toast } from '../../design-system/Toast';
import { space, typography } from '../../design-system/tokens';

export default function LoginScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success'; visible: boolean }>({
    message: '', type: 'error', visible: false,
  });

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const showError = (message: string) => setToast({ message, type: 'error', visible: true });

  const onSubmit = async (data: LoginInput) => {
    try {
      const user = await signInWithEmail(data.email, data.password);
      const coupleId = await getUserCoupleId(user.uid);
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setCoupleId(coupleId);
      router.replace(coupleId ? '/(tabs)' : '/(auth)/couple-connect');
    } catch (e: unknown) {
      const code: string = (e as { code?: string })?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        showError('이메일 또는 비밀번호가 올바르지 않습니다');
      } else if (code === 'auth/invalid-email') {
        showError('올바른 이메일 형식이 아닙니다');
      } else if (code === 'auth/too-many-requests') {
        showError('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요');
      } else {
        showError('로그인에 실패했습니다. 다시 시도해주세요');
      }
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>둘다좋아</Text>
        <Text style={styles.subtitle}>함께하는 모든 순간</Text>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                testID="input-email"
                label="이메일"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                testID="input-password"
                label="비밀번호"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="6자 이상"
                secureTextEntry
                autoCapitalize="none"
                error={errors.password?.message}
              />
            )}
          />
          <Button
            label="로그인"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            size="lg"
          />
        </View>

        <Pressable testID="go-signup" onPress={() => router.push('/(auth)/signup')} style={styles.link}>
          <Text style={styles.linkText}>아직 계정이 없나요? <Text style={styles.linkBold}>회원가입</Text></Text>
        </Pressable>

      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  flex:      { flex: 1, backgroundColor: colors.bg.base },
  container: { flexGrow: 1, justifyContent: 'center', padding: space[6], gap: space[6] },
  title:     { ...typography.display, color: colors.text.primary, textAlign: 'center' },
  subtitle:  { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: -space[4] },
  form:      { gap: space[4] },
  link:      { alignItems: 'center' },
  linkText:  { ...typography.caption, color: colors.text.secondary },
  linkBold:  { ...typography.caption, color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
});
