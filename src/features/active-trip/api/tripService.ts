import { apiClient } from '@services/api/client';

// Gọi ngầm khi tài xế vào bán kính ~500m quanh điểm đón — backend dùng để xác minh vị trí
// thực tế, chống tài xế báo đón khách khi còn ở xa. Không phải hành động của tài xế nên
// không chặn/không báo lỗi UI: response khác 200 thì bỏ qua, luồng chuyến vẫn tiếp tục bình thường.
export async function arrivedPickup(tripId: string): Promise<void> {
  await apiClient.post(`/trips/${tripId}/arrived-pickup`);
}

// Tài xế xác nhận khách đã lên xe tại điểm đón — chuyển pha "đang đến điểm đón" → "đang trên chuyến đi".
// Response 200 rỗng.
export async function pickUpPassenger(tripId: string): Promise<void> {
  await apiClient.post(`/trips/${tripId}/picked-up`);
}

// Cước thực tế backend chốt khi tài xế báo đã đến điểm trả khách.
export interface ArrivedDestinationResult {
  fareAmount: number;
  discountAmount: number;
  netFareAmount: number;
  currency: string;
}

// Tài xế xác nhận đã đến điểm đến — gửi quãng đường thực đã chạy để backend chốt cước.
export async function arrivedDestination(
  tripId: string,
  distanceKm: number,
): Promise<ArrivedDestinationResult> {
  const { data } = await apiClient.post<ArrivedDestinationResult>(
    `/trips/${tripId}/arrived-destination`,
    { distanceKm },
  );
  return data;
}

// Tài xế xác nhận khách đã thanh toán — chuyển pha "đã đến điểm đến" → "tổng kết chuyến đi".
// Response 200 rỗng.
export async function confirmPayment(tripId: string, paymentMethod: string): Promise<void> {
  await apiClient.post(`/trips/${tripId}/confirm-payment`, { paymentMethod });
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
