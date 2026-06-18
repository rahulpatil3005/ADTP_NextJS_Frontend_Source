import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;

  setTokens: (accessToken: string, refreshToken: string) => void;
  setSession: (params: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: UserRole;
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      role: null,
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setSession: ({ accessToken, refreshToken, userId, role }) =>
        set({ accessToken, refreshToken, userId, role, isAuthenticated: true }),

      logout: () =>
        set({
          accessToken: null, refreshToken: null,
          userId: null, role: null, isAuthenticated: false,
        }),
    }),
    {
      name: 'adtp-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        userId: state.userId,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
