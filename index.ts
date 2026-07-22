import { registerRootComponent } from 'expo';

import App from './App';
import { registerBackgroundMessageHandler } from './src/services/push';
// Import vì SIDE EFFECT: module này gọi TaskManager.defineTask ở global scope. Khi OS đánh thức
// app ở nền để giao vị trí, nó dựng JS runtime lên mà KHÔNG mount cây React — task phải được
// đăng ký ngay lúc bundle chạy, nếu không OS sẽ không tìm thấy handler nào để gọi.
import './src/services/location/backgroundLocationTask';

// Bắt buộc gọi ở top-level, TRƯỚC registerRootComponent — react-native-firebase cần handler
// này đăng ký ngoài cây React để headless task (Android) xử lý được message lúc app nền/tắt.
registerBackgroundMessageHandler();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
