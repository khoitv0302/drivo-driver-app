import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  _hasHydrated: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
  _setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      _hasHydrated: false,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
      _setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: 'drivo-driver-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => () => {
        useAuthStore.getState()._setHydrated();
      },
    }
  )
);
