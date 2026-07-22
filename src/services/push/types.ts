// Giá trị platform của Azure Notification Hubs — KHÔNG phải 'android'/'ios'. Gửi sai giá trị
// backend trả 400 DEVICE_PLATFORM_INVALID.
//   fcmv1 → pnsHandle là FCM registration token
//   apns  → pnsHandle là raw APNs device token (hex), KHÔNG phải FCM token
// App hiện dùng 'fcmv1' cho cả Android lẫn iOS: react-native-firebase đổi APNs token → FCM token
// trên iOS, và hub bên backend cấu hình credential FCM v1 (Firebase đã nạp APNs Auth Key nên tự
// relay sang APNs). Xem thêm getDevicePushToken() trong pushNotifications.ts.
export type PushPlatform = 'fcmv1' | 'apns';

// Body của PUT /notifications/device-installation.
// Cố ý KHÔNG có field user: backend gắn installation với user id đọc từ JWT của người gọi, nên
// một máy không thể tự đăng ký nhận push của người khác.
export interface DeviceInstallationPayload {
  installationId: string;
  platform: PushPlatform;
  pnsHandle: string;
}
