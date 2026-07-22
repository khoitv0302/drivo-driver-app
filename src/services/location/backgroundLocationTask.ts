import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { VEHICLE_TYPE } from '@constants/config';
import { ensureFreshAccessToken } from '@services/auth/tokenRefresh';
import { ApiError } from '@services/api/types';
import { isDriverOnline } from '@store/driver.store';
import { waitForAuthHydrated } from '@store/auth.store';
import { sendLocationHeartbeat, msSinceLastHeartbeat } from './locationHeartbeat';

// Task vị trí chạy nền — cách DUY NHẤT gửi được vị trí khi app không hiển thị.
//
// Bối cảnh: không có UIBackgroundModes, iOS đóng băng JS thread vài giây sau khi app vào nền,
// nên setInterval (useLocationBeacon) chết theo và chỉ kịp gửi đúng 1 nhịp — đã đo thực tế.
// Với background mode 'location', OS trở thành bên chủ động: mỗi khi thiết bị di chuyển đủ
// distanceInterval, OS tự đánh thức JS runtime, chạy executor bên dưới, rồi cho ngủ tiếp.
//
// Vì chạy NGOÀI cây React nên ở đây không có hook, không có context, không có state trong RAM
// đáng tin — mọi thứ cần biết đều phải đọc từ storage đã persist (xem isDriverOnline/waitForAuthHydrated).

export const LOCATION_TASK_NAME = 'drivo-driver-location';

// Quãng đường tối thiểu giữa 2 lần OS báo vị trí (mét). Nhỏ quá thì hao pin, lớn quá thì
// vị trí trên bản đồ khách thấy bị giật. 20m ~ vài giây chạy xe trong phố.
const DISTANCE_INTERVAL_M = 20;

// CHỈ Android tôn trọng mốc thời gian này. iOS không có núm vặn thời gian cho vị trí nền —
// CLLocationManager chỉ bắn theo sự kiện di chuyển, nên trên iOS đây là số vô nghĩa.
// Nhịp đều 5s ở nền do useLocationBeacon lo (tiến trình vẫn sống nhờ background mode).
const TIME_INTERVAL_MS = 5000;

// Task chỉ gửi khi nhịp 5s đã im lâu hơn ngưỡng này — tức tiến trình đã bị OS kill/đóng băng
// và task đang là nguồn duy nhất còn sống. Ngưỡng phải lớn hơn nhịp 5s để không cắt ngang
// một chu kỳ bình thường.
const STALE_HEARTBEAT_MS = 12_000;

type LocationTaskData = { locations?: Location.LocationObject[] };

// Vị trí tươi nhất do OS đẩy về. Ở nền, locationManager của Mapbox (nguồn toạ độ của
// HomeScreen) ngừng cập nhật, nên nhịp 5s sẽ gửi đi gửi lại một toạ độ đóng băng nếu không
// có cái này. OS vẫn đẩy vị trí đều qua task → dùng nó làm nguồn toạ độ khi app ở nền.
export type LocationFix = {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  /** Date.now() lúc nhận được từ OS — để bên đọc tự biết dữ liệu đã cũ hay chưa */
  at: number;
};

let latestFix: LocationFix | null = null;

export function getLatestBackgroundFix(): LocationFix | null {
  return latestFix;
}

function extractLatest(data: unknown): Location.LocationObject | null {
  if (typeof data !== 'object' || data === null) return null;
  const locations = (data as LocationTaskData).locations;
  if (!Array.isArray(locations) || locations.length === 0) return null;
  // OS có thể gom nhiều điểm rồi giao một lượt — chỉ điểm mới nhất là còn ý nghĩa.
  return locations[locations.length - 1] ?? null;
}

