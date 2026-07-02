import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from '../constants/routes';
import type { RootStackParamList } from './types';
import BootstrapScreen from './BootstrapScreen';
import { useAuthStore } from '../store';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  // Chờ SecureStore/AsyncStorage đọc xong trước khi quyết định màn hình đầu tiên
  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name={ROUTES.BOOTSTRAP} component={BootstrapScreen} />
    </Stack.Navigator>
  );
}
