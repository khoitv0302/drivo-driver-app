export {
  requestPushPermission,
  getDevicePushToken,
  onPushTokenRotated,
  onNotificationReceived,
  onRemoteNotificationTapped,
  getInitialRemoteNotification,
  registerBackgroundMessageHandler,
} from './pushNotifications';

export { registerDeviceInstallation, deleteDeviceInstallation } from './deviceInstallation';

export type { PushPlatform, DeviceInstallationPayload } from './types';
