import type { IncomingTrip } from './components/IncomingTripCard';

// Payload event "offer" từ /hubs/driver.
export interface TripOfferBooking {
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  pickupDistanceMeters: number;
  tripDistanceMeters: number;
  vehicleType: string;
  bookingType: string;
  fareAmount: number;
  paymentMethod: string;
}

export interface TripOfferCustomer {
  fullName: string;
  avatarUrl: string | null;
  rating: number | null;
}

export interface TripOffer {
  offerId: string;
  bookingId: string;
  etaSeconds: number;
  expiresInSeconds: number;
  booking: TripOfferBooking;
  customer: TripOfferCustomer;
}

// Chuyến mời đang chờ tài xế phản hồi trên HomeScreen.
export interface ActiveOffer {
  offerId: string;
  bookingId: string;
  trip: IncomingTrip;
  // phone chỉ có sau khi trip được xác nhận qua GET /trips/me/current (offer chưa có).
  customer: { name: string; rating: number; phone?: string };
}

// Narrow unknown → TripOffer. Chỉ bắt buộc các field cần để render card.
export function parseTripOffer(payload: unknown): TripOffer | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.offerId !== 'string' || typeof p.bookingId !== 'string') return null;
  if (typeof p.booking !== 'object' || p.booking === null) return null;
  const b = p.booking as Record<string, unknown>;
  const requiredNumbers = ['pickupLat', 'pickupLng', 'dropoffLat', 'dropoffLng'];
  if (!requiredNumbers.every((k) => typeof b[k] === 'number')) return null;
  if (typeof p.customer !== 'object' || p.customer === null) return null;
  if (typeof (p.customer as Record<string, unknown>).fullName !== 'string') return null;
  return p as unknown as TripOffer;
}

// Khách/tài xế đối diện trong chuyến — trả về từ GET /trips/me/current.
export interface CurrentTripCounterparty {
  fullName: string;
  avatarUrl: string | null;
  rating: number | null;
  phone: string;
}

// Chuyến hiện tại của tài xế — response của GET /trips/me/current?as=driver.
// Poll bằng useWaitForTrip ngay sau khi accept offer tới khi backend lưu xong.
export interface CurrentTrip {
  tripId: string;
  bookingId: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  /** null tới khi chuyến hoàn tất/chốt cước — vd còn "en_route" thì chưa có giá */
  fareAmount: number | null;
  /** null tới khi khách chọn thanh toán */
  paymentMethod: string | null;
  counterparty: CurrentTripCounterparty;
}

export interface CurrentTripResponse {
  trip: CurrentTrip;
}

// Nhãn phương thức thanh toán hiển thị trên card — cùng quy ước với features/trips/components/TripCard.
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  wallet: 'Ví Drivo',
  card: 'Thẻ',
};

// Map offer từ backend → dữ liệu card IncomingTripCard.
// Khoảng cách lấy thẳng từ backend (pickupDistanceMeters/tripDistanceMeters) — dispatch
// đã tính theo vị trí tài xế được offer, không cần haversine lại ở client.
export function offerToIncomingTrip(offer: TripOffer): IncomingTrip {
  const { booking } = offer;
  return {
    pickup: {
      name: booking.pickupAddress,
      distanceKm: booking.pickupDistanceMeters / 1000,
      coord: [booking.pickupLng, booking.pickupLat],
    },
    dropoff: {
      name: booking.dropoffAddress,
      distanceKm: booking.tripDistanceMeters / 1000,
      coord: [booking.dropoffLng, booking.dropoffLat],
    },
    income: booking.fareAmount,
    payment: PAYMENT_LABELS[booking.paymentMethod] ?? booking.paymentMethod,
  };
}
