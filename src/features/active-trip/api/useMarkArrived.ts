import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { markArrived } from './tripService';

// Mutation xác nhận khách đã lên xe. Dùng: const { mutate, isPending } = useMarkArrived();
export function useMarkArrived() {
  return useMutation<unknown, ApiError, string>({
    mutationFn: markArrived,
  });
}
