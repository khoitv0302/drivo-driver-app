import { apiClient } from '@services/api/client';
import type { DeviceInstallationPayload } from './types';

// Backend đẩy thẳng xuống Azure Notification Hubs Installation API:
//   PUT    /notifications/device-installation        body { installationId, platform, pnsHandle } → 200 (body rỗng)
//   DELETE /notifications/device-installation/{installationId}                                    → 200
// Auth: Bearer JWT (role nào cũng được) — installation được gắn tag theo user id trong token.
// Lỗi: 400 VALIDATION_ERROR (thiếu installationId/pnsHandle) | 400 DEVICE_PLATFORM_INVALID | 401 AUTH_INVALID_TOKEN.
// API_URL đã có sẵn hậu tố /api nên ở đây chỉ ghi phần còn lại.
const ENDPOINT = '/notifications/device-installation';

// Gọi lúc đăng nhập và mỗi lần FCM xoay token. PUT là idempotent: cùng installationId thì chỉ
// làm mới pnsHandle chứ không tạo bản ghi mới, nên gọi lại nhiều lần là an toàn.
// Với provider OneSignal/Log, backend cho đây là no-op nhưng vẫn trả 200 — app không cần biết
// backend đang chạy provider nào.
export async function registerDeviceInstallation(payload: DeviceInstallationPayload): Promise<void> {
  await apiClient.put(ENDPOINT, payload);
}

// Gọi lúc đăng xuất để máy thôi nhận push của tài xế vừa thoát.
export async function deleteDeviceInstallation(installationId: string): Promise<void> {
  await apiClient.delete(`${ENDPOINT}/${encodeURIComponent(installationId)}`);
}
