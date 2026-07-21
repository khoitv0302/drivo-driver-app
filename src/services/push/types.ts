// Nền tảng của raw device push token — Android trả FCM token, iOS trả APNs token
// (Notifications.getDevicePushTokenAsync() của expo-notifications, KHÔNG qua Expo push relay).
export type PushPlatform = 'android' | 'ios';

// Provider mà backend dùng để gửi tới token này. Bản thân token trên máy (FCM/APNs)
// không đổi khi đổi provider — chỉ backend đổi nơi gửi (Firebase Admin SDK → Azure Notification
// Hub sau này), nên FE chỉ cần gắn kèm provider để backend biết định tuyến, không cần đổi code lấy token.
export type PushProvider = 'fcm';

export interface RegisterDeviceTokenPayload {
  token: string;
  platform: PushPlatform;
  provider: PushProvider;
}
