import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MAPBOX_PUBLIC_TOKEN } from '../../../constants/config';

export type IncomingTrip = {
  pickup: { name: string; distanceKm: number; coord: [number, number] };
  dropoff: { name: string; distanceKm: number; coord: [number, number] };
  income: number;
  payment: string;
};

type Props = {
  trip: IncomingTrip;
  secondsLeft: number;
  totalSeconds: number;
  onAccept: () => void;
  onDecline: () => void;
};

function fmtVND(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function IncomingTripCard({ trip, secondsLeft, totalSeconds, onAccept, onDecline }: Props) {
  const insets = useSafeAreaInsets();
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.Geometry | null>(null);

  // Lấy lộ trình từ Mapbox Directions để vẽ đường đi (giống customer app)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [oLng, oLat] = trip.pickup.coord;
        const [dLng, dLat] = trip.dropoff.coord;
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${oLng},${oLat};${dLng},${dLat}` +
          `?geometries=geojson&overview=full&access_token=${MAPBOX_PUBLIC_TOKEN}`;
        const json = await (await fetch(url)).json();
        const geom = json.routes?.[0]?.geometry;
        if (!cancelled && geom) setRouteGeometry(geom);
      } catch {
        // Bỏ qua — vẫn hiển thị marker dù không có đường đi
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trip]);

  const bounds = {
    ne: [
      Math.max(trip.pickup.coord[0], trip.dropoff.coord[0]) + 0.006,
      Math.max(trip.pickup.coord[1], trip.dropoff.coord[1]) + 0.006,
    ] as [number, number],
    sw: [
      Math.min(trip.pickup.coord[0], trip.dropoff.coord[0]) - 0.006,
      Math.min(trip.pickup.coord[1], trip.dropoff.coord[1]) - 0.006,
    ] as [number, number],
    paddingTop: insets.top + 210,
    paddingBottom: 190,
    paddingLeft: 50,
    paddingRight: 50,
  };

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const urgent = secondsLeft <= 5;
  const accent = urgent ? '#ef4444' : '#16a34a';

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Map lộ trình */}
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/standard"
        logoEnabled={false}
        attributionEnabled={false}
        localizeLabels={{ locale: 'vi' }}
      >
        <Mapbox.Camera bounds={bounds} animationMode="easeTo" animationDuration={600} />

        {routeGeometry && (
          <>
            <Mapbox.ShapeSource id="itCasing" shape={{ type: 'Feature', geometry: routeGeometry, properties: {} } as GeoJSON.Feature}>
              <Mapbox.LineLayer id="itCasingLine" style={{ lineColor: 'white', lineWidth: 9, lineCap: 'round', lineJoin: 'round' }} />
            </Mapbox.ShapeSource>
            <Mapbox.ShapeSource id="itRoute" shape={{ type: 'Feature', geometry: routeGeometry, properties: {} } as GeoJSON.Feature}>
              <Mapbox.LineLayer id="itRouteLine" style={{ lineColor: '#16a34a', lineWidth: 5, lineCap: 'round', lineJoin: 'round' }} />
            </Mapbox.ShapeSource>
          </>
        )}

        {/* Điểm đón */}
        <Mapbox.MarkerView id="itPickup" coordinate={trip.pickup.coord}>
          <View style={styles.pickupOuter}>
            <View style={styles.pickupInner} />
          </View>
        </Mapbox.MarkerView>

        {/* Điểm đến */}
        <Mapbox.MarkerView id="itDropoff" coordinate={trip.dropoff.coord}>
          <Ionicons name="location-sharp" size={38} color="#ef4444" />
        </Mapbox.MarkerView>
      </Mapbox.MapView>

      {/* ── Card thông tin (nền tối) ── */}
      <View style={[styles.infoCard, { top: insets.top + 12 }]}>
        <View style={styles.infoHeader}>
          <View style={styles.pulseDot} />
          <Text style={styles.infoTitle}>Yêu cầu chuyến đi mới</Text>
        </View>

        {/* Điểm đón */}
        <View style={styles.routeRow}>
          <View style={styles.dotGreen} />
          <Text style={styles.routeName} numberOfLines={1}>{trip.pickup.name}</Text>
          <Text style={styles.routeDist}>{trip.pickup.distanceKm.toFixed(1)} km</Text>
        </View>
        <View style={styles.connector} />
        {/* Điểm đến */}
        <View style={styles.routeRow}>
          <View style={styles.dotRed} />
          <Text style={styles.routeName} numberOfLines={1}>{trip.dropoff.name}</Text>
          <Text style={styles.routeDist}>{trip.dropoff.distanceKm.toFixed(1)} km</Text>
        </View>

        <View style={styles.divider} />

        {/* Thu nhập */}
        <View style={styles.incomeRow}>
          <View>
            <Text style={styles.incomeLabel}>Thu nhập chuyến đi</Text>
            <Text style={styles.incomeValue}>{fmtVND(trip.income)}đ</Text>
            <Text style={styles.incomeNote}>Bao gồm phụ phí</Text>
          </View>
          <View style={styles.payBadge}>
            <Ionicons name="cash-outline" size={13} color="#d1fae5" />
            <Text style={styles.payText}>{trip.payment}</Text>
          </View>
        </View>
      </View>

      {/* ── Thanh hành động ── */}
      <View style={styles.actionBar}>
        {/* Thanh tiến trình đếm ngược */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
        </View>

        <View style={styles.actionRow}>
          {/* Đếm ngược */}
          <View style={[styles.countdown, { borderColor: accent, backgroundColor: urgent ? '#fef2f2' : '#f0fdf4' }]}>
            <Text style={[styles.countdownNum, { color: accent }]}>{secondsLeft}</Text>
            <Text style={[styles.countdownUnit, { color: accent }]}>giây</Text>
          </View>

          {/* Từ chối */}
          <TouchableOpacity style={styles.declineBtn} activeOpacity={0.8} onPress={onDecline}>
            <Ionicons name="close" size={17} color="#4b5563" />
            <Text style={styles.declineText}>Từ chối</Text>
          </TouchableOpacity>

          {/* Nhận chuyến */}
          <TouchableOpacity style={styles.acceptBtn} activeOpacity={0.9} onPress={onAccept}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.acceptText}>Nhận chuyến</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  infoTitle: { color: 'white', fontSize: 15, fontWeight: '700' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 24 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  connector: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.25)', marginLeft: 4.5, marginVertical: 2 },
  routeName: { flex: 1, color: 'white', fontSize: 14, fontWeight: '500' },
  routeDist: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  incomeRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  incomeLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  incomeValue: { color: '#4ade80', fontSize: 24, fontWeight: '800', marginTop: 2 },
  incomeNote: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  payBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  payText: { color: '#d1fae5', fontSize: 12, fontWeight: '600' },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: 'white',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#eef2f6',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countdown: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNum: { fontSize: 17, fontWeight: '800', lineHeight: 19 },
  countdownUnit: { fontSize: 9, fontWeight: '700', marginTop: -1, textTransform: 'uppercase', letterSpacing: 0.3 },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  declineText: { fontSize: 15, fontWeight: '700', color: '#4b5563' },
  acceptBtn: {
    flex: 1.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptText: { fontSize: 16, fontWeight: '800', color: 'white' },
  pickupOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16a34a' },
});
