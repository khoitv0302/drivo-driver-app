import * as SecureStore from 'expo-secure-store';

// Refresh token là bí mật sống lâu (đổi access token khi hết hạn) → lưu ở SecureStore
// (Keychain trên iOS / Keystore trên Android, được mã hoá), KHÔNG để trong AsyncStorage plaintext.
// Key chỉ được chứa [A-Za-z0-9._-].
const REFRESH_TOKEN_KEY = 'drivo.driver.refreshToken';

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function deleteRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
