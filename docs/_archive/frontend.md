# 프론트엔드 표준 패턴

> **이 문서는 참고용 디테일**. AI 가 자동 작업 시 매번 읽는 룰북은 `FRONTEND_RULES.md`.
> 여기는 *왜 그렇게 결정했는지* / *깊은 디테일이 필요할 때* 만 참고.


> 모든 화면/feature 가 따라야 하는 횡단 관심사 정의.
> 데이터 모델은 `architecture.md`, 디자인 토큰/컴포넌트는 `design-system.md`,
> 기능별 동작은 `docs/specs/*.md`.

## 결정 요약
- **폼**: `react-hook-form` + `zod` (ADR-012)
- **데이터 페칭**: Firestore 직접 구독 + 자체 훅 래퍼 (React Query 미사용, ADR-014)
- **상태 관리**: Zustand (인증/UI), Firestore 구독 훅(서버 상태) — **분리 원칙**
- **에러 바운더리**: 앱 루트 + (tabs) 그룹 루트 2단
- **로딩**: 첫 진입 = Skeleton, 사용자 액션 = Spinner
- **낙관적 업데이트**: 토글류만 (mood/bingo/featureSettings)

---

## 네비게이션 구조 (Expo Router)
```
app/
├── _layout.tsx                   # 앱 루트 — Provider 스택 + ErrorBoundary
├── index.tsx                     # 진입 라우터 (auth 상태 따라 분기)
├── (auth)/
│   ├── _layout.tsx               # Stack
│   ├── login.tsx
│   ├── signup.tsx
│   └── couple-connect.tsx
├── (tabs)/
│   ├── _layout.tsx               # Tabs + ErrorBoundary
│   ├── index.tsx                 # 홈
│   ├── calendar.tsx
│   ├── vote.tsx                  # 둘다좋아 (실험실 ON 시만)
│   ├── lab.tsx                   # 실험실
│   └── settings.tsx
├── event/
│   ├── [id].tsx                  # 이벤트 상세 (모달이 아닌 push)
│   └── new.tsx                   # 이벤트 생성 (modal presentation)
├── disconnected.tsx              # 재연결 대기 화면 (couples.status='disconnected' 시)
└── +not-found.tsx
```

**원칙**:
- `(auth)` 와 `(tabs)` 는 상호 배타. `app/index.tsx` 가 `auth + coupleId` 상태로 분기.
- 이벤트 생성은 modal (배경 살짝 보임), 상세는 push (전체 화면).
- 실험실에서 토글 OFF 된 feature 탭은 `(tabs)/_layout.tsx` 에서 `redirect` 처리.

---

## 진입 분기 (`app/index.tsx`)
```ts
useEffect(() => {
  return subscribeAuthState(async (user) => {
    if (!user) return router.replace('/(auth)/login');
    const u = await getUserDoc(user.uid);
    if (!u.coupleId) return router.replace('/(auth)/couple-connect');
    const couple = await getDoc(doc(couples, u.coupleId));
    if (couple.data()?.status === 'disconnected') return router.replace('/disconnected');
    router.replace('/(tabs)');
  });
}, []);
```
- 로딩 중에는 스플래시 비슷한 라이트 베이지 화면 (점프 방지)

---

## 에러 바운더리
2단 배치:
1. `app/_layout.tsx` 의 최상단 — 치명적 에러용 (Firebase init 실패 등). "앱을 다시 시작해주세요" 화면.
2. `app/(tabs)/_layout.tsx` 의 탭 컨테이너 안 — 한 탭이 죽어도 다른 탭은 살아있도록.

각 ErrorBoundary 는 `componentDidCatch` 에서 `console.error` 만 호출 (배포 직전 Sentry 연결).

---

## 로딩 / 에러 / 빈 상태 UI 표준

| 상태 | 컴포넌트 | 사용처 |
|------|----------|--------|
| 첫 진입 로딩 | `<Skeleton variant="list|card">` | 캘린더, 사진 그리드, 빙고 진입 직전 |
| 액션 로딩 | `<Spinner inline>` 또는 버튼 내 `loading` | 저장, 업로드 |
| 빈 상태 | `<EmptyState icon title description action?>` | 이벤트 0개, 후보 0개, 빙고판 없음 |
| 네트워크 오류 | `<EmptyState icon=WifiOff title='연결이 끊겼어요' action={재시도}>` | 모든 리스트 |
| 권한 거부 | 인라인 안내 카드 + 설정 앱 이동 버튼 | 카메라/사진/알림 거부 시 |

