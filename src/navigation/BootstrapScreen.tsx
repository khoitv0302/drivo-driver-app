import { View, Text } from 'react-native';

// Màn hình tạm thời — thay bằng auth flow / feature đầu tiên khi bắt đầu triển khai
export default function BootstrapScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-semibold text-primary">Drivo Driver App</Text>
    </View>
  );
}
