import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Trạng thái "mở nhận chuyến" của tài xế — client-only state, đúng phạm vi Zustand.
//
// Vì sao phải nằm ở store chứ không phải useState trong HomeScreen: task vị trí nền
// (services/location/backgroundLocationTask.ts) chạy NGOÀI cây React, không hook nào với tới
// được. Nó cần biết tài xế còn đang mở nhận chuyến hay không trước khi gửi vị trí lên server.
//
// Vì sao phải persist: đăng ký location updates do OS giữ, sống lâu hơn tiến trình app.
// iOS/Android có thể kill app rồi khởi động lại nó ở chế độ nền chỉ để chạy task. Lúc đó
// state trong RAM đã mất sạch — không persist thì task thức dậy mà không biết mình nên làm gì.

interface DriverState {
  online: boolean;
  _hasHydrated: boolean;
  setOnline: (online: boolean) => void;
  toggleOnline: () => void;
}

export const useDriverStore = create<DriverState>()(
  persist(
    (set) => ({
      online: false,
      _hasHydrated: false,
      setOnline: (online) => set({ online }),
      toggleOnline: () => set((s) => ({ online: !s.online })),
    }),
    {
      name: 'drivo-driver-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ online: state.online }),
      onRehydrateStorage: () => () => {
        useDriverStore.setState({ _hasHydrated: true });
      },
    },
  ),
);

// Đọc trạng thái online từ ngoài React (task nền). Trả về giá trị đã chắc chắn nạp xong
// từ AsyncStorage — task có thể chạy trước khi zustand kịp hydrate, lúc đó online trong RAM
// vẫn là false mặc định và sẽ khiến task bỏ nhịp oan.
export async function isDriverOnline(): Promise<boolean> {
  const state = useDriverStore.getState();
  if (state._hasHydrated) return state.online;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(useDriverStore.getState().online);
    }, 3000);

    const unsubscribe = useDriverStore.subscribe((s) => {
      if (!s._hasHydrated) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(s.online);
    });
  });
}
