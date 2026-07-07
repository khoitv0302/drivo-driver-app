import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';
import { useStatusBarStyle } from '../../../shared/hooks/useStatusBarStyle';

const INFO_ROWS = [
  { label: 'Tên công ty', value: 'Công ty Cổ phần Drivo Việt Nam' },
  { label: 'Mã số doanh nghiệp', value: '0316789012' },
  { label: 'Ngày thành lập', value: '01/01/2023' },
  { label: 'Vốn điều lệ', value: '50.000.000.000 VNĐ' },
  { label: 'Địa chỉ', value: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM' },
  { label: 'Email', value: 'info@drivo.vn' },
  { label: 'Hotline', value: '1900 6789' },
  { label: 'Website', value: 'www.drivo.vn' },
];

const SOCIALS = [
  { icon: 'logo-facebook' as const, label: 'Facebook', url: 'https://facebook.com' },
  { icon: 'logo-instagram' as const, label: 'Instagram', url: 'https://instagram.com' },
  { icon: 'logo-youtube' as const, label: 'YouTube', url: 'https://youtube.com' },
];

export default function CompanyInfoScreen({ navigation }: RootScreenProps<'CompanyInfo'>) {
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View style={{ backgroundColor: '#2563EB', paddingTop: insets.top }}>
        <View style={{ position: 'absolute', right: -30, top: insets.top - 10, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View className="flex-row items-center px-5 pt-4 pb-6" style={{ gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-white">Thông tin công ty</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>Drivo Việt Nam</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* Logo / brand block */}
        <View className="bg-white rounded-2xl p-6 mb-4 items-center"
          style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <View className="w-20 h-20 rounded-3xl bg-blue-600 items-center justify-center mb-3">
            <Ionicons name="car-sport" size={38} color="white" />
          </View>
          <Text className="text-2xl font-black text-gray-900">DRIVO</Text>
          <Text className="text-sm text-gray-400 mt-1">Đồng hành cùng tài xế trên mọi hành trình</Text>
        </View>

        {/* Info rows */}
        <View className="bg-white rounded-2xl mb-4 overflow-hidden"
          style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          {INFO_ROWS.map((row, idx) => (
            <View key={row.label}>
              <View className="flex-row px-4 py-3.5" style={{ gap: 12 }}>
                <Text className="text-sm text-gray-400 w-32 flex-shrink-0">{row.label}</Text>
                <Text className="text-sm font-medium text-gray-800 flex-1">{row.value}</Text>
              </View>
              {idx < INFO_ROWS.length - 1 && <View className="h-px bg-gray-100 mx-4" />}
            </View>
          ))}
        </View>

        {/* Socials */}
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">Mạng xã hội</Text>
        <View className="flex-row" style={{ gap: 12 }}>
          {SOCIALS.map((s) => (
            <TouchableOpacity key={s.label} onPress={() => Linking.openURL(s.url)} activeOpacity={0.75}
              className="flex-1 bg-white rounded-2xl py-4 items-center"
              style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
              <Ionicons name={s.icon} size={24} color="#2563EB" />
              <Text className="text-xs text-gray-500 mt-1.5">{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-center text-xs text-gray-300 mt-6">© 2026 Drivo Việt Nam. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}
