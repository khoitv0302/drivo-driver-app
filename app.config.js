const fs = require('fs');
const path = require('path');

// google-services.json / GoogleService-Info.plist chưa được cấp (Firebase project cho FCM) —
// chỉ gắn khi file thực sự tồn tại, để `expo run:android`/`expo run:ios`/prebuild KHÔNG vỡ với
// những máy chưa có file này. Tải từ Firebase Console → Project settings → app Android/iOS
// (package/bundle id com.thanhtv62929.drivodriverapp) → bỏ vào gốc repo, không cần sửa gì thêm.
const GOOGLE_SERVICES_FILE = './google-services.json';
const hasGoogleServicesFile = fs.existsSync(path.join(__dirname, GOOGLE_SERVICES_FILE));

const GOOGLE_SERVICE_INFO_PLIST = './src/secrets/GoogleService-Info.plist';
const hasGoogleServiceInfoPlist = fs.existsSync(path.join(__dirname, GOOGLE_SERVICE_INFO_PLIST));

// Plugin @react-native-firebase/app KHÔNG tự bỏ qua khi thiếu google-services.json/
// GoogleService-Info.plist — nó fail cứng ngay ở bước prebuild ("Path to GoogleService-Info.plist
// is not defined"), khác với các plugin Expo khác. Nên phải tự loại nó (+ /messaging +
// expo-build-properties chỉ tồn tại để phục vụ nó) ra khỏi mảng plugins khi CẢ 2 file đều chưa
// có — còn chỉ cần 1 platform (vd tạm thời chỉ làm iOS) thì vẫn bật plugin, EAS build platform
// nào thiếu file của platform đó thì tự fail đúng lúc build platform đó, không ảnh hưởng platform kia.
const hasFirebaseConfig = hasGoogleServicesFile || hasGoogleServiceInfoPlist;

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'drivo-driver-app',
  slug: 'drivo-driver-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.thanhtv62929.drivodriverapp',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        'Drivo cần truy cập vị trí để xác định vị trí của bạn và tìm chuyến gần bạn.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Drivo cần truy cập vị trí để tài khách hàng theo dõi hành trình khi bạn đang chở khách.',
      // Bắt buộc để iOS đánh thức JS gửi vị trí khi app ở nền/khoá màn hình. Thiếu key này,
      // iOS suspend JS trong vài giây sau khi vào nền → setInterval ngừng chạy → mất vị trí
      // (đã đo được thực tế: chỉ gửi được đúng 1 nhịp rồi im).
      UIBackgroundModes: ['location'],
      NSAppTransportSecurity: {
        NSExceptionDomains: {
          'sslip.io': {
            NSIncludesSubdomains: true,
            NSExceptionAllowsInsecureHTTPLoads: true,
          },
        },
      },
      LSApplicationQueriesSchemes: ['comgooglemaps'],
    },
    ...(hasGoogleServiceInfoPlist ? { googleServicesFile: GOOGLE_SERVICE_INFO_PLIST } : {}),
  },
  android: {
    usesCleartextTraffic: true,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    softwareKeyboardLayoutMode: 'pan',
    predictiveBackGestureEnabled: false,
    package: 'com.thanhtv62929.drivodriverapp',
    permissions: [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      // Chạy nền: Android bắt buộc foreground service (kèm notification thường trực) mới được
      // lấy vị trí liên tục khi app không hiển thị. FOREGROUND_SERVICE_LOCATION là yêu cầu
      // riêng của Android 14+.
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
    ],
    ...(hasGoogleServicesFile ? { googleServicesFile: GOOGLE_SERVICES_FILE } : {}),
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-secure-store',
    [
      'expo-location',
      {
        // 3 cờ này mới là thứ sinh ra entitlement/permission cho chế độ nền lúc prebuild —
        // khai báo Info.plist/permissions ở trên là chưa đủ.
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        locationWhenInUsePermission:
          'Drivo cần vị trí của bạn để tìm chuyến gần bạn và tính lộ trình chính xác.',
        locationAlwaysAndWhenInUsePermission:
          'Drivo cần vị trí kể cả khi bạn tắt màn hình, để khách theo dõi được hành trình và hệ thống ghép chuyến gần bạn nhất.',
      },
    ],
    '@rnmapbox/maps',
    'expo-font',
    'expo-notifications',
    ...(hasFirebaseConfig
      ? [
          '@react-native-firebase/app',
          '@react-native-firebase/messaging',
          // react-native-firebase (gRPC/Swift) trên iOS bắt buộc static frameworks — nếu thiếu
          // thì build iOS lỗi link. Rủi ro cần theo dõi: @rnmapbox/maps trước giờ build với
          // dynamic frameworks mặc định của Expo, chưa verify tương thích static — nếu build
          // iOS lỗi liên quan tới RNMapboxMaps sau khi bật cái này thì đây là nghi phạm đầu tiên.
          [
            'expo-build-properties',
            {
              ios: {
                useFrameworks: 'static',
                forceStaticLinking: ['RNFBApp', 'RNFBMessaging'],
              },
            },
          ],
        ]
      : []),
  ],
  extra: {
    eas: {
      projectId: '9abba5d5-eeeb-48c5-a784-363ae9fe111f',
    },
  },
};
