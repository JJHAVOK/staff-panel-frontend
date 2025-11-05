import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: {
    userId: string | null; // <-- ADD THIS
    email: string;
    roles: string[];
    permissions: string[];
  } | null;
  setAuth: (
    token: string,
    user: {
      userId: string | null; // <-- ADD THIS
      email: string;
      roles: string[];
      permissions: string[];
    },
  ) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage', // name of the item in localStorage
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
