import { haversineKm } from '@shared/utils/geo';
import type { IncomingTrip } from './components/IncomingTripCard';

// Payload event "offer" từ /hubs/driver — cùng shape với booking trả về từ POST /api/bookings.
export interface TripOffer {
  /** Id của offer trong hệ dispatch — dùng cho POST /dispatch/offers/{offerId}/accept.
   *  Optional vì chưa chốt contract; thiếu thì fallback bookingId. */
  offerId?: string;
  bookingId: string;
  customerId: string;
  type: string;
  status: string;
  vehicleType: string;
  requiredSkills: string[];
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  estFareMin: number;
  estFareMax: number;
}

// Chuyến mời đang chờ tài xế phản hồi trên HomeScreen.
// offerId = null khi là chuyến giả lập (nút "Giả lập chuyến") → không gọi API accept.
export interface ActiveOffer {
  offerId: string | null;
  bookingId: string | null;
  trip: IncomingTrip;
}

// Narrow unknown → TripOffer. Chỉ bắt buộc các field cần để render card;
// field thiếu kiểu số khác (giá...) được xử lý mềm ở offerToIncomingTrip.
export function parseTripOffer(payload: unknown): TripOffer | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.bookingId !== 'string') return null;
  const requiredNumbers = ['pickupLat', 'pickupLng', 'dropoffLat', 'dropoffLng'];
  if (!requiredNumbers.every((k) => typeof p[k] === 'number')) return null;
  return p as unknown as TripOffer;
}

// Mò tripId từ response accept offer (shape chưa chốt) — chấp nhận các tên field phổ biến.
export function extractTripId(res: unknown): string | undefined {
  if (typeof res !== 'object' || res === null) return undefined;
  const r = res as Record<string, unknown>;
  if (typeof r.tripId === 'string') return r.tripId;
  if (typeof r.id === 'string') return r.id;
  if (typeof r.trip === 'object' && r.trip !== null) {
    const t = r.trip as Record<string, unknown>;
    if (typeof t.tripId === 'string') return t.tripId;
    if (typeof t.id === 'string') return t.id;
  }
  return undefined;
}

// Map offer từ backend → dữ liệu card IncomingTripCard.
// driverCoord: vị trí hiện tại của tài xế [lng, lat] — tính khoảng cách tới điểm đón.
export function offerToIncomingTrip(offer: TripOffer, driverCoord: [number, number]): IncomingTrip {
  const pickupCoord: [number, number] = [offer.pickupLng, offer.pickupLat];
  const dropoffCoord: [number, number] = [offer.dropoffLng, offer.dropoffLat];

  // Backend chưa gửi địa chỉ chữ → tạm dùng nhãn cố định; TODO: reverse-geocode hoặc chờ API bổ sung.
  return {
    pickup: {
      name: 'Điểm đón khách',
      distanceKm: haversineKm(driverCoord, pickupCoord),
      coord: pickupCoord,
    },
    dropoff: {
      name: 'Điểm trả khách',
      distanceKm: haversineKm(pickupCoord, dropoffCoord),
      coord: dropoffCoord,
    },
    // Card chỉ hiển thị 1 con số → lấy trung điểm khoảng giá ước tính.
    income: Math.round(((offer.estFareMin ?? 0) + (offer.estFareMax ?? offer.estFareMin ?? 0)) / 2),
    // Backend chưa gửi hình thức thanh toán → mặc định tiền mặt.
    payment: 'Tiền mặt',
  };
}
