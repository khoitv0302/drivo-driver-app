import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { logoutAll } from '@services/auth/authApi';
import { useAuthStore } from '@store/auth.store';

// Đăng xuất: thu hồi phiên ở server rồi dọn sạch trạng thái cục bộ.
// Dù API thành công hay thất bại (mất mạng, token đã hết hạn) vẫn xoá token + cache
// để người dùng chắc chắn thoát ra — clearToken cũng xoá refresh token khỏi SecureStore.
export function useLogout() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: logoutAll,
    onSettled: () => {
      useAuthStore.getState().clearToken();
      qc.clear(); // bỏ toàn bộ server state đã cache của người dùng cũ
    },
  });
}
