import { useEffect } from 'react';
import { useAuthStore } from '@store/auth.store';
import { ROUTES } from '@constants/routes';
import { navigationRef } from '@navigation/navigationRef';
import { getOrCreateInstallationId } from '@services/storage/installationStorage';
import {
  getDevicePushToken,
  onPushTokenRotated,
  onNotificationReceived,
  onRemoteNotificationTapped,
  getInitialRemoteNotification,
  registerDeviceInstallation,
  type PushPlatform,
} from '@services/push';

function navigateToOffer(): void {
  // Chuyến mời qua push chỉ để đánh thức app — trạng thái chuyến thật do SignalR đồng bộ lại
  // khi hub reconnect (xem useDriverHub). Ở đây chỉ cần đưa tài xế về Home để thấy lời mời.
  if (navigationRef.isReady()) {
    navigationRef.navigate(ROUTES.MAIN);
  }
}

// Đăng ký device installation lên Azure Notification Hub (qua backend) — kênh dự phòng cho
// SignalR (services/signalr): tài xế tắt hẳn app hoặc mất kết nối hub vẫn nhận được thông báo có
// chuyến qua notification hệ thống. Gắn 1 lần ở gốc app (App.tsx); không phụ thuộc toggle
// "Mở nhận chuyến" vì điều phối viên có thể gán chuyến thủ công bất cứ lúc nào.
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
        // installationId phải lấy SAU khi chắc chắn có handle, để máy từ chối quyền push
        // không tạo ra installation rỗng trên hub.
        const installationId = await getOrCreateInstallationId();
        if (cancelled) return;
        await registerDeviceInstallation({ installationId, ...device });
        if (__DEV__) console.log(`[PUSH] ✓ đã đăng ký installation ${installationId} (${device.platform})`);
      } catch (err) {
        console.log('[PUSH] ✗ đăng ký installation thất bại:', err instanceof Error ? err.message : err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, token]);

  // FCM có thể xoay token giữa phiên — PUT lại cùng installationId để hub cập nhật pnsHandle mới
  // (ghi đè bản ghi cũ, không tạo installation mới).
  useEffect(() => {
    if (!hasHydrated || !token) return;
    const platform: PushPlatform = 'fcmv1';
    return onPushTokenRotated(async (newToken) => {
      try {
        const installationId = await getOrCreateInstallationId();
        await registerDeviceInstallation({ installationId, platform, pnsHandle: newToken });
      } catch {
        // Best-effort: lần mở app sau effect đăng ký ở trên sẽ đẩy lại handle mới nhất.
      }
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
