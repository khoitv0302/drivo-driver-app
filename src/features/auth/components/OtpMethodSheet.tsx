import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { OtpMethod } from '../../../navigation/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (method: OtpMethod) => void;
};

export default function OtpMethodSheet({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        {/* Sheet — chặn sự kiện press lan ra backdrop */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl px-6 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          {/* Drag handle */}
          <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-5" />

          <Text className="text-lg font-bold text-gray-900 text-center">Nhận mã xác thực qua</Text>
          <Text className="text-sm text-gray-400 text-center mt-1 mb-5">
            Chọn kênh để nhận mã OTP
          </Text>

          <MethodRow
            icon={<MaterialCommunityIcons name="message-text-outline" size={22} color="#2563EB" />}
            title="SMS"
            subtitle="Nhận mã qua tin nhắn điện thoại"
            onPress={() => onSelect('sms')}
          />

          <View className="h-3" />

          <MethodRow
            icon={<MaterialCommunityIcons name="chat-outline" size={22} color="#2563EB" />}
            title="Zalo SMS"
            subtitle="Nhận mã qua ứng dụng Zalo"
            onPress={() => onSelect('zalo')}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MethodRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center border border-gray-200 rounded-2xl p-4 gap-3"
    >
      <View className="w-11 h-11 rounded-full bg-primary-light items-center justify-center">{icon}</View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900">{title}</Text>
        <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}