**규칙**: 모든 화면은 *4가지 상태 모두 처리* — 로딩/정상/빈/에러. 빠뜨리면 PR 거부.

---

## 폼 처리
**도구**: `react-hook-form` + `zod` (ADR-012)

```ts
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(80, '80자 이내'),
  date: z.date(),
  memo: z.string().max(500).optional(),
});

const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

**원칙**:
- 모든 폼은 zod 스키마 먼저 정의 후 사용.
- 스키마는 같은 도메인의 `core/{도메인}/schema.ts` 에 모음 (예: `core/calendar/schema.ts`).
- 비즈니스 룰(BR-*)에 명시된 길이/포맷 제한은 zod 로 반드시 강제.

---

## 키보드 처리
```ts
// design-system/KeyboardAware.tsx
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={flex1}>
  <ScrollView keyboardShouldPersistTaps='handled' contentContainerStyle={pad16}>
    {children}
  </ScrollView>
</KeyboardAvoidingView>
```
- 폼이 있는 모든 화면은 이 래퍼로 감싼다.
- 입력 필드 위에 자동 스크롤 처리 — RHF 와 호환되는 `ref.scrollTo` 패턴.

---

## 데이터 페칭 훅 (`core/firestore-hooks/`)

**원칙**: Firestore 의 `onSnapshot` 을 React 훅으로 감싸서, 컴포넌트는 항상 같은 인터페이스를 사용.

```ts
// useFirestoreDoc.ts
export function useFirestoreDoc<T>(ref: DocumentReference | null): {
  data: T | null;
  loading: boolean;
  error: Error | null;
} {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    if (!ref) { setState({ data: null, loading: false, error: null }); return; }
    return onSnapshot(ref, snap => setState({ data: snap.data() as T, loading: false, error: null }),
                            err  => setState({ data: null, loading: false, error: err }));
  }, [ref?.path]);
  return state;
}

