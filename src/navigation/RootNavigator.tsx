import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from '../constants/routes';
import type { RootStackParamList } from './types';
import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import OtpScreen from '../features/auth/screens/OtpScreen';
import MainTabNavigator from './MainTabNavigator';
import { ActiveTripScreen } from '../features/active-trip';
import { NotificationsScreen } from '../features/notifications';
import {
  ProfileScreen,
  ChangePasswordScreen,
  TermsPolicyScreen,
  SupportCenterScreen,
  CompanyInfoScreen,
} from '../features/account';
import { useAuthStore } from '../store';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const token = useAuthStore((s) => s.token);
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
      {token ? (
        <>
          <Stack.Screen name={ROUTES.MAIN} component={MainTabNavigator} />
          <Stack.Screen name={ROUTES.ACTIVE_TRIP} component={ActiveTripScreen} />
          <Stack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
          <Stack.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
          <Stack.Screen name={ROUTES.CHANGE_PASSWORD} component={ChangePasswordScreen} />
          <Stack.Screen name={ROUTES.TERMS_POLICY} component={TermsPolicyScreen} />
          <Stack.Screen name={ROUTES.SUPPORT_CENTER} component={SupportCenterScreen} />
          <Stack.Screen name={ROUTES.COMPANY_INFO} component={CompanyInfoScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
          <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
          <Stack.Screen name={ROUTES.OTP} component={OtpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
