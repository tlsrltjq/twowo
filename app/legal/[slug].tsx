import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { radius, space, typography } from '../../design-system/tokens';

const LEGAL_CONTENT: Record<string, { title: string; body: string }> = {
  terms: {
    title: '이용약관',
    body: `제1조 (목적)
본 약관은 twowo(이하 "서비스")를 이용함에 있어 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
① "서비스"란 회사가 제공하는 커플 일상 공유 모바일 애플리케이션을 의미합니다.
② "이용자"란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 회원을 말합니다.
③ "커플 연결"이란 두 이용자가 상호 동의하에 데이터를 공유하는 상태를 말합니다.

제3조 (약관의 효력 및 변경)
① 본 약관은 서비스 내 공지 또는 앱 업데이트를 통해 효력이 발생합니다.
② 회사는 필요 시 약관을 변경할 수 있으며, 변경 시 사전 고지합니다.

제4조 (서비스의 제공)
① 서비스는 연중무휴 24시간 제공을 원칙으로 합니다.
② 시스템 점검 등 부득이한 사정이 있을 경우 서비스가 일시 중단될 수 있습니다.

제5조 (이용자의 의무)
① 이용자는 타인의 정보를 도용하거나 허위 정보를 입력해서는 안 됩니다.
② 이용자는 서비스를 이용하여 타인의 명예를 훼손하는 행위를 해서는 안 됩니다.
③ 이용자는 서비스 이용 시 관계 법령을 준수해야 합니다.

제6조 (계정 및 데이터 삭제)
① 이용자는 언제든지 서비스 내 설정을 통해 계정을 삭제할 수 있습니다.
② 계정 삭제 시 관련 데이터는 즉시 삭제되며, 복구가 불가능합니다.
③ 커플 연결 상태에서 탈퇴 시 상대방의 연결도 자동으로 해제됩니다.

제7조 (책임 제한)
회사는 이용자 간의 분쟁에 대해 책임을 지지 않습니다. 서비스 이용 중 발생한 손해에 대해 회사의 고의 또는 중대한 과실이 없는 경우 책임을 지지 않습니다.

제8조 (준거법 및 관할)
본 약관에 관한 분쟁은 대한민국 법률에 따르며, 관할 법원은 민사소송법에 따릅니다.

시행일: 2026년 1월 1일`,
  },

  privacy: {
    title: '개인정보 처리방침',
    body: `twowo(이하 "서비스")는 이용자의 개인정보를 중요하게 여기며, 「개인정보 보호법」을 준수합니다.

1. 수집하는 개인정보 항목
• 필수: 이메일 주소, 닉네임
• 자동 수집: 앱 이용 기록, 기기 정보(푸시 알림 토큰)

2. 개인정보의 수집 및 이용 목적
• 회원 가입 및 로그인 인증
• 커플 연결 및 데이터 공유 서비스 제공
• 푸시 알림 발송
• 서비스 개선 및 신규 기능 개발

3. 개인정보의 보유 및 이용 기간
• 회원 탈퇴 시 즉시 삭제
• 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관

4. 개인정보의 제3자 제공
서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.

5. 개인정보 처리 위탁
• Google Firebase (인증, 데이터베이스, 저장소 서비스)
  - 보관 위치: Google 클라우드 (미국/한국)
• Sentry (오류 모니터링)

6. 이용자의 권리
이용자는 언제든지 자신의 개인정보에 대한 열람, 수정, 삭제를 요청할 수 있습니다.
• 앱 내 설정 → 회원 탈퇴로 데이터 즉시 삭제 가능
• 문의: psl87531@gmail.com

7. 개인정보 보호책임자
담당자: 개발팀
이메일: psl87531@gmail.com

8. 개인정보 처리방침 변경
본 방침은 법령 또는 서비스 변경에 따라 개정될 수 있습니다. 변경 시 앱 내 공지로 안내합니다.

시행일: 2026년 1월 1일`,
  },

  licenses: {
    title: '오픈소스 라이선스',
    body: `본 서비스는 아래 오픈소스 소프트웨어를 사용합니다.

React Native
License: MIT
https://github.com/facebook/react-native

Expo
License: MIT
https://github.com/expo/expo

Firebase JS SDK
License: Apache 2.0
https://github.com/firebase/firebase-js-sdk

React Navigation
License: MIT
https://github.com/react-navigation/react-navigation

Zustand
License: MIT
https://github.com/pmndrs/zustand

Zod
License: MIT
https://github.com/colinhacks/zod

react-native-calendars
License: MIT
https://github.com/wix/react-native-calendars

Sentry React Native
License: MIT
https://github.com/getsentry/sentry-react-native

Lucide React Native
License: ISC
https://github.com/lucide-icons/lucide

각 라이선스의 전문은 해당 프로젝트 저장소에서 확인할 수 있습니다.`,
  },
};

export default function LegalPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const content = LEGAL_CONTENT[slug ?? ''];
  if (!content) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn-back" onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="뒤로가기">
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{content.title}</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.bodyText}>{content.body}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: colors.bg.base },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[3] },
  backBtn:   { width: 40 },
  backText:  { fontSize: 28, color: colors.accent.primary, lineHeight: 32 },
  title:     { ...typography.bodyBold, color: colors.text.primary },
  body:      { padding: space[4], paddingBottom: 48 },
  card:      { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[5] },
  bodyText:  { ...typography.caption, color: colors.text.secondary, lineHeight: 22 },
});
