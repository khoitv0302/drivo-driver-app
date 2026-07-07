import { apiClient } from '@services/api/client';
import type { LoginPayload, LoginResponse } from '../types';

// Đăng nhập bằng SĐT + mật khẩu. Trả về session (accessToken, refreshToken, roles, ...);
// sai thông tin → interceptor ném ApiError.
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}