// PHẢI gọi ở global scope (yêu cầu của expo-task-manager): khi OS đánh thức app ở chế độ nền,
// nó dựng JS runtime lên và chạy task mà KHÔNG mount cây React nào — đăng ký trong useEffect
// sẽ không bao giờ chạy tới. Xem index.ts, nơi module này được import ở top-level.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log('[LOC:BG] ✗ OS báo lỗi task:', error.message);
    return;
  }

  const latest = extractLatest(data);
  if (!latest) return;

  // Ghi lại toạ độ TRƯỚC mọi nhánh return bên dưới: kể cả khi task không tự gửi, đây vẫn là
  // nguồn vị trí tươi duy nhất khi app ở nền (Mapbox locationManager đã ngừng cập nhật).
  // Nhịp 5s của useLocationBeacon đọc lại qua getLatestBackgroundFix().
  const c = latest.coords;
  // Log lần đầu tách riêng: đó là mốc xác nhận OS đã thật sự bắt đầu đẩy vị trí về app
  // (trước mốc này, nhịp 5s chỉ có toạ độ cache của Mapbox — xem nhãn [OS]/[cache]).
  if (__DEV__) {
    const label = latestFix === null ? '⇢ fix ĐẦU TIÊN từ OS' : '⇢ fix mới';
    console.log(`[LOC:BG] ${label} (${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)})`);
  }
  latestFix = {
    lat: c.latitude,
    lng: c.longitude,
    // Giá trị âm nghĩa là thiết bị chưa xác định được → quy về 0 cho backend khỏi phải đoán.
    heading: c.heading != null && c.heading >= 0 ? c.heading : 0,
    speed: c.speed != null && c.speed >= 0 ? c.speed : 0,
    at: Date.now(),
  };

  // App đang mở → useLocationBeacon đã gửi qua SignalR rồi, không gửi trùng.
  // Trong lần đánh thức ở nền, AppState.currentState là 'background'.
  if (AppState.currentState === 'active') return;

  // Nhịp 5s của useLocationBeacon vẫn đang chạy (tiến trình còn sống) → nhường nó, không gửi trùng.
  // Task chỉ ra tay khi nhịp đó đã tắt, tức OS đã kill/đóng băng tiến trình.
  if (msSinceLastHeartbeat() < STALE_HEARTBEAT_MS) return;

  // Tài xế đã tắt nhận chuyến → không gửi. Đăng ký location updates do OS giữ và sống lâu hơn
  // tiến trình app, nên vẫn có thể bị đánh thức sau khi người dùng đã tắt toggle.
  if (!(await isDriverOnline())) {
    console.log('[LOC:BG] ↷ bỏ nhịp — tài xế đã tắt nhận chuyến');
    return;
  }

  // App có thể vừa bị OS khởi động lại ở nền → store còn rỗng, phải chờ nạp xong phiên đăng nhập.
  await waitForAuthHydrated();
  const token = await ensureFreshAccessToken();
  if (!token) {
    console.log('[LOC:BG] ↷ bỏ nhịp — chưa đăng nhập / phiên đã hết hạn');
    return;
  }

  try {
    await sendLocationHeartbeat({
      lat: latestFix.lat,
      lng: latestFix.lng,
      vehicleType: VEHICLE_TYPE,
      heading: latestFix.heading,
      speed: latestFix.speed,
    });
    console.log(
      `[LOC:BG] ✓ nền (OS đánh thức) — heartbeat (${latestFix.lat.toFixed(5)}, ${latestFix.lng.toFixed(5)})`,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      console.log(`[LOC:BG] ✗ heartbeat ${err.status}: ${err.message}`);
    } else {
      console.log('[LOC:BG] ✗ heartbeat lỗi không xác định:', err);
    }
  }
});

// Xin quyền vị trí NỀN. Bắt buộc gọi khi app đang mở — iOS/Android không cho xin quyền từ nền.
// Phải xin foreground trước rồi mới tới background, đúng thứ tự OS yêu cầu.
export async function requestBackgroundLocationPermission(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    console.log('[LOC:BG] ✗ tài xế từ chối quyền vị trí — không thể gửi vị trí ở nền');
    return false;
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') {
    // iOS hay trả "When In Use" ở lần hỏi đầu; muốn "Always" thì người dùng phải tự vào Cài đặt.
    console.log(
      '[LOC:BG] ⚠ chưa có quyền vị trí "Luôn luôn" — app sẽ ngừng gửi vị trí khi tắt màn hình.\n' +
        '        → Cài đặt > Drivo > Vị trí > chọn "Luôn luôn".',
    );
    return false;
  }

  return true;
}

// Bật nhận vị trí nền. Idempotent: gọi khi đang chạy sẽ không đăng ký chồng.
// Trả về true nếu task đang chạy sau lời gọi này.
export async function startBackgroundLocation(): Promise<boolean> {
  // Đăng ký do OS giữ và sống qua các lần khởi động app — lần chạy sau thường rơi vào nhánh này,
  // nên phải log, nếu không sẽ tưởng nhầm là chưa bật bao giờ.
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
    console.log('[LOC:BG] ▶ vị trí nền đã đăng ký sẵn từ phiên trước — dùng lại');
    return true;
  }

  if (!(await requestBackgroundLocationPermission())) return false;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    distanceInterval: DISTANCE_INTERVAL_M,
    timeInterval: TIME_INTERVAL_MS,
    // iOS mặc định tự tạm dừng cập nhật khi đoán là người dùng đứng yên — với tài xế đang chờ
    // khách ở lề đường thì đó là mất tích khỏi hệ thống ghép chuyến.
    pausesUpdatesAutomatically: false,
    // Báo iOS đây là di chuyển bằng ô tô → chọn chiến lược GPS phù hợp, đỡ hao pin.
    activityType: Location.ActivityType.AutomotiveNavigation,
    // Thanh xanh trên status bar khi đang lấy vị trí nền. Cố ý bật: minh bạch với tài xế,
    // và cũng là cách nhanh nhất để biết task có thật sự đang chạy khi test.
    showsBackgroundLocationIndicator: true,
    // Android bắt buộc foreground service + notification thường trực mới được lấy vị trí nền.
    foregroundService: {
      notificationTitle: 'Drivo đang mở nhận chuyến',
      notificationBody: 'Đang chia sẻ vị trí để hệ thống ghép chuyến gần bạn nhất.',
      notificationColor: '#2563EB',
    },
  });

  console.log(
    `[LOC:BG] ▶ đã bật gửi vị trí nền (mỗi ${DISTANCE_INTERVAL_M}m di chuyển, OS chủ động đánh thức)`,
  );
  return true;
}

export async function stopBackgroundLocation(): Promise<void> {
  if (!(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME))) return;
  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  console.log('[LOC:BG] ⏹ đã tắt gửi vị trí nền');
}

export async function isBackgroundLocationRunning(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}
