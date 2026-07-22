import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// Vòng đời foreground/background của app. Dùng để quyết định kênh gửi vị trí
// (xem features/home/hooks/useLocationBeacon.ts) — AppState là tín hiệu đáng tin duy nhất
// ở thời điểm app vào nền, vì trạng thái của SignalR lúc đó còn nói dối tới 60s
// (OS giết TCP socket nhưng client chỉ phát hiện sau serverTimeoutInMilliseconds).

export type AppLifecycle = {
  /** Giá trị thô của AppState — giữ nguyên cả 'inactive' để log cho đúng */
  state: AppStateStatus;
  /** CHỈ true khi thật sự ở nền. 'inactive' không tính (xem lý do bên dưới). */
  isBackground: boolean;
  /** Mốc thời gian bắt đầu vào nền, null khi đang ở foreground */
  backgroundedAt: number | null;
};

function snapshot(state: AppStateStatus): AppLifecycle {
  const isBackground = state === 'background';
  return { state, isBackground, backgroundedAt: isBackground ? Date.now() : null };
}

export function useAppState(): AppLifecycle {
  const [lifecycle, setLifecycle] = useState<AppLifecycle>(() => snapshot(AppState.currentState));

  // Ref để listener đọc được giá trị trước đó mà không cần đăng ký lại mỗi lần đổi state.
  const prevRef = useRef(lifecycle);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = prevRef.current;
      if (next === prev.state) return;

      let updated: AppLifecycle;

      if (next === 'inactive') {
        // iOS bắn 'inactive' khi kéo Control Center, mở app switcher, có cuộc gọi đến —
        // và cả trên đường active↔background. Coi nó là nền sẽ khiến kênh gửi nhảy
        // qua nhịp liên tục, nên chỉ ghi nhận state thô, giữ nguyên isBackground.
        // Không log: đây là trạng thái quá độ, không đổi gì cả — log chỉ thêm nhiễu.
        updated = { ...prev, state: next };
      } else if (next === 'background') {
        updated = {
          state: next,
          isBackground: true,
          backgroundedAt: prev.backgroundedAt ?? Date.now(),
        };
        console.log('[APP] → background');
      } else {
        // 'active' (và các giá trị lạ của Android như 'unknown') đều tính là foreground.
        const seconds = prev.backgroundedAt
          ? Math.round((Date.now() - prev.backgroundedAt) / 1000)
          : null;
        updated = { state: next, isBackground: false, backgroundedAt: null };
        console.log(seconds !== null ? `[APP] → active (nền ${seconds}s)` : `[APP] → ${next}`);
      }

      prevRef.current = updated;
      setLifecycle(updated);
    });

    return () => sub.remove();
  }, []);

  return lifecycle;
}
