import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../../constants/routes';
import type { MainTabScreenProps } from '../../../navigation/types';
import { useStatusBarStyle } from '../../../shared/hooks/useStatusBarStyle';
import { useLogout } from '../../../shared/hooks/useLogout';

// TODO: thay bằng dữ liệu thật khi có GET /driver/me — tạm mock giống ProfileScreen.
const MOCK_DRIVER = {
  name: 'Nguyen Van A',
  phone: '+84969668834',
  rating: 4.9,
  completedTrips: 1284,
  totalKm: 18420,
};

function fmtPhone(raw: string): string {
  // +84969668834 → 0969 668 834
  const digits = raw.replace(/^\+84/, '0');
  return digits.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
}

function fmtNumber(n: number): string {
  return n.toLocaleString('vi-VN');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
};

function MenuItem({ icon, label, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="flex-row items-center py-3.5 px-4">
      <View className="w-8 h-8 items-center justify-center mr-3">
        <Ionicons name={icon} size={22} color="#6b7280" />
      </View>
      <Text className="flex-1 text-[15px] text-gray-800">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View className="h-px bg-gray-100 mx-4" />;
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View className="mb-4">
      <Text className="text-[15px] font-semibold text-gray-800 px-4 mb-2">{title}</Text>
      <View
        className="bg-white rounded-2xl overflow-hidden mx-4"
        style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
      >
        {children}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function AccountScreen({ navigation }: MainTabScreenProps<'Account'>) {
  const insets = useSafeAreaInsets();
  // Nền header xanh sáng → chữ status bar màu đen
  useStatusBarStyle('dark');
  const { mutate: logout, isPending: loggingOut } = useLogout();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi tài khoản?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    // Container ngoài xanh nhạt — chặn overscroll iOS lộ nền trắng ở đầu màn
    <View className="flex-1 bg-blue-50">
      <ScrollView
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Vùng header xanh ── */}
        <View className="bg-blue-50" style={{ paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 16 }}>
          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#2563EB', elevation: 3, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
          >
            {/* Dòng thông tin tài xế */}
            <View className="flex-row items-center px-5 pt-6 pb-5">
              <View className="rounded-full bg-white/20 items-center justify-center mr-4" style={{ width: 72, height: 72 }}>
                <Ionicons name="person" size={38} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-white">{MOCK_DRIVER.name}</Text>
                <Text className="text-sm text-white/70 mt-1">{fmtPhone(MOCK_DRIVER.phone)}</Text>
                <View className="flex-row items-center bg-amber-400 rounded-full px-3 py-0.5 self-start mt-2 gap-1">
                  <Ionicons name="star" size={11} color="#78350f" />
                  <Text className="text-xs font-semibold text-amber-900">{MOCK_DRIVER.rating.toFixed(1)}</Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                className="flex-row items-center border border-white/40 rounded-full px-3 py-2"
                onPress={() => navigation.navigate(ROUTES.PROFILE)}
              >
                <Text className="text-sm text-white mr-1">Hồ sơ</Text>
                <Ionicons name="chevron-forward" size={14} color="white" />
              </TouchableOpacity>
            </View>

            {/* Dòng thống kê */}
            <View className="flex-row bg-white/15 px-5 py-4">
              <View className="flex-1 items-center">
                <Text className="text-xs text-white/70 text-center">Chuyến hoàn thành</Text>
                <Text className="text-base font-bold text-white mt-1">{fmtNumber(MOCK_DRIVER.completedTrips)}</Text>
              </View>
              <View className="w-px bg-white/30 mx-2" />
              <View className="flex-1 items-center">
                <Text className="text-xs text-white/70 text-center">Tổng km</Text>
                <Text className="text-base font-bold text-white mt-1">{fmtNumber(MOCK_DRIVER.totalKm)} km</Text>
              </View>
              <View className="w-px bg-white/30 mx-2" />
              <View className="flex-1 items-center">
                <Text className="text-xs text-white/70 text-center">Đánh giá</Text>
                <Text className="text-base font-bold text-white mt-1">{MOCK_DRIVER.rating.toFixed(1)} ★</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Vùng nội dung xám ── */}
        <View className="bg-gray-100 rounded-t-3xl pt-5">
          {/* ── Tài khoản ── */}
          <Section title="Tài khoản">
            <MenuItem icon="person-outline" label="Hồ sơ cá nhân" onPress={() => navigation.navigate(ROUTES.PROFILE)} />
            <Divider />
            <MenuItem icon="lock-closed-outline" label="Đổi mật khẩu" onPress={() => navigation.navigate(ROUTES.CHANGE_PASSWORD)} />
          </Section>

          {/* ── Hỗ trợ ── */}
          <Section title="Hỗ trợ">
            <MenuItem icon="information-circle-outline" label="Điều khoản và Chính sách" onPress={() => navigation.navigate(ROUTES.TERMS_POLICY)} />
            <Divider />
            <MenuItem icon="headset-outline" label="Trung tâm hỗ trợ" onPress={() => navigation.navigate(ROUTES.SUPPORT_CENTER)} />
            <Divider />
            <MenuItem icon="business-outline" label="Thông tin công ty" onPress={() => navigation.navigate(ROUTES.COMPANY_INFO)} />
          </Section>

          {/* ── Đăng xuất ── */}
          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.75}
            className="mx-4 mb-6 mt-2 flex-row items-center justify-center bg-red-50 rounded-2xl py-4"
            style={{ borderWidth: 1, borderColor: '#fecaca', opacity: loggingOut ? 0.6 : 1 }}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            )}
            <Text className="text-red-500 font-bold text-base ml-2">
              {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
