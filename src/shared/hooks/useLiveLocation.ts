import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { locationManager, type Location } from '@rnmapbox/maps';

// Vị trí GPS thực của thiết bị — dùng chung cho các màn cần vị trí tài xế realtime
// (Home, ActiveTrip, ...). locationManager là singleton của Mapbox nên KHÔNG gọi
// .stop() khi unmount — màn khác (vd Home) có thể vẫn đang cần nó chạy.
export function useLiveLocation(): [number, number] | null {
  const [coords, setCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const onLocation = (loc: Location) => {
      const lng = loc.coords.longitude;
      const lat = loc.coords.latitude;
      if (!isFinite(lng) || !isFinite(lat)) return;
      setCoords([lng, lat]);
    };

    async function start() {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Quyền truy cập vị trí',
            message: 'Drivo cần vị trí của bạn để tính lộ trình chính xác.',
            buttonPositive: 'Đồng ý',
            buttonNegative: 'Từ chối',
          }
        );
        if (cancelled || result !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      locationManager.start();
      locationManager.addListener(onLocation);
    }

    start();
    return () => {
      cancelled = true;
      locationManager.removeListener(onLocation);
    };
  }, []);

  return coords;
}
