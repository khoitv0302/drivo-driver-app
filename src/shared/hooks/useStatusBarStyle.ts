import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle, type StatusBarStyle } from 'expo-status-bar';

/**
 * Đặt màu chữ status bar (giờ, wifi, pin) mỗi khi màn được focus.
 * Cần thiết trong bottom-tab vì các screen được mount sẵn nên
 * component <StatusBar> không tự áp lại khi chuyển tab.
 *
 * 'dark' = chữ đen (nền sáng), 'light' = chữ trắng (nền tối).
 */
export function useStatusBarStyle(style: StatusBarStyle) {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style);
    }, [style])
  );
}
