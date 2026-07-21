import { apiClient } from '@services/api/client';
import type { RegisterDeviceTokenPayload } from './types';

// Backend CHƯA có endpoint này — đây là đề xuất contract, cần đối chiếu với backend team:
//   POST   /device-tokens              { token, platform: 'android'|'ios', provider: 'fcm' } → 204
//   DELETE /device-tokens/{token}                                                             → 204
// token là raw FCM/APNs device token (không phải Expo push token). Khi backend chuyển sang
// Azure Notification Hub, chỉ thêm provider: 'azure' — FE không cần đổi vì token trên máy
// (FCM/APNs) không phụ thuộc provider gửi, chỉ đổi nơi backend forward tới.
export async function registerDeviceToken(payload: RegisterDeviceTokenPayload): Promise<void> {
  await apiClient.post('/device-tokens', payload);
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  await apiClient.delete(`/device-tokens/${encodeURIComponent(token)}`);
}
