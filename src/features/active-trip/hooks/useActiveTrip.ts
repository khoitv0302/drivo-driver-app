import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { haversineKm } from '../../../shared/utils/geo';
import { useLiveLocation } from '../../../shared/hooks/useLiveLocation';
import { usePickUpPassenger } from '../api/usePickUpPassenger';
import { useArrivedDestination } from '../api/useArrivedDestination';
import { useConfirmPayment } from '../api/useConfirmPayment';
import { useCompleteTrip } from '../api/useCompleteTrip';
import { arrivedPickup } from '../api/tripService';
import { useTripLiveEvents, type TripEtaEvent } from './useTripLiveEvents';
import type { ArrivedDestinationResult } from '../api/tripService';
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

// Bán kính quanh điểm đón để tự báo "đã đến" ngầm cho backend (km).
const ARRIVED_PICKUP_RADIUS_KM = 0.5;

/**
 * Map trạng thái thật của chuyến (field "status" từ GET /trips/me/current) sang pha màn hình.
 * Cần thiết khi tài xế vào lại 1 chuyến đang dang dở (app bị đóng/mở lại giữa chừng) — nếu cứ
 * mặc định "enroute_pickup" thì các API xác nhận tiếp theo sẽ bị backend từ chối vì sai trạng thái.
 * Không có status (chuyến giả lập không tripId) thì mặc định enroute_pickup.
 */
function mapStatusToPhase(status?: string): ActiveTripPhase {
  switch (status) {
    case 'in_progress':
      return 'on_trip';
    case 'awaiting_payment':
      return 'at_dropoff';
    case 'paid':
      return 'summary';
    case 'completed':
      return 'completed';
    // "requested" / "en_route" / "arrived" — chưa tới lúc đón khách, vẫn ở pha đến điểm đón.
    default:
      return 'enroute_pickup';
  }
}

/**
 * Điểm xuất phát dự phòng của tài xế = lệch khỏi điểm đón một đoạn.
 * Chỉ dùng khi chưa có GPS thực (vài khung hình đầu trước khi useLiveLocation trả về toạ độ).
 */
function fallbackDriverStart(pickup: [number, number]): [number, number] {
  return [pickup[0] - 0.018, pickup[1] - 0.01];
}

