import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { completeTrip, type CompleteTripPayload } from './tripService';

interface CompleteTripVars {
  tripId: string;
  payload: CompleteTripPayload;
}

// Mutation hoàn thành chuyến. Dùng: const { mutate, isPending } = useCompleteTrip();
export function useCompleteTrip() {
  return useMutation<unknown, ApiError, CompleteTripVars>({
    mutationFn: ({ tripId, payload }) => completeTrip(tripId, payload),
  });
}
