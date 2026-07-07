import "./global.css";
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Mapbox from '@rnmapbox/maps';
import RootNavigator from './src/navigation/RootNavigator';
import { MAPBOX_PUBLIC_TOKEN } from './src/constants/config';

Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
