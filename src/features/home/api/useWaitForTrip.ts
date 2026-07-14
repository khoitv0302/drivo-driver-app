import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import type { CurrentTripResponse } from '../types';
import { getCurrentTrip } from './dispatchService';

export const TRIP_POLL_MAX_ATTEMPTS = 10;
const TRIP_POLL_INTERVAL_MS = 2000;

// Sau khi accept offer, backend lưu chuyến bất đồng bộ — không biết lưu xong lúc nào.
// Poll GET /trips/me/current?as=driver tối đa TRIP_POLL_MAX_ATTEMPTS lần, cách nhau
// TRIP_POLL_INTERVAL_MS, tới khi thấy chuyến (thành công) hoặc hết lượt thử (isError).
// bookingId chỉ dùng làm khoá/điều kiện bật query — endpoint không nhận id.
export function useWaitForTrip(bookingId: string | null) {
  return useQuery<CurrentTripResponse, ApiError>({
    queryKey: ['trip-ready', bookingId],
    queryFn: getCurrentTrip,
    enabled: !!bookingId,
    retry: TRIP_POLL_MAX_ATTEMPTS - 1,
    retryDelay: TRIP_POLL_INTERVAL_MS,
    staleTime: Infinity,
    gcTime: 0,
  });
}
