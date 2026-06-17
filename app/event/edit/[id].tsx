import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, DocumentData } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { updateEvent } from '../../../core/calendar';
import { EventType } from '../../../core/calendar/schema';
import { db } from '../../../core/config/firebase';
import { useFirestoreDoc } from '../../../core/firestore-hooks';
import { Button } from '../../../design-system/Button';
import { Spinner } from '../../../design-system/Spinner';
import { TextField } from '../../../design-system/TextField';
import { Toast } from '../../../design-system/Toast';
import { useColors } from '../../../design-system/ThemeContext';
import { Colors } from '../../../design-system/themes';
import { radius, space, typography } from '../../../design-system/tokens';

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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>(
    { message: '', type: 'success', visible: false },
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const eventRef = doc(db, 'calendarEvents', id);
  const { data: raw, loading } = useFirestoreDoc(eventRef);

  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: 'general', date: '', title: '' },
  });

  useEffect(() => {
    if (!raw) return;
    const d = raw as DocumentData;
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
    <SafeAreaView style={styles.flex} edges={['top']}>
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
          render={({ field: { onChange, value } }) => {
            const parsed = value?.match(/^\d{4}-\d{2}-\d{2}$/)
              ? new Date(value + 'T00:00:00')
              : new Date();
            const displayText = value?.match(/^\d{4}-\d{2}-\d{2}$/)
              ? `${parsed.getFullYear()}년 ${parsed.getMonth() + 1}월 ${parsed.getDate()}일`
              : '날짜를 선택해주세요';
            return (
              <View>
                <Pressable
                  style={[styles.dateField, showDatePicker && styles.dateFieldOpen]}
                  onPress={() => setShowDatePicker(v => !v)}
                >
                  <View>
                    <Text style={styles.dateFieldLabel}>날짜</Text>
                    <Text style={[styles.dateFieldValue, !value && styles.dateFieldPlaceholder]}>
                      {displayText}
                    </Text>
                  </View>
                  <Text style={styles.dateFieldIcon}>{showDatePicker ? '▲' : '📅'}</Text>
                </Pressable>
                {errors.date && <Text style={styles.dateError}>{errors.date.message}</Text>}
                {showDatePicker && (
                  <DateTimePicker
                    mode="date"
                    value={parsed}
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    locale="ko-KR"
                    maximumDate={new Date(new Date().getFullYear() + 1, 11, 31)}
                    onChange={(_, selected) => {
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (selected) {
                        onChange(selected.toISOString().slice(0, 10));
                        setShowDatePicker(false);
                      }
                    }}
                    style={styles.datePicker}
                  />
                )}
              </View>
            );
          }}
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
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
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
  dateField:          { backgroundColor: colors.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.subtle, padding: space[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateFieldOpen:      { borderColor: colors.accent.primary },
  dateFieldLabel:     { ...typography.tiny, color: colors.text.muted, marginBottom: 2 },
  dateFieldValue:     { ...typography.body, color: colors.text.primary },
  dateFieldPlaceholder: { color: colors.text.muted },
  dateFieldIcon:      { fontSize: 20 },
  dateError:          { ...typography.tiny, color: colors.status.danger, marginTop: 4, marginLeft: space[1] },
  datePicker:         { width: '100%' as const, backgroundColor: colors.bg.surface },
});