export function useActiveTrip(trip: ActiveTripData) {
  const [phase, setPhase] = useState<ActiveTripPhase>(() => mapStatusToPhase(trip.status));
  const [rating, setRating] = useState(0);
  const [leg, setLeg] = useState<LegInfo | null>(null);
  // Cước thực tế backend chốt sau khi báo đã đến điểm trả khách (POST /trips/{id}/arrived-destination).
  const [fareResult, setFareResult] = useState<ArrivedDestinationResult | null>(null);

  // Đồng hồ chờ (đếm ngược) chỉ chạy ở pha at_pickup / at_dropoff
  const [wait, setWait] = useState(WAIT_SECONDS);

  // Quãng đường/thời gian còn lại lấy từ event "eta" của backend — không tự tính ở front end nữa.
  // Chỉ nhận eta khớp với chặng đang hiển thị (pickup/dropoff), tránh dính dữ liệu chặng cũ.
  const handleEta = useCallback(
    (eta: TripEtaEvent) => {
      const expectedPhase = phase === 'enroute_pickup' ? 'pickup' : 'dropoff';
      if (eta.phase !== expectedPhase) return;
      setLeg({ distanceKm: eta.distanceKm, durationMin: eta.etaMinutes });
    },
    [phase]
  );
  useTripLiveEvents(handleEta);

  // Vị trí GPS thực của tài xế — dùng cho chặng đến điểm đón (cách bao xa / còn bao lâu là dữ liệu thật).
  const liveCoord = useLiveLocation();
  const fallbackStart = useMemo(() => fallbackDriverStart(trip.pickup.coord), [trip.pickup.coord]);
  const driverStart = liveCoord ?? fallbackStart;

  // Gọi ngầm POST /trips/{tripId}/arrived-pickup ngay khi GPS vào bán kính 500m quanh điểm đón
  // — backend dùng để xác minh tài xế thực sự tới gần, không phải hành động tài xế chủ động nên
  // chỉ gọi 1 lần/chuyến và bỏ qua nếu lỗi (không chặn luồng, không báo UI).
  const arrivedPickupSentRef = useRef(false);
  useEffect(() => {
    if (phase !== 'enroute_pickup' || !trip.tripId || !liveCoord) return;
    if (arrivedPickupSentRef.current) return;
    if (haversineKm(liveCoord, trip.pickup.coord) > ARRIVED_PICKUP_RADIUS_KM) return;

    arrivedPickupSentRef.current = true;
    const tripId = trip.tripId;
    arrivedPickup(tripId)
      .then(() => console.log(`[API] ✓ trips/${tripId}/arrived-pickup`))
      .catch((err) => console.log(`[API] ↷ trips/${tripId}/arrived-pickup bỏ qua lỗi:`, err));
  }, [phase, trip.tripId, trip.pickup.coord, liveCoord]);

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

  const advance = useCallback(() => {
    setPhase((p) => NEXT[p]);
  }, []);

  const { mutate: pickUpPassenger, isPending: pickingUp } = usePickUpPassenger();
  const { mutate: arrivedDestination, isPending: arrivingDestination } = useArrivedDestination();
  const { mutate: confirmPayment, isPending: confirmingPayment } = useConfirmPayment();
  const confirming = pickingUp || arrivingDestination || confirmingPayment;

  // Giữ lại leg gần nhất của chặng chở khách (leg bị reset null khi rời pha bản đồ) —
  // dùng làm distanceKm gửi lên khi báo đã đến điểm trả khách.
  const lastLegRef = useRef<LegInfo | null>(null);
  useEffect(() => {
    if (leg) lastLegRef.current = leg;
  }, [leg]);

  // Nút hành động chính: pha nào cần báo backend thì gọi API xong mới chuyển pha,
  // pha còn lại (hoặc chuyến giả lập không có tripId) chỉ chuyển pha cục bộ.
  const primaryAction = useCallback(() => {
    if (confirming) return; // chặn double-tap khi đang chờ API

    // "Khách đã lên xe" → POST /trips/{tripId}/picked-up
    if (phase === 'enroute_pickup' && trip.tripId) {
      const tripId = trip.tripId;
      pickUpPassenger(tripId, {
        onSuccess: () => {
          console.log(`[API] ✓ trips/${tripId}/picked-up`);
          advance();
        },
        onError: (err) => {
          console.log(`[API] ✗ trips/${tripId}/picked-up thất bại: ${err.message}`);
          Alert.alert('Không xác nhận được', err.message);
        },
      });
      return;
    }

    // "Đã đến nơi" → POST /trips/{tripId}/arrived-destination — backend chốt cước thực tế.
    if (phase === 'on_trip' && trip.tripId) {
      const tripId = trip.tripId;
      const distanceKm = leg?.distanceKm ?? lastLegRef.current?.distanceKm ?? trip.dropoff.distanceKm;
      arrivedDestination(
        { tripId, distanceKm },
        {
          onSuccess: (res) => {
            console.log(`[API] ✓ trips/${tripId}/arrived-destination — response:`, JSON.stringify(res));
            setFareResult(res);
            advance();
          },
          onError: (err) => {
            console.log(`[API] ✗ trips/${tripId}/arrived-destination thất bại: ${err.message}`);
            Alert.alert('Không xác nhận được', err.message);
          },
        }
      );
      return;
    }

    // "Khách đã thanh toán" → POST /trips/{tripId}/confirm-payment
    if (phase === 'at_dropoff' && trip.tripId) {
      const tripId = trip.tripId;
      confirmPayment(
        { tripId, paymentMethod: toPaymentMethod(trip.payment) },
        {
          onSuccess: () => {
            console.log(`[API] ✓ trips/${tripId}/confirm-payment`);
            advance();
          },
          onError: (err) => {
            console.log(`[API] ✗ trips/${tripId}/confirm-payment thất bại: ${err.message}`);
            Alert.alert('Không xác nhận được', err.message);
          },
        }
      );
      return;
    }

    advance();
  }, [
    confirming,
    phase,
    trip.tripId,
    trip.dropoff.distanceKm,
    trip.payment,
    leg,
    pickUpPassenger,
    arrivedDestination,
    confirmPayment,
    advance,
  ]);

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
    wait,
    advance,
    primaryAction,
    confirming,
    mapLeg,
    fareResult,
    // Vị trí xe hiển thị trên bản đồ ở chặng đến điểm đón — GPS thực khi có, không animate giả lập nữa.
    driverCoord: isPickupLeg ? driverStart : undefined,
  };
}
