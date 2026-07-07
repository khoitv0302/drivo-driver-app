import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_URL, API_TIMEOUT } from '@constants/config';
import { useAuthStore, type AuthSession } from '@store/auth.store';
import { ApiError, type ApiErrorResponse } from './types';

// POST /auth/refresh trả về cùng shape với login → dùng lại AuthSession.

// axios "trần" (không interceptor) để gọi refresh — tránh đệ quy 401 vô hạn.
const refreshClient = axios.create({ baseURL: API_URL, timeout: API_TIMEOUT });

// Single-flight: nhiều request cùng dính 401 sẽ chia sẻ 1 lần gọi refresh.
let refreshPromise: Promise<string> | null = null;

async function runRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

  if (__DEV__) console.log('[API] ↻ POST /auth/refresh (làm mới access token)');
  try {
    const { data } = await refreshClient.post<AuthSession>('/auth/refresh', { refreshToken });
    // setSession cập nhật cả access token (RAM/AsyncStorage) và refresh token mới (SecureStore).
    // Backend xoay refresh token mỗi lần refresh → phải lưu lại token mới.
    useAuthStore.getState().setSession(data);
    console.log('[API] ✓ refresh thành công — đã có access token mới');
    return data.accessToken;
  } catch (err) {
    // refreshClient không có interceptor → tự log kết quả ở đây kẻo "mù" không biết vì sao logout.
    const status = axios.isAxiosError(err) && err.response ? `HTTP ${err.response.status}` : 'LỖI MẠNG';
    // console.log để LogBox không bung toast đỏ trên UI dev.
    console.log(`[API] ✗ refresh thất bại (${status}) — refresh token không còn hiệu lực?`);
    throw err;
  }
}

// Export cho services/signalr: negotiate của SignalR không đi qua axios nên phải tự refresh khi 401.
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ── Log request/response (chỉ ở dev) ────────────────────────────────────────
// Cố ý KHÔNG log body hay header Authorization — chúng chứa mật khẩu/OTP/token.
type TimedConfig = InternalAxiosRequestConfig & {
  metadata?: { startedAt: number };
  _retry?: boolean;
};

function formatUrl(config?: { url?: string; params?: unknown }): string {
  if (!config?.url) return '';
  const params = config.params as Record<string, unknown> | undefined;
  if (!params) return config.url;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('&');
  return qs ? `${config.url}?${qs}` : config.url;
}

function elapsedMs(config?: TimedConfig): string {
  const started = config?.metadata?.startedAt;
  return started ? ` (${Date.now() - started}ms)` : '';
}

// Gắn interceptor cho request/response: đính token, tự refresh khi 401, chuẩn hoá lỗi tập trung.
export function attachInterceptors(client: AxiosInstance) {
  // Request: tự đính Bearer token nếu đã đăng nhập.
  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    (config as TimedConfig).metadata = { startedAt: Date.now() };
    if (__DEV__) {
      console.log(`[API] → ${config.method?.toUpperCase()} ${formatUrl(config)}`);
    }
    return config;
  });

  // Response: giữ nguyên khi thành công, refresh-retry khi 401, chuẩn hoá về ApiError khi lỗi.
  client.interceptors.response.use(
    (response) => {
      if (__DEV__) {
        const cfg = response.config as TimedConfig;
        console.log(
          `[API] ← ${response.status} ${cfg.method?.toUpperCase()} ${formatUrl(cfg)}${elapsedMs(cfg)}`,
        );
      }
      return response;
    },
    async (error) => {
      // Có response từ server (4xx/5xx)
      if (error.response) {
        const status: number = error.response.status;
        const original = error.config as
          | (InternalAxiosRequestConfig & { _retry?: boolean })
          | undefined;

        // 401: access token hết hạn/không hợp lệ → thử refresh 1 lần rồi phát lại request gốc.
        // Bỏ qua nếu: đã retry, chính là lời gọi /auth/refresh, hoặc chưa có refresh token.
        const canRefresh =
          status === 401 &&
          original &&
          !original._retry &&
          !original.url?.includes('/auth/refresh') &&
          !!useAuthStore.getState().refreshToken;

        if (canRefresh && original) {
          original._retry = true;
          try {
            await refreshAccessToken();
            // Request interceptor sẽ tự đính access token mới khi phát lại.
            return client(original);
          } catch {
            // Refresh thất bại → phiên hết hạn thật → đăng xuất, RootNavigator đưa về Login.
            useAuthStore.getState().clearToken();
          }
        } else if (status === 401) {
          // 401 nhưng không thể refresh (không có refresh token / refresh cũng 401) → đăng xuất.
          useAuthStore.getState().clearToken();
        }

        const data = error.response.data as Partial<ApiErrorResponse> | undefined;
        const errors = data?.errors ?? [];
        const message = errors[0]?.message ?? `Yêu cầu thất bại (HTTP ${status})`;
        if (__DEV__) {
          const cfg = original as TimedConfig | undefined;
          const code = errors[0]?.code ? ` code=${errors[0].code}` : '';
          console.log(
            `[API] ✗ ${status} ${cfg?.method?.toUpperCase()} ${formatUrl(cfg)}${elapsedMs(cfg)}${code}`,
          );
        }
        return Promise.reject(new ApiError(message, status, errors, data?.traceId));
      }

      // Không có response: lỗi mạng / timeout
      // Log nguyên nhân gốc để debug (cleartext bị chặn, DNS, port, timeout...)
      const cfg = error.config as TimedConfig | undefined;
      console.error(
        `[API] ✗ NETWORK ${cfg?.method?.toUpperCase()} ${formatUrl(cfg)}${elapsedMs(cfg)}`,
        { code: error.code, message: error.message },
      );
      const message =
        error.code === 'ECONNABORTED'
          ? 'Kết nối quá thời gian, vui lòng thử lại.'
          : 'Không thể kết nối máy chủ, vui lòng kiểm tra mạng.';
      return Promise.reject(new ApiError(message, 0));
    },
  );
}
