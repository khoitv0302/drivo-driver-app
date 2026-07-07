import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLogout } from '@shared/hooks/useLogout';

// Placeholder — màn Tài khoản đầy đủ sẽ được xây khi integrate feature account.
// Hiện chỉ có nút Đăng xuất để thoát phiên.
export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { mutate: logout, isPending: loggingOut } = useLogout();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi tài khoản?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View className="flex-1 bg-white px-6" style={{ paddingTop: insets.top + 24 }}>
      <Text className="text-2xl font-bold text-gray-900">Tài khoản</Text>
      <Text className="text-sm text-gray-400 mt-2">Màn hình đang được phát triển</Text>

      <TouchableOpacity
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.7}
        className="flex-row items-center justify-center gap-2 border border-red-200 bg-red-50 rounded-2xl py-4 mt-8"
      >
        {loggingOut ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="text-base font-semibold text-red-500">Đăng xuất</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
