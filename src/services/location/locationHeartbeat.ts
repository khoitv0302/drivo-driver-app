import { apiClient } from '@services/api/client';
import type { LocationHeartbeatPayload } from './types';

// Kênh DỰ PHÒNG cho nhịp vị trí tài xế (backend plan 033).
//   POST /location/heartbeat   body { lat, lng, vehicleType, heading?, speed? } → 200 (body rỗng)
//
// Hub method DriverHub.UpdateLocation vẫn là kênh chính; endpoint này chỉ dùng khi
// WebSocket không đáng tin (app vào nền, NAT idle timeout, Wi-Fi chập chờn). Backend
// xử lý y hệt một hub ping: presence + GEO candidate set + relay live-tracking cho khách.
//
// Auth: Bearer JWT, role driver_approved — request interceptor tự đính token, KHÔNG tự set header.
// API_URL đã có sẵn hậu tố /api nên ở đây chỉ ghi phần còn lại.
//
// Ma trận lỗi:
//   200 — nhận, HOẶC bị rate guard (Location:HttpHeartbeat:MinIntervalMs) bỏ qua một cách vô hại.
//         Heartbeat idempotent nên gửi dày hơn mức cho phép vẫn trả 200.
//   400 VALIDATION_ERROR — thiếu vehicleType hoặc toạ độ ngoài khoảng hợp lệ.
//   401 — thiếu/sai token (auth chạy TRƯỚC cổng bật/tắt tính năng).
//   403 — token hợp lệ nhưng không có role driver_approved.
//   404 — fallback đang TẮT phía backend (Location:HttpHeartbeat:Enabled=false, MẶC ĐỊNH TẮT).
//         Vì auth chạy trước cổng này nên caller sai quyền luôn nhận 401/403 bất kể cờ bật hay tắt
//         → trạng thái của cờ không bị lộ ra ngoài. Nhận 404 nghĩa là: token ĐÚNG, cờ đang tắt.
const ENDPOINT = '/location/heartbeat';

// Thời điểm gửi heartbeat thành công gần nhất (bất kể do nhịp 5s hay do OS đánh thức).
// Có 2 nguồn gửi song song khi ở nền — xem msSinceLastHeartbeat() bên dưới.
let lastHeartbeatAt = 0;

// Dùng để khử trùng lặp giữa 2 nguồn: nhịp 5s của useLocationBeacon (chạy khi tiến trình còn
// sống) và task nền do OS đánh thức mỗi 20m (chạy cả khi app đã bị kill rồi khởi động lại).
// Lúc bình thường cả 2 cùng sống → task nhường nhịp 5s; khi app bị kill thì chỉ còn task.
export function msSinceLastHeartbeat(): number {
  return lastHeartbeatAt === 0 ? Number.POSITIVE_INFINITY : Date.now() - lastHeartbeatAt;
}

export async function sendLocationHeartbeat(payload: LocationHeartbeatPayload): Promise<void> {
  await apiClient.post(ENDPOINT, payload);
  lastHeartbeatAt = Date.now();
}
