export const MAPBOX_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

// Base URL của backend Drivo. Mọi request qua services/api/client.ts đều nối vào đây.
export const API_URL = 'http://dev-api.160-250-5-174.sslip.io:8080/api';

// Timeout mặc định cho mỗi request (ms)
export const API_TIMEOUT = 15000;

// SignalR hub cho tài xế — cùng host với API nhưng không có prefix /api.
export const DRIVER_HUB_URL = `${API_URL.replace(/\/api$/, '')}/hubs/driver`;

// Loại xe gửi kèm mỗi nhịp vị trí — backend dùng làm key cho set geo:online:{vehicleType}.
// Tạm hardcode; sau này lấy từ hồ sơ tài xế. Dùng chung cho cả kênh SignalR lẫn task nền.
export const VEHICLE_TYPE = 'car_auto';

// Lấy key tại: https://console.cloud.google.com → bật "Places API"
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
