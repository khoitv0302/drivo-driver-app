export { sendLocationHeartbeat } from './locationHeartbeat';

export type { LocationFix } from './backgroundLocationTask';

export {
  LOCATION_TASK_NAME,
  getLatestBackgroundFix,
  startBackgroundLocation,
  stopBackgroundLocation,
  isBackgroundLocationRunning,
  requestBackgroundLocationPermission,
} from './backgroundLocationTask';

export type { LocationHeartbeatPayload } from './types';
