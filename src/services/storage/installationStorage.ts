import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';

// installationId là KHOÁ CHÍNH của installation trên Azure Notification Hub: PUT lại cùng id =
// cập nhật installation cũ (đổi pnsHandle, đổi tag user id lấy từ JWT); id khác = tạo installation
// mới → 1 máy nhân thành nhiều bản ghi. Vì vậy id phải ổn định nhất có thể theo THIẾT BỊ, và
// KHÔNG được suy ra từ FCM token (token bị xoay định kỳ).
//
// Nguồn id khác nhau theo nền tảng, vì mỗi bên bền ở một kiểu:
//   Android — SecureStore BỊ XOÁ khi gỡ app, nên lấy từ ANDROID_ID (sống qua cài lại, chỉ đổi khi
//             factory reset hoặc đổi signing key).
//   iOS     — ngược lại: Keychain giữ nguyên dữ liệu SecureStore qua cài lại (cùng bundle ID),
//             trong khi identifierForVendor lại RESET đúng lúc gỡ app cuối cùng của vendor. Nên
//             ở đây dùng UUID tự sinh lưu SecureStore mới là bền, dùng IDFV sẽ kém hơn.
// Key SecureStore chỉ được chứa [A-Za-z0-9._-].
const INSTALLATION_ID_KEY = 'drivo.driver.installationId';

// Trộn vào trước khi băm ANDROID_ID để id gửi lên server không đảo ngược được về ANDROID_ID gốc.
const ANDROID_ID_NAMESPACE = 'drivo.driver.installation';

// Giữ lại trong RAM để khỏi đọc SecureStore/băm lại mỗi lần đăng ký.
let cachedId: string | null = null;

// Đưa chuỗi hex bất kỳ (>=32 ký tự) về đúng khuôn UUID 8-4-4-4-12. Cần thiết vì backend/Azure
// nhận installationId dạng GUID (xem ví dụ c0ffee00-0000-4000-8000-000000000001), còn ANDROID_ID
// chỉ là 16 ký tự hex — gửi thẳng có thể bị Guid.Parse phía .NET từ chối.
function hexToUuid(hex: string): string {
  const h = hex.slice(0, 32);
  // Nibble version = 5 (uuid sinh từ hàm băm) và 2 bit variant = 10xx theo RFC 4122, để chuỗi
  // này là UUID hợp lệ chứ không phải hex ngẫu nhiên trông giống UUID.
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `5${h.slice(13, 16)}`,
    `${variant}${h.slice(17, 20)}`,
    h.slice(20, 32),
  ].join('-');
}

// Android: id suy ra từ ANDROID_ID nên KHÔNG cần lưu trữ — cài lại app vẫn ra đúng id cũ.
// Trả null nếu máy không cấp ANDROID_ID (hiếm, vd emulator dựng thiếu) để rơi về nhánh UUID lưu trữ.
async function deriveAndroidInstallationId(): Promise<string | null> {
  const androidId = Application.getAndroidId();
  if (!androidId) return null;
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${ANDROID_ID_NAMESPACE}:${androidId}`,
  );
  return hexToUuid(digest);
}

// UUID ngẫu nhiên sinh 1 lần rồi lưu SecureStore — dùng cho iOS, và làm phương án dự phòng cho
// Android khi không đọc được ANDROID_ID.
async function getOrCreateStoredId(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
    if (stored) return stored;
  } catch {
    // Đọc lỗi (máy chưa mở khoá, keystore hỏng...) → rơi xuống sinh id mới ở dưới.
  }

  const created = Crypto.randomUUID();
  // Ghi hỏng thì vẫn trả id vừa sinh: đăng ký push phiên này chạy được, lần mở app sau sẽ
  // thử ghi lại. Xấu nhất là dư vài installation chứ không chặn nhận thông báo.
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created).catch(() => {});
  return created;
}

// Trả về installationId của máy, dạng UUID.
export async function getOrCreateInstallationId(): Promise<string> {
  if (cachedId) return cachedId;

  const resolved =
    Platform.OS === 'android'
      ? ((await deriveAndroidInstallationId()) ?? (await getOrCreateStoredId()))
      : await getOrCreateStoredId();

  cachedId = resolved;
  return resolved;
}

// Đọc installationId nếu ĐÃ có, không sinh mới. Dùng cho luồng đăng xuất: máy chưa từng đăng ký
// push thì không cần (và không nên) sinh id mới chỉ để gọi DELETE.
export async function peekInstallationId(): Promise<string | null> {
  if (cachedId) return cachedId;
  if (Platform.OS === 'android') return deriveAndroidInstallationId();
  try {
    return await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  } catch {
    return null;
  }
}

// CỐ Ý không có hàm xoá installationId: id này định danh THIẾT BỊ, không phải người dùng, nên
// phải sống qua đăng xuất. Đăng xuất chỉ gỡ bản ghi trên hub (DELETE .../device-installation/{id},
// xem useLogout.ts) rồi giữ nguyên id ở máy — nhờ vậy lần đăng nhập sau PUT đè lên đúng bản ghi
// cũ. Nếu xoá id lúc logout thì mỗi lần đăng nhập lại sẽ tạo installation mới và cùng 1 máy bị
// tính thành nhiều thiết bị → tài xế nhận trùng thông báo.
