import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { confirmPayment } from './tripService';

interface ConfirmPaymentVars {
  tripId: string;
  paymentMethod: string;
}

// Mutation xác nhận khách đã thanh toán. Dùng: const { mutate, isPending } = useConfirmPayment();
export function useConfirmPayment() {
  return useMutation<void, ApiError, ConfirmPaymentVars>({
    mutationFn: ({ tripId, paymentMethod }) => confirmPayment(tripId, paymentMethod),
  });
}
