import type { ActiveTripParams } from '../../navigation/types';

/**
 * Các pha của một chuyến đang chạy — tương ứng các màn thiết kế:
 *  enroute_pickup  → Đang đến điểm đón   (nút: Khách đã lên xe)
 *  on_trip         → Đang trên chuyến đi  (nút: Đã đến nơi)
 *  at_dropoff      → Đã đến điểm đến       (nút: Khách đã thanh toán)
 *  summary         → Hoàn tất chuyến đi   (kéo để hoàn thành)
 *  completed       → Chuyến đi đã hoàn thành (nút: Quay về trang chủ)
 */
export type ActiveTripPhase =
  | 'enroute_pickup'
  | 'on_trip'
  | 'at_dropoff'
  | 'summary'
  | 'completed';

/** Thông tin lộ trình lấy từ Mapbox Directions cho chặng hiện tại */
export interface LegInfo {
  distanceKm: number;
  durationMin: number;
}

/** Dữ liệu chuyến truyền vào màn hình — alias lại param điều hướng cho gọn */
export type ActiveTripData = ActiveTripParams;
