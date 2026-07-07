import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
  type ILogger,
} from '@microsoft/signalr';
import axios from 'axios';
import { DRIVER_HUB_URL } from '@constants/config';
import { useAuthStore } from '@store/auth.store';
import { refreshAccessToken } from '@services/api/interceptors';

// Kết nối SignalR duy nhất tới hub /hubs/driver của backend .NET.
// Vòng đời (start khi đăng nhập, stop khi đăng xuất) do useDriverHubConnection quản lý —
// feature code chỉ dùng onDriverHubEvent / invokeDriverHub.

export type DriverHubState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

let connection: HubConnection | null = null;

// true khi app muốn giữ kết nối (đang mở nhận chuyến). Chặn race: bấm tắt đúng lúc
// đang connect/refresh-retry thì kết quả connect muộn sẽ bị huỷ ngay thay vì treo lơ lửng.
let wanted = false;

// ── Theo dõi trạng thái kết nối (cho UI hiển thị online/offline) ────────────
const stateListeners = new Set<(state: DriverHubState) => void>();
let currentState: DriverHubState = 'disconnected';

function setState(state: DriverHubState) {
  if (state === currentState) return;
  currentState = state;
  if (__DEV__) console.log(`[HUB] trạng thái: ${state}`);
  stateListeners.forEach((cb) => cb(state));
}

export function getDriverHubState(): DriverHubState {
  return currentState;
}

export function subscribeDriverHubState(cb: (state: DriverHubState) => void): () => void {
  stateListeners.add(cb);
  return () => stateListeners.delete(cb);
}

// Logger nội bộ của SignalR mặc định gọi console.error/warn khi rớt kết nối →
// LogBox của RN bung toast đỏ trên UI dev, trong khi rớt mạng là chuyện thường của mobile.
// Đưa hết về console.log: terminal vẫn thấy đủ, UI sạch.
const quietLogger: ILogger = {
  log(logLevel: LogLevel, message: string): void {
    const min = __DEV__ ? LogLevel.Information : LogLevel.Error;
    if (logLevel < min) return;
    console.log(`[HUB:signalr] ${message}`);
  },
};

// ── Khởi tạo connection ──────────────────────────────────────────────────────
function getConnection(): HubConnection {
  if (connection) return connection;

  connection = new HubConnectionBuilder()
    .withUrl(DRIVER_HUB_URL, {
      // React Native không có EventSource/document → chỉ dùng WebSockets.
      transport: HttpTransportType.WebSockets,
      // Token đọc mỗi lần negotiate/reconnect → luôn lấy access token mới nhất
      // (kể cả sau khi interceptor axios đã refresh).
      accessTokenFactory: () => useAuthStore.getState().token ?? '',
    })
    .withAutomaticReconnect({
      // Retry vô hạn với backoff lũy tiến, trần 30s — tài xế cần realtime liên tục.
      nextRetryDelayInMilliseconds: ({ previousRetryCount }) =>
        Math.min(1000 * 2 ** previousRetryCount, 30000),
    })
    .configureLogging(quietLogger)
    .build();

  // Mạng di động chập chờn: chịu tối đa 60s không nhận được gì từ server mới coi là rớt
  // (mặc định 30s — dễ rớt oan khi app vào background hoặc sóng yếu). Server ping mỗi 15s.
  connection.serverTimeoutInMilliseconds = 60000;
  // Client tự ping server mỗi 15s để giữ kết nối sống qua proxy/NAT.
  connection.keepAliveIntervalInMilliseconds = 15000;

  connection.onreconnecting(() => setState('reconnecting'));
  connection.onreconnected(() => setState('connected'));
  connection.onclose(() => setState('disconnected'));

  return connection;
}

// ── API công khai ────────────────────────────────────────────────────────────

function is401(err: unknown): boolean {
  // SignalR gói lỗi negotiate thành Error với message chứa "Status code '401'".
  return err instanceof Error && err.message.includes("401");
}

