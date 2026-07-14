import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { pickUpPassenger } from './tripService';

// Mutation xác nhận khách đã lên xe. Dùng: const { mutate, isPending } = usePickUpPassenger();
export function usePickUpPassenger() {
  return useMutation<void, ApiError, string>({
    mutationFn: pickUpPassenger,
  });
}
