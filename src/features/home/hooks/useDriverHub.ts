import { useEffect, useRef, useState } from 'react';
import {
  startDriverHub,
  stopDriverHub,
  invokeDriverHub,
  onDriverHubEvent,
  getDriverHubState,
  subscribeDriverHubState,
  type DriverHubState,
} from '@services/signalr';

// Tên event backend push chuyến mời tài xế. Nếu backend đặt tên khác
// (vd "TripOffered", "ReceiveOffer") thì chỉ cần đổi hằng này.
const OFFER_EVENT = 'offer';

// Loại xe gửi kèm vị trí — backend dùng làm key cho set geo:online:{vehicleType}.
// Tạm hardcode; sau này lấy từ hồ sơ tài xế.
const VEHICLE_TYPE = 'car_auto';

// Nhịp gửi vị trí lên hub khi đang trực tuyến (ms)
const LOCATION_INTERVAL_MS = 5000;

// Chờ bao lâu trước khi tự kết nối lại sau khi rơi về disconnected (ms)
const RECONNECT_DELAY_MS = 5000;

// Gắn vòng đời kết nối SignalR /hubs/driver vào toggle "Mở nhận chuyến":
// online = true → kết nối hub + gửi vị trí (UpdateLocation) mỗi 5s; online = false → ngắt.
// coords là vị trí hiện tại [lng, lat] theo chuẩn Mapbox. Trả về trạng thái kết nối cho UI.
// Log kết nối thành công/thất bại nằm trong services/signalr/driverHub.ts.
export function useDriverHub(online: boolean, coords: [number, number]): DriverHubState {
  const [hubState, setHubState] = useState<DriverHubState>(getDriverHubState());

  // Ref để interval luôn đọc toạ độ mới nhất mà không phải reset timer mỗi lần GPS cập nhật.
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  useEffect(() => subscribeDriverHubState(setHubState), []);

  useEffect(() => {
    if (online) {
      // Lỗi đã được log + phản ánh qua hubState='disconnected' — không throw lên UI.
      startDriverHub().catch(() => {});
    } else {
      stopDriverHub().catch(() => {});
    }
  }, [online]);

  // Lưới an toàn: đang mở nhận chuyến mà rơi hẳn về disconnected (server chủ động
  // đóng kết nối — trường hợp này SignalR KHÔNG tự reconnect — hoặc auto-reconnect
  // bỏ cuộc) → tự thử kết nối lại sau 5s, lặp tới khi vào được hoặc tài xế tắt toggle.
  useEffect(() => {
    if (!online || hubState !== 'disconnected') return;
    const timer = setTimeout(() => {
      console.log('[HUB] ⟳ vẫn đang mở nhận chuyến — tự kết nối lại...');
      startDriverHub().catch(() => {});
    }, RECONNECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [online, hubState]);

  // Đang trực tuyến + hub đã kết nối → gửi vị trí ngay và lặp lại mỗi 5s.
  // Mất kết nối (reconnecting/disconnected) thì effect tự dừng, kết nối lại thì tự chạy tiếp.
  useEffect(() => {
    if (!online || hubState !== 'connected') return;

    const sendLocation = () => {
      const [lng, lat] = coordsRef.current;
      // invoke = 2 chiều: promise chỉ resolve khi server gửi completion về,
      // tức hàm UpdateLocation() phía .NET đã chạy xong không lỗi.
      invokeDriverHub('UpdateLocation', {
        lat,
        lng,
        vehicleType: VEHICLE_TYPE,
        heading: 0,
        speed: 0,
      })
        .then(() => {
          if (__DEV__) {
            console.log(
              `[HUB] ✓ UpdateLocation — server ĐÃ XỬ LÝ (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
            );
          }
        })
        .catch((err) => {
          // Gửi trúng lúc rớt kết nối ≠ server từ chối: auto-reconnect sẽ nối lại và
          // effect tự bắn nhịp mới ngay khi connected — chỉ ghi nhận, không báo động.
          if (getDriverHubState() !== 'connected') {
            console.log('[HUB] ↷ bỏ qua 1 nhịp vị trí (đang mất kết nối, sẽ gửi lại sau reconnect)');
            return;
          }
          // console.log để LogBox không bung toast đỏ — message chứa exception từ server
          // (rõ hơn nếu backend bật EnableDetailedErrors ở môi trường dev).
          console.log(
            '[HUB] ✗ UpdateLocation bị từ chối:',
            err instanceof Error ? err.message : err,
          );
        });
    };

    sendLocation();
    const timer = setInterval(sendLocation, LOCATION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [online, hubState]);

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
