import { signOut, subscribeAuthState } from './index';

const mockFirebaseSignOut = jest.fn().mockResolvedValue(undefined);
const mockOnAuthStateChanged = jest.fn();

jest.mock('firebase/auth', () => ({
  signOut: (...args: any[]) => mockFirebaseSignOut(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
}));
jest.mock('../config/firebase', () => ({ auth: { _mockAuth: true } }));

beforeEach(() => {
  mockFirebaseSignOut.mockClear();
  mockOnAuthStateChanged.mockClear();
});

describe('[BR-S2] signOut', () => {
  test('signOut() → firebase signOut 호출', async () => {
    await signOut();
    expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);
    expect(mockFirebaseSignOut).toHaveBeenCalledWith({ _mockAuth: true });
  });

  test('subscribeAuthState — user null 콜백 등록됨', () => {
    const cb = jest.fn();
    mockOnAuthStateChanged.mockReturnValue(() => {});
    subscribeAuthState(cb);
    expect(mockOnAuthStateChanged).toHaveBeenCalledWith({ _mockAuth: true }, cb);
  });

  test('subscribeAuthState — unsubscribe 함수 반환', () => {
    const unsub = jest.fn();
    mockOnAuthStateChanged.mockReturnValue(unsub);
    const returned = subscribeAuthState(jest.fn());
    returned();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
