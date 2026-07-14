import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MAPBOX_PUBLIC_TOKEN } from '../../../constants/config';
import { useDriverSimulation } from '../hooks/useDriverSimulation';

// Tốc độ giả lập tài xế (mock) — bỏ khi có vị trí realtime từ backend
const SIM_SPEED_KMH = 32;

type Props = {
  /** Điểm bắt đầu chặng (vị trí tài xế) — [lng, lat] */
  from: [number, number];
  /** Điểm kết thúc chặng — [lng, lat] */
  to: [number, number];
  /** Màu đích: xanh lá cho điểm đón, đỏ cho điểm đến */
  destinationKind: 'pickup' | 'dropoff';
  /** Khoảng đệm phía trên/dưới để chừa chỗ cho card nổi */
  padTop: number;
  padBottom: number;
  /** Giả lập tài xế di chuyển dọc lộ trình (mock — dùng khi chưa có GPS realtime) */
  animateDriver?: boolean;
  /** Vị trí xe thực (GPS) — ghi đè carCoord suy ra từ from/to/animateDriver khi có */
  driverCoord?: [number, number];
};

/**
 * Bản đồ lộ trình cho một chặng của chuyến — vẽ đường đi Mapbox Directions,
 * marker xe (có thể tự chạy dọc đường) và ghim ở điểm đến. Dùng chung cho mọi pha.
 */
export default function TripMap({
  from,
  to,
  destinationKind,
  padTop,
  padBottom,
  animateDriver = false,
  driverCoord,
}: Props) {
  const insets = useSafeAreaInsets();
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.Geometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [oLng, oLat] = from;
        const [dLng, dLat] = to;
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${oLng},${oLat};${dLng},${dLat}` +
          `?geometries=geojson&overview=full&access_token=${MAPBOX_PUBLIC_TOKEN}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || !json.routes?.length) {
          console.log(`[MAP] ✗ Directions API không có route (HTTP ${res.status}):`, JSON.stringify(json));
          return;
        }
        const route = json.routes[0];
        if (cancelled) return;
        setRouteGeometry(route.geometry);
      } catch (err) {
        // Vẫn hiển thị marker dù không có đường đi — nhưng log lại để biết vì sao fetch lỗi
        console.log('[MAP] ✗ Directions API fetch lỗi:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from[0], from[1], to[0], to[1]]);

  // Toạ độ lộ trình để giả lập tài xế chạy dọc theo (mock)
  const routeCoords = useMemo(() => {
    if (routeGeometry?.type === 'LineString') return routeGeometry.coordinates as [number, number][];
    return null;
  }, [routeGeometry]);

  const sim = useDriverSimulation(routeCoords, {
    enabled: animateDriver,
    speedKmh: SIM_SPEED_KMH,
  });

  // driverCoord (GPS thực) ưu tiên cao nhất; kế đến vị trí giả lập đang chạy;
  // không có gì cả thì coi như đã tới đích (điểm đến) của chặng.
  const carCoord = driverCoord ?? sim.coord ?? (animateDriver ? from : to);

  // Khi đang chạy chỉ vẽ đoạn phía trước (đoạn đã đi qua sẽ biến mất)
  const drawnGeometry: GeoJSON.Geometry | null =
    animateDriver && sim.remainingRoute
      ? { type: 'LineString', coordinates: sim.remainingRoute }
      : routeGeometry;

  const routeColor = destinationKind === 'pickup' ? '#16a34a' : '#2563EB';

  // Khi A và B cách nhau ~<400m: dùng bounds sẽ giữ mức zoom xa vì padding cố định (±0.006°)
  // lấn át khoảng cách thật → phóng to hẳn bằng center+zoom cho tài xế thấy rõ đoạn sắp tới.
  const spanLng = Math.abs(from[0] - to[0]);
  const spanLat = Math.abs(from[1] - to[1]);
  const isClose = spanLng < 0.004 && spanLat < 0.004;
  const midpoint: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];

  const bounds = {
    ne: [Math.max(from[0], to[0]) + 0.006, Math.max(from[1], to[1]) + 0.006] as [number, number],
    sw: [Math.min(from[0], to[0]) - 0.006, Math.min(from[1], to[1]) - 0.006] as [number, number],
    paddingTop: insets.top + padTop,
    paddingBottom: padBottom,
    paddingLeft: 50,
    paddingRight: 50,
  };

  return (
    <Mapbox.MapView
      style={StyleSheet.absoluteFillObject}
      styleURL="mapbox://styles/mapbox/standard"
      logoEnabled={false}
      attributionEnabled={false}
      localizeLabels={{ locale: 'vi' }}
    >
      <Mapbox.Camera
        {...(isClose ? { centerCoordinate: midpoint, zoomLevel: 16 } : { bounds })}
        animationMode="easeTo"
        animationDuration={700}
      />

      {drawnGeometry && (
        <>
          <Mapbox.ShapeSource
            id="tripCasing"
            shape={{ type: 'Feature', geometry: drawnGeometry, properties: {} } as GeoJSON.Feature}
          >
            <Mapbox.LineLayer
              id="tripCasingLine"
              style={{ lineColor: 'white', lineWidth: 9, lineCap: 'round', lineJoin: 'round' }}
            />
          </Mapbox.ShapeSource>
          <Mapbox.ShapeSource
            id="tripRoute"
            shape={{ type: 'Feature', geometry: drawnGeometry, properties: {} } as GeoJSON.Feature}
          >
            <Mapbox.LineLayer
              id="tripRouteLine"
              style={{ lineColor: routeColor, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
            />
          </Mapbox.ShapeSource>
        </>
      )}

      {/* Vị trí tài xế — tự chạy dọc lộ trình khi animateDriver bật */}
      <Mapbox.MarkerView id="tripCar" coordinate={carCoord}>
        <View style={styles.carPuck}>
          <MaterialCommunityIcons name="car" size={18} color="white" />
        </View>
      </Mapbox.MarkerView>

      {/* Điểm đến của chặng */}
      <Mapbox.MarkerView id="tripDest" coordinate={to}>
        {destinationKind === 'pickup' ? (
          <View style={styles.pickupOuter}>
            <View style={styles.pickupInner} />
          </View>
        ) : (
          <Ionicons name="location-sharp" size={38} color="#ef4444" />
        )}
      </Mapbox.MarkerView>
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  carPuck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
});
