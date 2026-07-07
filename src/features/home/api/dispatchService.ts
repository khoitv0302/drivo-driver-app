import { apiClient } from '@services/api/client';

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
