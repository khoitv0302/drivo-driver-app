import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { declineOffer } from './dispatchService';

// Mutation từ chối chuyến mời. Dùng: const { mutate } = useDeclineOffer();
export function useDeclineOffer() {
  return useMutation<unknown, ApiError, string>({
    mutationFn: declineOffer,
  });
}
