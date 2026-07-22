import { useEffect, useRef, useState } from 'react';
import {
  startDriverHub,
  stopDriverHub,
  onDriverHubEvent,
  getDriverHubState,
  subscribeDriverHubState,
  type DriverHubState,
} from '@services/signalr';
import { startBackgroundLocation, stopBackgroundLocation } from '@services/location';
import { useAppState } from '@shared/hooks/useAppState';
import { useLocationBeacon } from './useLocationBeacon';

// Tên event backend push chuyến mời tài xế. Nếu backend đặt tên khác
// (vd "TripOffered", "ReceiveOffer") thì chỉ cần đổi hằng này.
const OFFER_EVENT = 'offer';

// Chờ bao lâu trước khi tự kết nối lại sau khi rơi về disconnected (ms)
const RECONNECT_DELAY_MS = 5000;

// Gắn vòng đời kết nối SignalR /hubs/driver vào toggle "Mở nhận chuyến":
// online = true → kết nối hub; online = false → ngắt.
// Việc gửi vị trí do useLocationBeacon lo — nó tự chọn kênh SignalR hay HTTP tuỳ
// app đang ở foreground hay background.
// coords là vị trí hiện tại [lng, lat] theo chuẩn Mapbox. Trả về trạng thái kết nối cho UI.
// Log kết nối thành công/thất bại nằm trong services/signalr/driverHub.ts.
export function useDriverHub(online: boolean, coords: [number, number]): DriverHubState {
  const [hubState, setHubState] = useState<DriverHubState>(getDriverHubState());

  // Đăng ký AppState ở đúng một chỗ rồi truyền xuống, tránh 2 listener bắn log trùng nhau.
  const { isBackground } = useAppState();

  useEffect(() => subscribeDriverHubState(setHubState), []);

  useEffect(() => {
    if (online) {
      // Lỗi đã được log + phản ánh qua hubState='disconnected' — không throw lên UI.
      startDriverHub().catch(() => {});
    } else {
      stopDriverHub().catch(() => {});
    }
  }, [online]);

  // Nhận vị trí nền do OS chủ động đẩy — thứ DUY NHẤT gửi được vị trí khi app không hiển thị.
  // Xin quyền phải làm lúc app đang mở nên buộc phải nằm ở đây chứ không phải trong task.
  // KHÔNG tắt task khi unmount (khác hub): mục đích của nó chính là sống lâu hơn màn hình —
  // chỉ tài xế bấm tắt nhận chuyến mới dừng.
  useEffect(() => {
    if (online) {
      startBackgroundLocation().catch((err) => {
        console.log('[LOC:BG] ✗ không bật được vị trí nền:', err);
      });
    } else {
      stopBackgroundLocation().catch(() => {});
    }
  }, [online]);

  // Vừa quay lại foreground mà hub chưa nối → thử lại NGAY, không chờ hết RECONNECT_DELAY_MS.
  // Lúc này tài xế đang nhìn màn hình: mỗi giây chậm nhận event "offer" là một chuyến có thể mất.
  const wasBackgroundRef = useRef(isBackground);
  useEffect(() => {
    const cameBack = wasBackgroundRef.current && !isBackground;
    wasBackgroundRef.current = isBackground;
    if (!cameBack || !online) return;
    if (getDriverHubState() === 'connected') return;
    console.log('[HUB] ⟳ App về foreground, SignalR đang rớt — kết nối lại NGAY (không chờ 5s)...');
    startDriverHub().catch(() => {});
  }, [isBackground, online]);

  // Lưới an toàn: đang mở nhận chuyến mà rơi hẳn về disconnected (server chủ động
  // đóng kết nối — trường hợp này SignalR KHÔNG tự reconnect — hoặc auto-reconnect
  // bỏ cuộc) → tự thử kết nối lại sau 5s, lặp tới khi vào được hoặc tài xế tắt toggle.
  // Bỏ qua khi đang ở nền: kết nối gần như chắc chắn hỏng, thử lại chỉ tốn pin —
  // effect phía trên sẽ nối lại ngay lúc quay về foreground.
  useEffect(() => {
    if (!online || isBackground || hubState !== 'disconnected') return;
    const timer = setTimeout(() => {
      console.log('[HUB] ⟳ Vẫn đang mở nhận chuyến mà SignalR rớt — tự kết nối lại...');
      startDriverHub().catch(() => {});
    }, RECONNECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [online, isBackground, hubState]);

  // Nhịp gửi vị trí: SignalR khi foreground, HTTP heartbeat khi ở nền.
  useLocationBeacon({ online, coords, hubState, isBackground });

  // Rời màn hình / unmount thì ngắt kết nối để không giữ socket mồ côi.
  useEffect(() => {
    return () => {
      stopDriverHub().catch(() => {});
    };
  }, []);

  return hubState;
}

// Nhận event "offer" (backend mời chuyến) từ hub. Handler đọc qua ref nên
// component render lại không làm huỷ/đăng ký lại event. Payload để unknown
// vì chưa chốt contract — caller tự narrow khi backend chốt shape.
export function useDriverHubOffer(onOffer: (offer: unknown) => void): void {
  const handlerRef = useRef(onOffer);
  handlerRef.current = onOffer;

  useEffect(() => {
    // Đăng ký 1 lần; SignalR giữ handler qua các lần reconnect. Trả về hàm huỷ đăng ký.
    return onDriverHubEvent(OFFER_EVENT, (...args: unknown[]) => {
      const payload = args.length > 1 ? args : args[0];
      // Log cả ngoài dev để chốt shape payload với backend.
      console.log(`[HUB] ⇩ ${OFFER_EVENT}:`, JSON.stringify(payload, null, 2));
      handlerRef.current(payload);
    });
  }, []);
}
