import { User } from 'firebase/auth';
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  coupleId: string | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setCoupleId: (coupleId: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user:      null,
  coupleId:  null,
  loading:   true,
  setUser:      (user)     => set({ user }),
  setCoupleId:  (coupleId) => set({ coupleId }),
  setLoading:   (loading)  => set({ loading }),
}));
