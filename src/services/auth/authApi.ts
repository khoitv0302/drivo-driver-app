import { apiClient } from '@services/api/client';

// Lời gọi auth cấp phiên (session), tách khỏi feature auth để mọi nơi (vd màn Account
// thuộc feature account) đăng xuất được mà không phải import chéo feature.

// POST /auth/logout/all — thu hồi TẤT CẢ phiên của người dùng ở server (mọi thiết bị).
// Không cần body; interceptor tự đính Bearer token.
export async function logoutAll(): Promise<void> {
  await apiClient.post('/auth/logout/all');
}
