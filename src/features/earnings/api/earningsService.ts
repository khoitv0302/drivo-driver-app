import { apiClient } from '@services/api/client';
import type { EarningsPeriod, EarningsResponse } from '../types';

// Lấy thống kê thu nhập của tài xế theo kỳ (hôm nay / tuần / tháng).
export async function getEarnings(period: EarningsPeriod): Promise<EarningsResponse> {
  const { data } = await apiClient.get<EarningsResponse>('/drivers/me/earnings', {
    params: { period },
  });
  return data;
}
