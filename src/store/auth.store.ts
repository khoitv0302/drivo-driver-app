import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from '@services/storage/tokenStorage';

// Phiên đăng nhập trả về từ API login / refresh.
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  roles: string[];
  driverStatus: string;
}

interface AuthState {
  token: string | null; // = accessToken; RootNavigator dùng để gate auth
  refreshToken: string | null; // giữ trong RAM cho interceptor; nguồn bền vững là SecureStore
  userId: string | null;
  roles: string[];
  driverStatus: string | null;
  _hasHydrated: boolean;
  setToken: (token: string) => void;
  setSession: (session: AuthSession) => void;
  clearToken: () => void;
  _setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      userId: null,
      roles: [],
      driverStatus: null,
      _hasHydrated: false,
      setToken: (token) => set({ token }),
      setSession: (session) => {
        // Log phiên mới (login/refresh) — soi roles/driverStatus khi debug 403 từ hub.
        console.log(
          `[AUTH] phiên mới: userId=${session.userId}, roles=[${session.roles.join(', ')}], driverStatus=${session.driverStatus}`,
        );
        // Dev: decode payload JWT để thấy claim THẬT trong token (tên claim role, giá trị)
        // — backend authorize theo claim trong token, không theo body response.
        if (__DEV__) {
          try {
            const b64 = session.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
            console.log('[AUTH] JWT claims:', JSON.parse(atob(padded)));
          } catch {
            // token không phải JWT hoặc môi trường thiếu atob — bỏ qua, chỉ là log debug
          }
        }
        // Ghi refresh token vào SecureStore (bền, mã hoá); phần còn lại vào AsyncStorage qua persist.
        saveRefreshToken(session.refreshToken).catch(() => {});
        set({
          token: session.accessToken,
          refreshToken: session.refreshToken,
          userId: session.userId,
          roles: session.roles,
          driverStatus: session.driverStatus,
        });
      },
      clearToken: () => {
        deleteRefreshToken().catch(() => {});
        set({ token: null, refreshToken: null, userId: null, roles: [], driverStatus: null });
      },
      _setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: 'drivo-driver-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // v1: shape mới (session đầy đủ). State v0 cũ chứa mock token từ thời chưa có API
      // → migrate bỏ hết, bắt đăng nhập lại bằng phiên thật.
      version: 1,
      migrate: () => ({ token: null, userId: null, roles: [], driverStatus: null }),
      // KHÔNG persist refreshToken ở đây — nó nằm trong SecureStore, không để plaintext trong AsyncStorage.
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        roles: state.roles,
        driverStatus: state.driverStatus,
      }),
      onRehydrateStorage: () => () => {
        // Sau khi AsyncStorage hydrate xong, nạp refresh token từ SecureStore rồi mới báo hydrated
        // để RootNavigator không gate sai trong lúc token còn đang nạp.
        getRefreshToken()
          .then((rt) => useAuthStore.setState({ refreshToken: rt }))
          .catch(() => {})
          .finally(() => useAuthStore.getState()._setHydrated());
      },
    }
  )
);
