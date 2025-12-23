import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

interface User {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  permissions: string[];
  avatarUrl?: string; // <--- ADDED THIS
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setToken: (token: string) => {
        try {
          const decoded: any = jwtDecode(token);
          set({
            token,
            user: {
              userId: decoded.sub,
              email: decoded.email,
              role: decoded.role,
              permissions: decoded.permissions || [],
              firstName: decoded.firstName || '',
              lastName: decoded.lastName || '',
              avatarUrl: decoded.avatarUrl || '', // Extract from token if available
            },
          });
        } catch (error) {
          console.error('Invalid token', error);
          set({ token: null, user: null });
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearAuth: () => set({ token: null, user: null }),

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-storage',
    }
  )
);