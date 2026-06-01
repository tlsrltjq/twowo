# 디자인 시스템

> **이 문서는 참고용 디테일**. AI 가 자동 작업 시 매번 읽는 룰북은 `FRONTEND_RULES.md`.
> 여기는 *왜 그렇게 결정했는지* / *깊은 디테일이 필요할 때* 만 참고.


> `/design-system/` 폴더의 코드 진실 소스. 이 문서는 **토큰과 컴포넌트의 의도/규칙**을 정의한다.
> 색상값/폰트 크기는 코드(`design-system/tokens.ts`) 가 단일 진실 소스 — 여기 표는 동기화 권장.

## 결정 요약
- **모드**: 라이트 전용 (다크모드 보류, ADR-010)
- **폰트**: Pretendard (한글 가독성, 무료, ADR-011)
- **간격**: 4pt 그리드
- **아이콘**: `lucide-react-native` (ADR-013)
- **햅틱**: `expo-haptics`
- **애니메이션**: Reanimated 3 (기본) + Lottie (축하 화면 한 곳)

---

## 색상 팔레트
**원칙**: 너무 강한 핑크는 피한다. 베이지/크림 베이스에 핑크는 액센트로만.

| 토큰 | 값 | 용도 |
|------|----|------|
| `bg.base`        | `#FFFBF7` | 앱 배경 (베이지 화이트) |
| `bg.surface`     | `#FFFFFF` | 카드, 시트 배경 |
| `bg.subtle`      | `#F5EFE8` | 비활성 영역, 회색 톤 카드 |
| `text.primary`   | `#1A1614` | 본문, 헤더 |
| `text.secondary` | `#6B635E` | 보조 문구, 라벨 |
| `text.muted`     | `#9C938D` | 비활성/플레이스홀더 |
| `text.inverse`   | `#FFFFFF` | 컬러 버튼 위 텍스트 |
| `accent.primary` | `#E27396` | 주요 CTA, 매칭 성공 (핑크) |
| `accent.coral`   | `#F0A8A0` | 운동 이벤트 점 |
| `accent.warm`    | `#E8B86D` | 데이트 이벤트 점, 빙고 강조 |
| `accent.calm`    | `#A8BDB5` | 일반 일정 점, 컨디션 good |
| `border.subtle`  | `#EDE5DD` | 카드 경계 |
| `border.strong`  | `#D4C8BE` | 입력 필드, 강조 경계 |
| `status.success` | `#7BA88F` | 성공 토스트 |
| `status.warning` | `#D4A05C` | 경고 |
| `status.danger`  | `#C77575` | 위험(해제, 삭제) |
| `overlay`        | `rgba(26,22,20,0.4)` | 모달 배경 |

이벤트 타입별 점 색상 (캘린더 스펙 BR-9 참조):
- date → `accent.warm`
- exercise → `accent.coral`
- general → `accent.calm`

---

## 타이포그래피
| 토큰 | 크기/줄높이 | 굵기 | 용도 |
|------|------------|------|------|
| `display`  | 32 / 40 | 700 | 화면 헤더 (홈 인사말 등) |
| `title1`   | 24 / 32 | 700 | 섹션 헤더 |
| `title2`   | 20 / 28 | 600 | 카드 제목 |
| `body`     | 16 / 24 | 400 | 본문 기본 |
| `bodyBold` | 16 / 24 | 600 | 본문 강조 |
| `caption`  | 14 / 20 | 400 | 보조 설명 |
| `tiny`     | 12 / 16 | 500 | 라벨, 메타 |
| `button`   | 16 / 20 | 600 | 버튼 텍스트 |

> Pretendard 가 로드 안 됐을 때 fallback: 시스템 폰트 (`-apple-system`).
> 폰트 로드는 0단계에서 `expo-font` 로 처리.

---

## 간격 (4pt 그리드)
| 토큰 | 값 |
|------|----|
| `space.0` | 0 |
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 20 |
| `space.6` | 24 |
| `space.8` | 32 |
| `space.10` | 40 |
| `space.12` | 48 |

**원칙**: padding/margin 직접 숫자 금지. 항상 토큰 사용.

---

## 모서리 (radius)
| 토큰 | 값 |
|------|----|
| `radius.sm` | 8 |
| `radius.md` | 12 |
| `radius.lg` | 16 |
| `radius.xl` | 24 |
| `radius.pill` | 999 |

---

## 그림자 (iOS)
| 토큰 | shadowColor/Opacity/Radius/Offset |
|------|-----------------------------------|
| `shadow.sm` | #000 / 0.04 / 4 / (0,1) |
| `shadow.md` | #000 / 0.08 / 12 / (0,4) |
| `shadow.lg` | #000 / 0.12 / 24 / (0,8) |

Android 는 `elevation` 으로 매핑 (sm=2, md=4, lg=8).

---

