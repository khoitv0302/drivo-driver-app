import { apiClient } from '@services/api/client';
import { ApiError } from '@services/api/types';
import type { CurrentTripResponse } from '../types';

// Tài xế chấp nhận chuyến mời. offerId lấy từ payload event "offer" của hub.
// Response shape chưa chốt với backend → unknown; điều hướng dùng dữ liệu offer đã có sẵn.
export async function acceptOffer(offerId: string): Promise<unknown> {
  const { data } = await apiClient.post<unknown>(`/dispatch/offers/${offerId}/accept`, {});
  return data;
}

// Tài xế từ chối chuyến mời — backend chuyển offer cho tài xế khác.
export async function declineOffer(offerId: string): Promise<unknown> {
  const { data } = await apiClient.post<unknown>(`/dispatch/offers/${offerId}/decline`, {});
  return data;
}

// Lấy chuyến hiện tại của tài xế sau khi accept. Backend lưu chuyến bất đồng bộ nên gọi ngay
// sau accept có thể trả 200 với trip: null (chưa lưu xong) — coi như lỗi để useWaitForTrip retry.
export async function getCurrentTrip(): Promise<CurrentTripResponse> {
  const { data } = await apiClient.get<CurrentTripResponse>('/trips/me/current', {
    params: { as: 'driver' },
  });
  if (__DEV__) {
    console.log('[API] GET /trips/me/current response:', JSON.stringify(data));
  }
  if (!data.trip) {
    throw new ApiError('Chuyến chưa được lưu xong', 404);
  }
  return data;
}