// start + tự cứu khi 401: negotiate không đi qua interceptor axios nên access token
// hết hạn sẽ không được tự refresh → refresh thủ công rồi thử lại đúng 1 lần.
async function startWithAuthRetry(hub: HubConnection): Promise<void> {
  try {
    await hub.start();
  } catch (err) {
    if (!is401(err) || !useAuthStore.getState().refreshToken) throw err;

    console.log('[HUB] 401 — access token hết hạn, refresh rồi kết nối lại...');
    try {
      await refreshAccessToken();
    } catch (refreshErr) {
      // Refresh bị server từ chối (không phải lỗi mạng) → phiên hết hạn thật → đăng xuất.
      if (axios.isAxiosError(refreshErr) && refreshErr.response) {
        console.log('[HUB] refresh token cũng bị từ chối → phiên hết hạn, quay về màn Đăng nhập');
        useAuthStore.getState().clearToken();
      } else {
        console.log('[HUB] refresh lỗi mạng — GIỮ phiên đăng nhập, sẽ thử lại khi có kết nối');
      }
      throw refreshErr;
    }
    if (!wanted) return; // người dùng đã tắt nhận chuyến trong lúc refresh → không kết nối nữa
    await hub.start(); // accessTokenFactory sẽ đọc token mới từ store
  }
}

// Idempotent: gọi khi đang connected/connecting sẽ không làm gì.
export async function startDriverHub(): Promise<void> {
  wanted = true;
  const hub = getConnection();
  if (hub.state !== HubConnectionState.Disconnected) return;

  const { token, roles, driverStatus } = useAuthStore.getState();
  setState('connecting');
  if (__DEV__) {
    console.log(
      `[HUB] → đang kết nối ${DRIVER_HUB_URL} (token: ${token ? 'có' : 'KHÔNG CÓ'}, roles: [${roles.join(', ')}], driverStatus: ${driverStatus})`,
    );
  }
  try {
    await startWithAuthRetry(hub);
    // Bấm tắt nhận chuyến trong lúc đang connect → huỷ ngay kết nối vừa mở.
    if (!wanted) {
      await hub.stop();
      setState('disconnected');
      console.log('[HUB] ⏹ đã huỷ kết nối (tắt nhận chuyến khi đang kết nối)');
      return;
    }
    setState('connected');
    // Log cả ngoài dev để xác nhận kết nối hub thành công/thất bại khi mở nhận chuyến.
    console.log(`[HUB] ✓ kết nối thành công ${DRIVER_HUB_URL}`);
  } catch (err) {
    setState('disconnected');
    // console.log (không phải console.error) để LogBox không bung toast đỏ trên UI dev.
    if (err instanceof Error && err.message.includes('403')) {
      // 403 = token hợp lệ nhưng bị chặn ở [Authorize] của hub → lỗi role/policy phía backend.
      console.log(
        `[HUB] ✗ 403 — token hợp lệ nhưng không có quyền vào hub. Kiểm tra [Authorize(Roles/Policy)] trên DriverHub và RoleClaimType trong TokenValidationParameters phía backend.`,
      );
    } else {
      console.log(`[HUB] ✗ kết nối thất bại ${DRIVER_HUB_URL}`, err);
    }
    throw err;
  }
}

export async function stopDriverHub(): Promise<void> {
  wanted = false;
  if (!connection) return;
  const wasActive = connection.state !== HubConnectionState.Disconnected;
  try {
    await connection.stop();
  } finally {
    setState('disconnected');
    // Log cả ngoài dev — xác nhận tắt nhận chuyến đã thật sự ngắt kết nối hub.
    if (wasActive) console.log('[HUB] ⏹ đã ngắt kết nối hub');
  }
}

// Đăng ký nhận event từ server (vd: "TripRequested"). Trả về hàm huỷ đăng ký —
// luôn gọi trong cleanup của useEffect để tránh handler trùng lặp.
export function onDriverHubEvent(event: string, handler: (...args: unknown[]) => void): () => void {
  const hub = getConnection();
  hub.on(event, handler);
  return () => hub.off(event, handler);
}

// Gọi method phía server (vd: invokeDriverHub("UpdateLocation", lat, lng)).
export async function invokeDriverHub<T = void>(method: string, ...args: unknown[]): Promise<T> {
  const hub = getConnection();
  if (hub.state !== HubConnectionState.Connected) {
    throw new Error(`[HUB] chưa kết nối, không thể gọi "${method}"`);
  }
  return hub.invoke<T>(method, ...args);
}
