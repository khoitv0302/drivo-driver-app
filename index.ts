import { registerRootComponent } from 'expo';

import App from './App';
import { registerBackgroundMessageHandler } from './src/services/push';

// Bắt buộc gọi ở top-level, TRƯỚC registerRootComponent — react-native-firebase cần handler
// này đăng ký ngoài cây React để headless task (Android) xử lý được message lúc app nền/tắt.
registerBackgroundMessageHandler();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
