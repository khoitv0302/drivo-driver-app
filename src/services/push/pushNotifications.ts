import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  onTokenRefresh,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PushPlatform } from './types';

// Kênh Android cho chuyến mời — importance HIGH để hệ thống hiện heads-up + rung/âm thanh
// ngay cả khi app đang nền/tắt, thay vì bị Android hạ mức âm thầm như thông báo thường.
const TRIP_OFFER_CHANNEL_ID = 'trip-offers';

function messagingInstance() {
  return getMessaging(getApp());
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(TRIP_OFFER_CHANNEL_ID, {
    name: 'Chuyến mời',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });
}

// Xin quyền thông báo qua expo-notifications — react-native-firebase khuyến nghị cách này thay
// vì messaging().requestPermission() (đã deprecated), đồng thời lo luôn POST_NOTIFICATIONS
// runtime permission trên Android 13+ mà RNFirebase không tự xin hộ.
export async function requestPushPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

// Lấy FCM registration token THẬT (không phải raw APNs token) — react-native-firebase tự đổi
// APNs token → FCM token trên iOS (bước mà Google chỉ hỗ trợ qua Firebase SDK gốc, không có
// cách nào làm thủ công/qua server). Nhờ vậy CẢ Android lẫn iOS đều đăng ký lên Azure
// Notification Hub với platform 'fcmv1' + FCM token, không cần nhánh riêng cho iOS:
// hub cấu hình credential FCM v1, còn Firebase đã nạp APNs Auth Key nên tự relay sang APNs.
// Nếu sau này hub đổi sang cắm thẳng chứng chỉ APNs thì mới cần nhánh iOS trả
// { platform: 'apns', pnsHandle: getAPNSToken() } — lúc đó chỉ sửa đúng hàm này.
export async function getDevicePushToken(): Promise<{ pnsHandle: string; platform: PushPlatform } | null> {
  const granted = await requestPushPermission();
  if (!granted) return null;

  await ensureAndroidChannel();

  const pnsHandle = await getToken(messagingInstance());
  if (__DEV__) console.log(`[PUSH] 🔑 FCM token (${Platform.OS}):`, pnsHandle);
  return { pnsHandle, platform: 'fcmv1' };
}

// Token có thể bị FCM đổi giữa phiên (hiếm) — đăng ký lại với backend ngay khi đổi.
export function onPushTokenRotated(listener: (token: string) => void): () => void {
  return onTokenRefresh(messagingInstance(), listener);
}

// Message tới lúc app đang mở (foreground). KHÔNG tự hiện banner OS ở đây — từng thử dùng
// expo-notifications.scheduleNotificationAsync nhưng bị xung đột: react-native-firebase và
// expo-notifications cùng tranh quyền UNUserNotificationCenterDelegate trên iOS, nên banner
// không lên dù message tới JS bình thường (log vẫn nhận được). Không sửa được xung đột này
// (2 thư viện native cùng đòi làm chủ 1 delegate), nên bỏ hẳn phần tự hiện banner — chấp nhận
// được vì lúc app foreground + đang mở nhận chuyến, SignalR (useDriverHubOffer) đã tự hiện
// IncomingTripCard ngay trong app rồi, không cần thêm banner OS nữa.
export function onNotificationReceived(listener: (message: RemoteMessage) => void): () => void {
  return onMessage(messagingInstance(), (message) => {
    listener(message);
  });
}

// Bấm vào notification do FCM hiện lúc app đang nền, hoặc vừa mở app lên từ đó.
export function onRemoteNotificationTapped(listener: (message: RemoteMessage) => void): () => void {
  return onNotificationOpenedApp(messagingInstance(), listener);
}

// App được mở bằng cách bấm 1 remote notification (FCM) lúc app đang tắt hẳn (cold start).
export function getInitialRemoteNotification(): Promise<RemoteMessage | null> {
  return getInitialNotification(messagingInstance());
}

// Đăng ký handler xử lý message tới lúc app nền/tắt hẳn — BẮT BUỘC gọi ở top-level (index.ts),
// ngoài cây React, theo yêu cầu của react-native-firebase. Không được cập nhật UI ở đây, chỉ
// side-effect (log, lưu storage...) — hiển thị cho message có payload "notification" đã do hệ
// điều hành tự lo, không cần code gì thêm.
export function registerBackgroundMessageHandler(): void {
  setBackgroundMessageHandler(messagingInstance(), async (message) => {
    if (__DEV__) console.log('[PUSH] 📥 message lúc nền/tắt:', message.messageId, message.data);
  });
}
