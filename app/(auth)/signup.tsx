import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { signUpWithEmail } from '../../core/auth';
import { signUpSchema, SignUpInput } from '../../core/auth/schema';
import { Button } from '../../design-system/Button';
import { TextField } from '../../design-system/TextField';
import { Toast } from '../../design-system/Toast';
import { colors, space, typography } from '../../design-system/tokens';

export default function SignUpScreen() {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success'; visible: boolean }>({
    message: '', type: 'error', visible: false,
  });

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const showError = (message: string) => setToast({ message, type: 'error', visible: true });

  const onSubmit = async (data: SignUpInput) => {
    try {
      await signUpWithEmail(data.email, data.password, data.displayName);
      setToast({ message: '가입 완료! 잠시 기다려 주세요 🎉', type: 'success', visible: true });
      // _layout.tsx의 subscribeAuthState가 상태 업데이트 → index.tsx가 리다이렉트
    } catch (e: any) {
      const code: string = e?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        showError('이미 사용 중인 이메일입니다');
      } else if (code === 'auth/weak-password') {
        showError('비밀번호가 너무 약합니다. 6자 이상으로 설정해주세요');
      } else if (code === 'auth/invalid-email') {
        showError('올바른 이메일 형식이 아닙니다');
      } else {
        showError('회원가입에 실패했습니다. 다시 시도해주세요');
      }
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>회원가입</Text>

        <View style={styles.form}>
          <Controller
            control={control}
            name="displayName"
            render={({ field }) => (
              <TextField
                testID="input-name"
                label="이름"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="앱에서 사용할 이름"
                maxLength={20}
                error={errors.displayName?.message}
              />
            )}
          />
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
            label="가입하기"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            size="lg"
          />
        </View>

        <Pressable onPress={() => router.back()} style={styles.link}>
          <Text style={styles.linkText}>이미 계정이 있나요? <Text style={styles.linkBold}>로그인</Text></Text>
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

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: colors.bg.base },
  container: { flexGrow: 1, justifyContent: 'center', padding: space[6], gap: space[6] },
  title:     { ...typography.title1, color: colors.text.primary, textAlign: 'center' },
  form:      { gap: space[4] },
  link:      { alignItems: 'center' },
  linkText:  { ...typography.caption, color: colors.text.secondary },
  linkBold:  { ...typography.caption, color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
});
