import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { acceptOffer } from './dispatchService';

// Mutation chấp nhận chuyến mời. Dùng: const { mutate, isPending } = useAcceptOffer();
export function useAcceptOffer() {
  return useMutation<unknown, ApiError, string>({
    mutationFn: acceptOffer,
  });
}