// useFirestoreQuery.ts (배열 버전)
// 동일 패턴, onSnapshot 의 querySnapshot.docs.map(...)
```

**규칙**:
- 컴포넌트는 직접 `onSnapshot` 호출 금지. 위 두 훅만 사용.
- 한 화면에 같은 쿼리가 여러 번 등장하면 부모에서 한 번만 구독 → props 로 내려보내기.

---

## 낙관적 업데이트 정책
**원칙**: 사용자 인지 지연(>500ms) 가 거슬리는 액션에만 적용.

| 액션 | 낙관적? | 비고 |
|------|---------|------|
| 컨디션 토글/저장 | YES | UI 즉시 반영, 실패 시 rollback + 토스트 |
| 빙고 셀 체크/해제 | YES | UI 즉시 반영 |
| 실험실 기능 토글 | YES | UI 즉시 반영 |
| 이벤트 생성/수정 | NO | 저장 버튼 → 스피너 → 완료 후 닫기 |
| 사진 업로드 | NO | 진행률 표시 (낙관 X) |
| 둘다좋아 투표 | NO | 트랜잭션이라 결과 본 후 표시 |

낙관적 업데이트 패턴:
```ts
const optimistic = useOptimistic(currentValue, (s, action) => action.next);
// onPress 시 setOptimistic + 실제 호출, 실패하면 토스트만 (revert는 onSnapshot 이 자동으로 해줌)
```

---

## Pull to Refresh
모든 **리스트 화면**(캘린더 이벤트 목록, 사진 그리드, 운동/데이트 뷰, 컨디션 히스토리) 에 `RefreshControl` 적용.
- onRefresh 는 캐시 무효화 후 한 번 강제 재구독.
- 5초 안에 응답 없으면 자동 dismiss.

---

## Zustand store 종류 (`core/stores/`)

| Store | 책임 | 영속화 |
|-------|------|--------|
| `auth.store.ts` | Firebase Auth 사용자, idToken | AsyncStorage (uid 만, 캐시용) |
| `couple.store.ts` | 내 coupleId, memberIds, status | AsyncStorage (재시작 시 첫 화면 빠르게) |
| `ui.store.ts` | 토스트 큐, 모달 상태, 현재 탭 인덱스 | 없음 |
| `feature.store.ts` | featureSettings 캐시 | 없음 (실시간 구독으로 충분) |

**원칙**:
- store 에 *서버 상태* 를 직접 저장하지 않는다. 서버 상태는 Firestore 구독 훅이 책임.
- store 는 *클라이언트 전용 상태* (UI, 캐시, idToken) 만.
- 영속화는 `zustand/middleware` 의 `persist` + AsyncStorage 어댑터.

```ts
// core/stores/auth.store.ts
export const useAuthStore = create(persist<AuthState>(
  (set) => ({
    uid: null,
    setUid: (uid) => set({ uid }),
    clear: () => set({ uid: null }),
  }),
  { name: 'auth', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ uid: s.uid }) }
));
```

---

## 권한 안내 UX
**원칙**: 시스템 다이얼로그를 곧바로 띄우지 않는다 — **rationale 화면** 으로 먼저 설명.

| 권한 | rationale 시점 | rationale 문구 (예) |
|------|---------------|---------------------|
| 사진 라이브러리 | 이벤트에 사진 첨부 첫 시도 시 | "데이트 사진을 함께 보관하려면 사진 접근이 필요해요" |
| 카메라 | 카메라 버튼 첫 탭 시 | "지금 이 순간을 둘만 볼 수 있게 찍어볼까요?" |
| 알림 | 4단계 첫 진입 / 컨디션 입력 직후 | "오늘 컨디션을 까먹지 않게 알려드릴게요" |
| 위치 (선택) | 이벤트에 장소 추가 시 | "다녀온 장소를 자동으로 기록할 수 있어요" |

거부된 경우:
- 다시 자동 묻기 금지 (iOS 정책).
- 그 화면에 안내 카드 + [설정 앱 열기](`Linking.openSettings()`) 한 번만 노출.

---

## 사진 미리보기 / 풀스크린
- 사진 뷰 그리드 → 사진 탭 → `react-native-image-viewing` 또는 자체 모달
- 핀치 줌, 좌우 스와이프, 다운로드 버튼 (자기 폰에 저장)
- 닫기 = 위→아래 스와이프 또는 X

---

## 오프라인 / 동기화 표시 (배포 직전 보강)
- `@react-native-community/netinfo` 로 오프라인 감지
- 상단 슬림 배너 — "오프라인이에요 · 변경사항은 복귀 시 동기화돼요"
- Firestore 자체 캐시가 있으므로 데이터는 보임. 쓰기만 큐에 들어감.

---

## 햅틱 호출 위치 (디자인 시스템과 연결)
- 공통 컴포넌트(`Button`, `BottomSheet`)가 자동 호출 → feature 코드에서 직접 호출은 **드물게**.
- 빙고 라인 완성, 매칭 성공 같은 *의미 있는 성공* 만 직접 호출.

---

## 텍스트 / i18n (선택)
- 1차 릴리즈는 한국어만. 텍스트는 컴포넌트에 직접 작성 (i18n 라이브러리 미사용).
- 다국어 필요 시점에 `i18n-js` 또는 `expo-localization` 도입 검토 (ADR 추가).

---

## 라우팅 가드 패턴
- `app/(tabs)/_layout.tsx` 에서 매 렌더 시 `useCoupleStore` 로 `coupleId` 와 `status` 확인.
- `coupleId === null` → `/(auth)/couple-connect` 로 replace
- `status === 'disconnected'` → `/disconnected` 로 replace
- 그 외 → 정상 렌더

---

## 디버그 / 로그 (배포 직전 보강)
- 개발 환경: `console.log` 자유. `__DEV__` 가드 안에서만.
- 프로덕션: `console.*` 호출은 `babel-plugin-transform-remove-console` 로 제거.
- 에러 모니터링은 배포 직전 Sentry 도입 결정.
