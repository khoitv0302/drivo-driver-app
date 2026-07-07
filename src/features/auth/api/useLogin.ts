import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { login } from './authService';
import type { LoginPayload, LoginResponse } from '../types';

// Hook đăng nhập bằng SĐT + mật khẩu. Dùng: const { mutate, isPending } = useLogin();
export function useLogin() {
  return useMutation<LoginResponse, ApiError, LoginPayload>({
    mutationFn: login,
  });
}
