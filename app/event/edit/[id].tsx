import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';

import { Button } from '../../../design-system/Button';
import { Spinner } from '../../../design-system/Spinner';
import { TextField } from '../../../design-system/TextField';
import { Toast } from '../../../design-system/Toast';
import { colors, radius, space, typography } from '../../../design-system/tokens';
import { updateEvent } from '../../../core/calendar';
import { EventType } from '../../../core/calendar/schema';
import { db } from '../../../core/config/firebase';
import { useFirestoreDoc } from '../../../core/firestore-hooks';

const formSchema = z.object({
  title:     z.string().min(1, '제목을 입력해주세요').max(100),
  date:      z.string().min(1, '날짜를 선택해주세요'),
  type:      z.enum(['date', 'exercise', 'general']),
  placeName: z.string().max(100).optional(),
  memo:      z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TYPE_LABELS: Record<EventType, string> = {
  general:  '일정',
  date:     '데이트',
  exercise: '운동',
};

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>(
    { message: '', type: 'success', visible: false },
  );

  const eventRef = doc(db, 'calendarEvents', id);
  const { data: raw, loading } = useFirestoreDoc(eventRef);

  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: 'general', date: '', title: '' },
  });

  useEffect(() => {
    if (!raw) return;
    const d = raw as Record<string, any>;
    reset({
      title:     d.title ?? '',
      type:      d.type ?? 'general',
      date:      d.date?.toDate
        ? d.date.toDate().toISOString().slice(0, 10)
        : typeof d.date === 'string'
          ? d.date.slice(0, 10)
          : '',
      placeName: d.placeName ?? '',
      memo:      d.memo ?? '',
    });
  }, [raw, reset]);

  const selectedType = watch('type');

  const onSubmit = async (values: FormValues) => {
    try {
      await updateEvent(id, {
        type:      values.type,
        title:     values.title,
        date:      new Date(values.date),
        placeName: values.placeName || undefined,
        memo:      values.memo || undefined,
      });
      setToast({ message: '저장됐어요 ✅', type: 'success', visible: true });
      setTimeout(() => router.back(), 900);
    } catch {
      setToast({ message: '저장에 실패했어요. 다시 시도해주세요', type: 'error', visible: true });
    }
  };

  if (loading) return <Spinner />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>취소</Text>
        </Pressable>
        <Text style={styles.headerTitle}>일정 수정</Text>
        <View style={styles.cancelBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.typeRow}>
          {(['general', 'date', 'exercise'] as EventType[]).map(t => (
            <Controller
              key={t}
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <TouchableOpacity
                  style={[styles.typeChip, value === t && styles.typeChipActive]}
                  onPress={() => onChange(t)}
                >
                  <Text style={[styles.typeChipText, value === t && styles.typeChipTextActive]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              )}
            />
          ))}
        </View>

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="제목"
              placeholder="무슨 일이 있었나요?"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="date"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="날짜"
              placeholder="YYYY-MM-DD"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.date?.message}
              keyboardType="numbers-and-punctuation"
            />
          )}
        />

        <Controller
          control={control}
          name="placeName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="장소"
              placeholder="어디서 만났나요? (선택)"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />

        <Controller
          control={control}
          name="memo"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="메모"
              placeholder="기록하고 싶은 것들 (선택)"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
            />
          )}
        />

        {selectedType === 'exercise' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>💪 운동 세부 정보는 상세 화면에서 추가할 수 있어요</Text>
          </View>
        )}

        <View style={styles.submitBtn}>
          <Button
            label={isSubmitting ? '저장 중...' : '저장'}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
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
  );
}

const styles = StyleSheet.create({
  flex:               { flex: 1, backgroundColor: colors.bg.base },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle, backgroundColor: colors.bg.surface },
  headerTitle:        { ...typography.title2, color: colors.text.primary },
  cancelBtn:          { width: 60 },
  cancelText:         { ...typography.body, color: colors.accent.primary },
  body:               { padding: space[5], gap: space[4] },
  typeRow:            { flexDirection: 'row', gap: space[2] },
  typeChip:           { flex: 1, paddingVertical: space[2], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border.subtle, alignItems: 'center' },
  typeChipActive:     { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  typeChipText:       { ...typography.caption, color: colors.text.secondary },
  typeChipTextActive: { ...typography.caption, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  infoBox:            { backgroundColor: colors.bg.subtle, borderRadius: radius.md, padding: space[3] },
  infoText:           { ...typography.caption, color: colors.text.secondary },
  submitBtn:          { marginTop: space[4] },
});
