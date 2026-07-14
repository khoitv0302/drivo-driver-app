import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@store/auth.store';
import { ApiError, type ApiErrorResponse } from './types';
import { ensureFreshAccessToken, forceRefreshAccessToken } from '@services/auth/tokenRefresh';

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

// Gắn interceptor cho request/response: đính token còn hạn (chủ động refresh trước nếu cần),
// refresh-retry dự phòng khi vẫn dính 401 (lệch giờ máy chủ...), chuẩn hoá lỗi tập trung.
export function attachInterceptors(client: AxiosInstance) {
  // Request: đọc token + expiresAt, sắp hết hạn (<1 phút) thì chủ động refresh trước rồi mới
  // đính Bearer token — cùng cơ chế ensureFreshAccessToken() mà SignalR accessTokenFactory dùng.
  client.interceptors.request.use(async (config) => {
    const token = await ensureFreshAccessToken();
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
            await forceRefreshAccessToken();
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
