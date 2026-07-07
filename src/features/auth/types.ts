import type { AuthSession } from '@store/auth.store';

// Các endpoint đăng nhập (login mật khẩu, refresh) trả về CÙNG một shape phiên.
// Dùng chung AuthSession làm kiểu chuẩn để khỏi khai báo trùng.
export type AuthSessionResponse = AuthSession;

// POST /auth/login — đăng nhập bằng SĐT + mật khẩu
export interface LoginPayload {
  /** SĐT chuẩn E.164, vd "+84912345678" */
  phone: string;
  password: string;
}

export type LoginResponse = AuthSessionResponse;
