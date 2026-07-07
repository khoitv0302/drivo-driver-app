import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MAPBOX_PUBLIC_TOKEN } from '../../../constants/config';
import { useDriverSimulation } from '../hooks/useDriverSimulation';
import type { LegInfo } from '../types';

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
  /** Giả lập tài xế di chuyển dọc lộ trình (mock — thay bằng GPS realtime sau) */
  animateDriver?: boolean;
  /** Callback trả về quãng đường + thời gian còn lại của chặng */
  onLeg?: (leg: LegInfo) => void;
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
  onLeg,
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
        const json = await (await fetch(url)).json();
        const route = json.routes?.[0];
        if (cancelled || !route) return;
        setRouteGeometry(route.geometry);
        onLeg?.({
          distanceKm: route.distance / 1000,
          durationMin: Math.max(1, Math.round(route.duration / 60)),
        });
      } catch {
        // Bỏ qua — vẫn hiển thị marker dù không có đường đi
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

  // Đang giả lập → theo vị trí chạy; không giả lập → coi như đã tới đích (điểm đến)
  const carCoord = sim.coord ?? (animateDriver ? from : to);

  // Khi đang chạy chỉ vẽ đoạn phía trước (đoạn đã đi qua sẽ biến mất)
  const drawnGeometry: GeoJSON.Geometry | null =
    animateDriver && sim.remainingRoute
      ? { type: 'LineString', coordinates: sim.remainingRoute }
      : routeGeometry;

  // Cập nhật quãng đường/thời gian còn lại lên card khi tài xế di chuyển
  useEffect(() => {
    if (!animateDriver || sim.coord == null) return;
    onLeg?.({
      distanceKm: sim.remainingKm,
      durationMin: Math.max(1, Math.round((sim.remainingKm / SIM_SPEED_KMH) * 60)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateDriver, sim.remainingKm]);

  const routeColor = destinationKind === 'pickup' ? '#16a34a' : '#2563EB';

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
      <Mapbox.Camera bounds={bounds} animationMode="easeTo" animationDuration={700} />

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
