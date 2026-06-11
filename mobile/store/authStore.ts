import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { User } from '@/types';
import { authAPI } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

// On web, expo-secure-store is a no-op — fall back to localStorage
const isWeb = Platform.OS === 'web';

const storeGet = async (name: string): Promise<string | null> => {
  if (isWeb) return typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
  return SecureStore.getItemAsync(name);
};
const storeSet = async (name: string, value: string): Promise<void> => {
  if (isWeb) { if (typeof localStorage !== 'undefined') localStorage.setItem(name, value); return; }
  await SecureStore.setItemAsync(name, value);
};
const storeDelete = async (name: string): Promise<void> => {
  if (isWeb) { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); return; }
  await SecureStore.deleteItemAsync(name).catch(() => {});
};

// SecureStore adapter for Zustand persist
const secureStorage = {
  getItem: async (name: string) => storeGet(name),
  setItem: async (name: string, value: string) => {
    await storeSet(name, value);
    // Also store the raw token for the axios interceptor
    try {
      const parsed = JSON.parse(value);
      if (parsed?.state?.token) {
        await storeSet('campushub_token', parsed.state.token);
      }
    } catch {}
  },
  removeItem: async (name: string) => {
    await storeDelete(name);
    await storeDelete('campushub_token');
  },
};

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; hostel?: string; phone?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.login({ email, password });
          const { token, user } = data;
          await storeSet('campushub_token', token);
          connectSocket(token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.register(formData);
          const { token, user } = data;
          await storeSet('campushub_token', token);
          connectSocket(token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        await storeDelete('campushub_token');
        disconnectSocket();
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) => {
        const current = get().user;
        if (current) {
          set({ user: { ...current, ...updates } });
        }
      },

      fetchMe: async () => {
        try {
          const { data } = await authAPI.getMe();
          set({ user: data.user });
        } catch {
          // Ignore silently
        }
      },
    }),
    {
      name: 'campushub_auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
