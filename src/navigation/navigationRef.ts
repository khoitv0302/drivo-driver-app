import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Ref cấp module — cho phép điều hướng từ ngoài cây React (vd: handler bấm push notification
// trong services/push, chạy trước khi component nào kịp mount). Gắn vào NavigationContainer
// trong App.tsx qua prop `ref`.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
