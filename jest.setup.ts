 
// 단위/통합 공통 셋업

// 통합 테스트 모드 — 환경변수로 분기
if (process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= 'localhost:9199';
  process.env.GCLOUD_PROJECT ??= 'demo-coupleapp';
}

// expo-haptics 자동 모킹 (단위 테스트에서 노이즈 제거)
jest.mock('expo-haptics', () => ({
  selectionAsync:   jest.fn(),
  notificationAsync: jest.fn(),
  impactAsync:      jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle:      { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// expo-notifications 기본 모킹
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'mock-id'),
  cancelScheduledNotificationAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[MOCK]' })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// AsyncStorage in-memory
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: (() => {
    const store = new Map<string, string>();
    return {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
      removeItem: jest.fn(async (k: string) => { store.delete(k); }),
      clear: jest.fn(async () => { store.clear(); }),
    };
  })(),
}));
