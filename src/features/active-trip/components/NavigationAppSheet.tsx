import { Modal, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectGoogleMaps: () => void;
  onSelectAppleMaps: () => void;
};

/** Bottom sheet cho tài xế chọn ứng dụng bản đồ để chỉ đường — Apple Maps chỉ hiện trên iOS. */
export default function NavigationAppSheet({ visible, onClose, onSelectGoogleMaps, onSelectAppleMaps }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl px-6 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-5" />

          <Text className="text-lg font-bold text-gray-900 text-center">Chỉ đường bằng</Text>
          <Text className="text-sm text-gray-400 text-center mt-1 mb-5">Chọn ứng dụng bản đồ</Text>

          <AppRow icon="logo-google" title="Google Maps" onPress={onSelectGoogleMaps} />

          {Platform.OS === 'ios' && (
            <>
              <View className="h-3" />
              <AppRow icon="map-outline" title="Apple Maps" onPress={onSelectAppleMaps} />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AppRow({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center border border-gray-200 rounded-2xl p-4 gap-3"
    >
      <View className="w-11 h-11 rounded-full bg-blue-50 items-center justify-center">
        <Ionicons name={icon} size={22} color="#2563EB" />
      </View>
      <Text className="flex-1 text-base font-semibold text-gray-900">{title}</Text>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}