## 공통 컴포넌트 (`/design-system/`)

### Button
```ts
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';   // 기본 primary
  size?: 'sm' | 'md' | 'lg';                                 // 기본 md
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  // 접근성
  accessibilityLabel?: string;
}
```
- 탭 시 `expo-haptics`의 `selectionAsync()` 호출
- loading 상태에서는 라벨 자리에 스피너만

### Card
```ts
interface CardProps {
  children: React.ReactNode;
  padding?: keyof typeof space;     // 기본 'space.4'
  variant?: 'plain' | 'elevated';   // elevated = shadow.sm
  onPress?: () => void;             // 있으면 Pressable, 없으면 View
}
```

### Input / TextField
```ts
interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}
```
- error 가 있으면 `border.strong` → `status.danger`, 아래에 에러 메시지
- maxLength 가 있으면 우측 하단에 카운터

### Modal / BottomSheet
```ts
interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: ('40%' | '60%' | '90%')[];
}
```
- 닫힘 시 `selectionAsync()` 햅틱
- 배경 dim = `overlay` 색

### EmptyState
```ts
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
}
```
- 캘린더 빈 날, 빙고 항목 없음, 후보 없음 등 빈 화면 표준

### LoadingState
- `Spinner` 컴포넌트: 화면 중앙 작은 스피너 (액션 로딩)
- `Skeleton` 컴포넌트: 리스트/카드 자리표시자 (네트워크 첫 로딩)
- 규칙: 화면 진입 첫 로딩 = Skeleton, 사용자 액션 = Spinner

### Toast
```ts
toast.success('저장됐어요');
toast.error('네트워크 오류');
toast.info('아직 입력 전이에요');
```
- 상단 4초, dismiss 가능

### ErrorBoundary
- `(tabs)` 그룹 루트와 앱 루트에 2단으로 배치 (`frontend.md` 참고)

---

## 아이콘
**라이브러리**: `lucide-react-native` (ADR-013)

표준 사용 매핑:
| 용도 | 아이콘 |
|------|--------|
| 홈 탭 | `Home` |
| 캘린더 탭 | `Calendar` |
| 둘다좋아 탭 | `Heart` |
| 실험실 탭 | `Beaker` |
| 설정 탭 | `Settings` |
| 사진 첨부 | `ImagePlus` |
| 카메라 | `Camera` |
| 삭제 | `Trash2` |
| 편집 | `Pencil` |
| 닫기 | `X` |
| 체크 | `Check` |
| 빙고 셀 | `Sparkles` (완성 시) |
| 컨디션: great | `Smile` |
| 컨디션: good | `Meh` (변형) |
| 알림 | `Bell` |
| 더보기 | `MoreHorizontal` |

크기 기본: 20. 탭바 24. 빈 상태 일러스트 자리: 48.

---

## 햅틱 패턴 (`expo-haptics`)
| 상황 | 호출 |
|------|------|
| 버튼/토글 탭 | `selectionAsync()` |
| 성공 (저장, 매칭, 빙고) | `notificationAsync('success')` |
| 실패 / 에러 | `notificationAsync('error')` |
| 위험 액션 직전 (해제 모달 열림) | `notificationAsync('warning')` |
| 빙고 라인 완성 | `notificationAsync('success')` 후 짧은 진동 추가 |

**원칙**: 햅틱은 의미 있는 상태 변화에만. 스크롤/입력 중에는 호출 금지.

---

## 애니메이션
**라이브러리**: `react-native-reanimated` v3 (기본), `lottie-react-native` (축하 한 곳)

| 위치 | 도구 | 노트 |
|------|------|------|
| 탭 전환 | Expo Router 기본 | 커스텀 X |
| 모달/시트 진입 | Reanimated | 200~300ms ease-out |
| 빙고 셀 체크 토글 | Reanimated `withTiming` | scale 0.9 → 1.0 |
| 매칭 성공 화면 | Lottie (confetti) | 한 번만 재생, 자동 dismiss |
| 컨디션 카드 갱신 | Reanimated 페이드 | 150ms |
| 로딩 스피너 | RN 기본 ActivityIndicator | 별도 애니메이션 X |

원칙: 200ms 이하의 마이크로 인터랙션은 적극, 그 이상은 신중. 사용자 입력을 막는 애니메이션은 절대 금지.

---

## 다크모드 (보류)
- ADR-010 에 따라 1차 릴리즈는 라이트 전용.
- 단, **색상은 모두 토큰**으로 — 추후 다크 토큰만 추가하면 됨. 직접 HEX 박지 말 것.

---

## 접근성 (배포 직전 보강 예정)
- 모든 인터랙티브 컴포넌트는 `accessibilityLabel` 필수
- 텍스트 대비는 본문 4.5:1, 큰 텍스트 3:1 유지 (위 팔레트 검증 완료)
- 폰트 동적 조정은 배포 직전 검토
