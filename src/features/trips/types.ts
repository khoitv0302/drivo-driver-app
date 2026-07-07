export type TripStatus = 'completed' | 'cancelled';
export type ServiceType = 'car' | 'motorbike';
export type PaymentMethod = 'cash' | 'wallet' | 'card';

export interface DriverTrip {
  id: string;
  status: TripStatus;
  date: string;
  time: string;
  from: string;
  to: string;
  /** Thu nhập tài xế nhận được cho chuyến */
  earning: number;
  distance: string;
  duration: string;
  passengerName: string;
  /** Đánh giá khách chấm cho tài xế (nếu có) */
  passengerRating?: number;
  serviceType: ServiceType;
  payment: PaymentMethod;
}
