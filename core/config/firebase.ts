import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  ...(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID }
    : {}),
};

const isFirst = getApps().length === 0;
const app     = isFirst ? initializeApp(firebaseConfig) : getApp();

// firebase/auth 래퍼에는 react-native exports 조건이 없어 브라우저 빌드를 사용.
// @firebase/auth는 react-native 조건부 빌드(dist/rn/index.js)가 있으므로 직접 사용.
function buildAuth() {
  if (!isFirst) return getAuth(app);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require('@firebase/auth') as {
      getReactNativePersistence: (s: typeof AsyncStorage) => unknown;
    };
    if (typeof getReactNativePersistence === 'function') {
      return initializeAuth(app, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        persistence: getReactNativePersistence(AsyncStorage) as any,
      });
    }
  } catch {
    // fallthrough
  }
  if (__DEV__) console.warn('[firebase] getReactNativePersistence unavailable, using in-memory auth');
  return initializeAuth(app, {});
}

export const auth    = buildAuth();
export const db      = getFirestore(app);
export const storage = getStorage(app);

if (__DEV__) {
  console.warn('[firebase] initialized project:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
  console.warn('[firebase] auth type:', auth?.constructor?.name ?? typeof auth);
}
