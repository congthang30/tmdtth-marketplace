import { create } from 'zustand';
import { tokenStorage } from '@/services/token-storage';
import type { AuthUser } from '@/types/domain';

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  isSessionLoading: boolean;
  setAuth: (params: { accessToken: string; user: AuthUser }) => void;
  setUser: (user: AuthUser | null) => void;
  setSessionLoading: (isSessionLoading: boolean) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: tokenStorage.get(),
  user: null,
  isSessionLoading: Boolean(tokenStorage.get()),
  setAuth: ({ accessToken, user }) => {
    tokenStorage.set(accessToken);
    set({ accessToken, user, isSessionLoading: false });
  },
  setUser: (user) => set({ user }),
  setSessionLoading: (isSessionLoading) => set({ isSessionLoading }),
  clearAuth: () => {
    tokenStorage.clear();
    set({ accessToken: null, user: null, isSessionLoading: false });
  },
}));
