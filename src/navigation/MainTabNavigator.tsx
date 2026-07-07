import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TABS } from '../constants/routes';
import type { MainTabParamList } from './types';
import HomeScreen from '../features/home/screens/HomeScreen';
import TripsScreen from '../features/trips/screens/TripsScreen';
import EarningsScreen from '../features/earnings/screens/EarningsScreen';
import { AccountScreen } from '../features/account';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Trips: { active: 'car', inactive: 'car-outline' },
  Earnings: { active: 'wallet', inactive: 'wallet-outline' },
  Account: { active: 'person', inactive: 'person-outline' },
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarStyle: { height: 88, paddingTop: 8, paddingBottom: 28, borderTopColor: '#f3f4f6' },
        tabBarIcon: ({ focused, color, size }) => {
          const icon = ICONS[route.name];
          return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name={TABS.HOME} component={HomeScreen} options={{ title: 'Trang chủ' }} />
      <Tab.Screen name={TABS.TRIPS} component={TripsScreen} options={{ title: 'Chuyến đi' }} />
      <Tab.Screen name={TABS.EARNINGS} component={EarningsScreen} options={{ title: 'Thu nhập' }} />
      <Tab.Screen name={TABS.ACCOUNT} component={AccountScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}
