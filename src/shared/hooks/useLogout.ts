import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { logoutAll } from '@services/auth/authApi';
import { useAuthStore } from '@store/auth.store';
import { deleteDeviceInstallation } from '@services/push';
import { peekInstallationId } from '@services/storage/installationStorage';

// Đăng xuất: thu hồi phiên ở server rồi dọn sạch trạng thái cục bộ.
// Dù API thành công hay thất bại (mất mạng, token đã hết hạn) vẫn xoá token + cache
// để người dùng chắc chắn thoát ra — clearToken cũng xoá refresh token khỏi SecureStore.
export function useLogout() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      // THỨ TỰ QUAN TRỌNG: gỡ installation trước, thu hồi phiên sau. logoutAll() thu hồi TẤT CẢ
      // phiên ở server, nên nếu gọi DELETE sau nó thì access token đã chết → 401 → interceptor
      // thử refresh → refresh token cũng đã bị thu hồi → fail, và máy sẽ tiếp tục nhận push của
      // tài xế vừa thoát. Best-effort: máy chưa từng đăng ký push, hoặc mất mạng, thì bỏ qua
      // chứ không chặn đăng xuất.
      try {
        const installationId = await peekInstallationId();
        if (installationId) await deleteDeviceInstallation(installationId);
      } catch {
        // ignore — logout vẫn phải xong dù gỡ installation thất bại
      }
      await logoutAll();
    },
    onSettled: () => {
      useAuthStore.getState().clearToken();
      qc.clear(); // bỏ toàn bộ server state đã cache của người dùng cũ
    },
  });
}
