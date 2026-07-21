import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '@store/auth.store';
import { ROUTES } from '@constants/routes';
import { navigationRef } from '@navigation/navigationRef';
import {
  getDevicePushToken,
  onPushTokenRotated,
  onNotificationReceived,
  onRemoteNotificationTapped,
  getInitialRemoteNotification,
  registerDeviceToken,
  type PushPlatform,
} from '@services/push';

function navigateToOffer(): void {
  // Chuyến mời qua push chỉ để đánh thức app — trạng thái chuyến thật do SignalR đồng bộ lại
  // khi hub reconnect (xem useDriverHub). Ở đây chỉ cần đưa tài xế về Home để thấy lời mời.
  if (navigationRef.isReady()) {
    navigationRef.navigate(ROUTES.MAIN);
  }
}

// Đăng ký device push token (FCM — cả Android lẫn iOS, xem services/push/pushNotifications.ts)
// với backend khi đã đăng nhập — kênh dự phòng cho SignalR (services/signalr): tài xế tắt hẳn
// app hoặc mất kết nối hub vẫn nhận được thông báo có chuyến qua notification hệ thống. Gắn 1
// lần ở gốc app (App.tsx); không phụ thuộc toggle "Mở nhận chuyến" vì điều phối viên có thể
// gán chuyến thủ công bất cứ lúc nào.
export function usePushRegistration(): void {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!hasHydrated || !token) return;
    let cancelled = false;

    (async () => {
      const device = await getDevicePushToken();
      if (!device || cancelled) return;
      try {
        await registerDeviceToken({ token: device.token, platform: device.platform, provider: 'fcm' });
        if (__DEV__) console.log(`[PUSH] ✓ đã đăng ký device token (${device.platform})`);
      } catch (err) {
        console.log('[PUSH] ✗ đăng ký device token thất bại:', err instanceof Error ? err.message : err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, token]);

  // Token FCM có thể bị đổi giữa phiên (hiếm) — đăng ký lại ngay với backend khi đổi.
  useEffect(() => {
    if (!hasHydrated || !token) return;
    const platform: PushPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
    return onPushTokenRotated((newToken) => {
      registerDeviceToken({ token: newToken, platform, provider: 'fcm' }).catch(() => {});
    });
  }, [hasHydrated, token]);

  // Bấm vào notification do FCM hiện lúc app nền/tắt — kể cả cold start (đọc
  // getInitialRemoteNotification). Không còn nhánh "local tap" vì foreground không tự hiện
  // banner OS nữa (xem lý do trong pushNotifications.ts) — lúc foreground SignalR đã lo hiển thị.
  useEffect(() => {
    let cancelled = false;

    getInitialRemoteNotification().then((message) => {
      if (message && !cancelled) navigateToOffer();
    });

    const unsubscribeReceived = onNotificationReceived((message) => {
      if (__DEV__) console.log('[PUSH] ⇩ nhận message (foreground):', JSON.stringify(message));
    });
    const unsubscribeRemoteTap = onRemoteNotificationTapped(() => navigateToOffer());

    return () => {
      cancelled = true;
      unsubscribeReceived();
      unsubscribeRemoteTap();
    };
  }, []);
}
