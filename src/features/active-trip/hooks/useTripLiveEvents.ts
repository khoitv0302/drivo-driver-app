import { useEffect, useRef } from 'react';
import { onDriverHubEvent } from '@services/signalr';

// Tên event backend push realtime trong lúc chuyến đang chạy. Nếu backend đặt tên
// khác thì chỉ cần đổi 2 hằng này (giống cách OFFER_EVENT được xử lý ở useDriverHub).
const ETA_EVENT = 'eta';
const POSITION_EVENT = 'position';

/** Payload event "eta" — đã chốt shape với backend qua log thực tế. */
export type TripEtaEvent = {
  tripId: string;
  phase: 'pickup' | 'dropoff';
  etaMinutes: number;
  distanceKm: number;
  isApproximate: boolean;
  ts: number;
  driverUserId: string;
};

/**
 * Lắng nghe "eta" (quãng đường/thời gian còn lại — backend tính, không tự tính ở
 * front end nữa) và "position" (vị trí xe) đẩy realtime từ /hubs/driver trong lúc
 * chuyến đang chạy. "position" chưa chốt payload nên tạm chỉ log ra để xác nhận shape.
 */
export function useTripLiveEvents(onEta: (eta: TripEtaEvent) => void): void {
  const onEtaRef = useRef(onEta);
  onEtaRef.current = onEta;

  useEffect(() => {
    const offEta = onDriverHubEvent(ETA_EVENT, (...args: unknown[]) => {
      const eta = args[0] as TripEtaEvent;
      console.log(`[HUB] ⇩ ${ETA_EVENT}:`, JSON.stringify(eta, null, 2));
      onEtaRef.current(eta);
    });
    const offPosition = onDriverHubEvent(POSITION_EVENT, (...args: unknown[]) => {
      const payload = args.length > 1 ? args : args[0];
      console.log(`[HUB] ⇩ ${POSITION_EVENT}:`, JSON.stringify(payload, null, 2));
    });

    return () => {
      offEta();
      offPosition();
    };
  }, []);
}
