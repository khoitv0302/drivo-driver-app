import { apiClient } from '@services/api/client';

// Tài xế xác nhận khách đã lên xe tại điểm đón.
// Response shape chưa chốt với backend → unknown; UI chỉ cần biết thành công/thất bại.
export async function markArrived(tripId: string): Promise<unknown> {
  const { data } = await apiClient.post<unknown>(`/trips/${tripId}/arrived`);
  return data;
}

// Số liệu chốt chuyến gửi lên khi hoàn thành.
export interface CompleteTripPayload {
  distanceKm: number;
  durationMin: number;
  /** Mã phương thức thanh toán backend hiểu, vd "cash" */
  paymentMethod: string;
}

// Tài xế hoàn thành chuyến (sau khi khách thanh toán, kéo "hoàn thành chuyến đi").
export async function completeTrip(tripId: string, payload: CompleteTripPayload): Promise<unknown> {
  const { data } = await apiClient.post<unknown>(`/trips/${tripId}/complete`, payload);
  return data;
}
