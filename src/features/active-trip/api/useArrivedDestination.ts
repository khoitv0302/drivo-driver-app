import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { arrivedDestination, type ArrivedDestinationResult } from './tripService';

interface ArrivedDestinationVars {
  tripId: string;
  distanceKm: number;
}

// Mutation báo đã đến điểm trả khách — trả về cước thực tế backend vừa chốt.
// Dùng: const { mutate, isPending } = useArrivedDestination();
export function useArrivedDestination() {
  return useMutation<ArrivedDestinationResult, ApiError, ArrivedDestinationVars>({
    mutationFn: ({ tripId, distanceKm }) => arrivedDestination(tripId, distanceKm),
  });
}
