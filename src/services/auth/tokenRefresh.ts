import axios from 'axios';
import { API_URL, API_TIMEOUT } from '@constants/config';
import { useAuthStore, type AuthSession } from '@store/auth.store';

// Điểm lấy/refresh access token DUY NHẤT của app — dùng chung cho cả Axios interceptor
// (services/api/interceptors.ts) và SignalR accessTokenFactory (services/signalr/driverHub.ts)
// để 2 nơi này không tự chế 2 cơ chế refresh khác nhau trên cùng 1 token.

// axios "trần" (không interceptor) để gọi refresh — tránh đệ quy 401 vô hạn.
const refreshClient = axios.create({ baseURL: API_URL, timeout: API_TIMEOUT });

// Coi là "sắp hết hạn" nếu accessToken còn hạn dưới 1 phút.
const EXPIRY_BUFFER_MS = 60_000;

// Single-flight: nhiều request API / lần connect SignalR cùng lúc chỉ chia sẻ 1 lần gọi /auth/refresh.
let refreshPromise: Promise<string> | null = null;

// Không rõ hạn (thiếu/không parse được expiresAt) → coi như sắp hết hạn để tự refresh cho chắc,
// thay vì liều dùng token có thể đã chết.
function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const expiryMs = Date.parse(expiresAt);
  if (Number.isNaN(expiryMs)) return true;
  return expiryMs - Date.now() < EXPIRY_BUFFER_MS;
}

async function runRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

  if (__DEV__) console.log('[Auth] ↻ POST /auth/refresh (làm mới access token)');
  const { data } = await refreshClient.post<AuthSession>('/auth/refresh', { refreshToken });
  // setSession cập nhật cả access token + expiresAt mới (RAM/AsyncStorage) và refresh token mới
  // (SecureStore) — backend xoay refresh token mỗi lần refresh nên phải lưu lại token mới.
  useAuthStore.getState().setSession(data);
  return data.accessToken;
}

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Gọi trước khi gọi API / connect SignalR (đúng flow): đọc access token hiện có, nếu còn hạn
// (>= 1 phút) thì trả về luôn; nếu sắp hết hạn thì refresh trước rồi mới trả token mới.
// Refresh thất bại → phiên hết hạn thật → đăng xuất cục bộ (clearToken), trả về null.
export async function ensureFreshAccessToken(): Promise<string | null> {
  const { token, expiresAt } = useAuthStore.getState();
  if (!token) return null;
  if (!isExpiringSoon(expiresAt)) return token;

  try {
    return await refreshAccessToken();
  } catch (err) {
    // PHÂN BIỆT hai loại thất bại — trước đây gộp chung và đăng xuất cho cả hai:
    //   • server TỪ CHỐI (có response 4xx): refresh token chết thật → phiên hết hạn → đăng xuất.
    //   • LỖI MẠNG (không có response): mất sóng, proxy chập chờn, vừa ra khỏi nền...
    //     Đăng xuất ở đây là oan — tài xế đang chạy chuyến bị đá về màn Đăng nhập chỉ vì
    //     rớt sóng đúng lúc token sắp hết hạn. Giữ phiên, trả null, để lần gọi sau thử lại.
    if (axios.isAxiosError(err) && !err.response) {
      console.log('[Auth] ✗ refresh lỗi mạng — GIỮ phiên đăng nhập, sẽ thử lại ở lần gọi sau');
      return null;
    }
    console.log('[Auth] ✗ refresh bị server từ chối — phiên hết hạn, quay về màn Đăng nhập');
    useAuthStore.getState().clearToken();
    return null;
  }
}

// Dùng khi đã dính 401 thật sự (lệch giờ thiết bị, token bị thu hồi sớm phía server...) — ép
// refresh ngay bất kể expiresAt. Vẫn qua chung refreshAccessToken() (single-flight) nên không
// có 2 cơ chế refresh song song.
export function forceRefreshAccessToken(): Promise<string> {
  return refreshAccessToken();
}
