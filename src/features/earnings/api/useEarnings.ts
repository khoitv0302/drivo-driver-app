import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import type { EarningsPeriod, EarningsResponse } from '../types';
import { getEarnings } from './earningsService';

// Query thống kê thu nhập theo kỳ. Đổi period → tự fetch lại nhờ queryKey.
export function useEarnings(period: EarningsPeriod) {
  return useQuery<EarningsResponse, ApiError>({
    queryKey: ['earnings', period],
    queryFn: () => getEarnings(period),
    staleTime: 60_000,
  });
}
