import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useMarkArrived } from '../api/useMarkArrived';
import { useCompleteTrip } from '../api/useCompleteTrip';
import type { ActiveTripData, ActiveTripPhase, LegInfo } from '../types';

// Nhãn thanh toán hiển thị → mã backend hiểu. Chưa khớp nhãn nào thì mặc định cash.
function toPaymentMethod(label: string): string {
  return label === 'Tiền mặt' ? 'cash' : label.toLowerCase();
}

/** Thứ tự chuyển pha khi tài xế bấm nút hành động chính */
const NEXT: Record<ActiveTripPhase, ActiveTripPhase> = {
  enroute_pickup: 'on_trip',
  on_trip: 'at_dropoff',
  at_dropoff: 'summary',
  summary: 'completed',
  completed: 'completed',
};

/** Số giây chờ ở các pha có đồng hồ đếm ngược (đợi khách / đợi thanh toán) */
const WAIT_SECONDS = 120;

/**
 * Điểm xuất phát giả lập của tài xế = lệch khỏi điểm đón một đoạn,
 * để vẽ được lộ trình tới điểm đón khi chưa có GPS realtime.
 */
function simulateDriverStart(pickup: [number, number]): [number, number] {
  return [pickup[0] - 0.018, pickup[1] - 0.01];
}

export function useActiveTrip(trip: ActiveTripData) {
  const [phase, setPhase] = useState<ActiveTripPhase>('enroute_pickup');
  const [rating, setRating] = useState(0);
  const [leg, setLeg] = useState<LegInfo | null>(null);

  // Đồng hồ chờ (đếm ngược) chỉ chạy ở pha at_pickup / at_dropoff
  const [wait, setWait] = useState(WAIT_SECONDS);

  const driverStart = useMemo(() => simulateDriverStart(trip.pickup.coord), [trip.pickup.coord]);

  const waitPhases = phase === 'at_dropoff';

  useEffect(() => {
    if (!waitPhases) return;
    setWait(WAIT_SECONDS);
    const timer = setInterval(() => {
      setWait((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [waitPhases, phase]);

  // Reset thông tin chặng mỗi khi đổi chặng (đón → trả)
  useEffect(() => {
    setLeg(null);
  }, [phase === 'on_trip' || phase === 'at_dropoff']);

  // Giữ lại leg gần nhất (leg bị reset null khi rời pha bản đồ) — số liệu chặng chở khách
  // này dùng cho body của POST /trips/{id}/complete ở pha summary.
  const lastLegRef = useRef<LegInfo | null>(null);
  useEffect(() => {
    if (leg) lastLegRef.current = leg;
  }, [leg]);

  const advance = useCallback(() => {
    setPhase((p) => NEXT[p]);
  }, []);

  const { mutate: markArrived, isPending: confirming } = useMarkArrived();

  // Nút hành động chính: pha nào cần báo backend thì gọi API xong mới chuyển pha,
  // pha còn lại (hoặc chuyến giả lập không có tripId) chỉ chuyển pha cục bộ.
  const primaryAction = useCallback(() => {
    if (confirming) return; // chặn double-tap khi đang chờ API

    // "Khách đã lên xe" → POST /trips/{tripId}/arrived
    if (phase === 'enroute_pickup' && trip.tripId) {
      const tripId = trip.tripId;
      markArrived(tripId, {
        onSuccess: (res) => {
          console.log(`[API] ✓ trips/${tripId}/arrived — response:`, JSON.stringify(res));
          advance();
        },
        onError: (err) => {
          console.log(`[API] ✗ trips/${tripId}/arrived thất bại: ${err.message}`);
          Alert.alert('Không xác nhận được', err.message);
        },
      });
      return;
    }

    advance();
  }, [confirming, phase, trip.tripId, markArrived, advance]);

  // Chặng bản đồ hiện tại: trước khi lên xe đi tới điểm đón, sau đó tới điểm đến
  const isPickupLeg = phase === 'enroute_pickup';
  const mapLeg = useMemo(
    () =>
      isPickupLeg
        ? { from: driverStart, to: trip.pickup.coord, kind: 'pickup' as const }
        : { from: trip.pickup.coord, to: trip.dropoff.coord, kind: 'dropoff' as const },
    [isPickupLeg, driverStart, trip.pickup.coord, trip.dropoff.coord]
  );

  return {
    phase,
    rating,
    setRating,
    leg,
    setLeg,
    wait,
    advance,
    primaryAction,
    confirming,
    mapLeg,
  };
}
