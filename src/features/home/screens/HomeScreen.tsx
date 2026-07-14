import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import Mapbox, { locationManager } from '@rnmapbox/maps';
import type { Location } from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ROUTES } from '../../../constants/routes';
import type { MainTabScreenProps } from '../../../navigation/types';
import IncomingTripCard, { type IncomingTrip } from '../components/IncomingTripCard';
import { useStatusBarStyle } from '../../../shared/hooks/useStatusBarStyle';
import { useDriverHub, useDriverHubOffer } from '../hooks/useDriverHub';
import { parseTripOffer, offerToIncomingTrip, type ActiveOffer } from '../types';
import { useAcceptOffer } from '../api/useAcceptOffer';
import { useDeclineOffer } from '../api/useDeclineOffer';
import { useWaitForTrip, TRIP_POLL_MAX_ATTEMPTS } from '../api/useWaitForTrip';

// Toạ độ fallback (TP.HCM) khi chưa lấy được GPS — dạng [lng, lat] theo chuẩn Mapbox
const HCM_FALLBACK: [number, number] = [106.660172, 10.762622];

// Thu nhập hôm nay (mock) — thay bằng dữ liệu API khi backend sẵn sàng
const TODAY_EARNINGS = 1202000;

// Thời gian đếm ngược cho một yêu cầu chuyến (giây)
const REQUEST_SECONDS = 15;

// Nhịp rung lặp khi có chuyến: chờ - rung - nghỉ - rung ...
const VIBRATION_PATTERN = [0, 600, 400, 600, 800];

function fmtVND(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();

  // Nền bản đồ sáng → chữ status bar màu đen
  useStatusBarStyle('dark');
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [userCoords, setUserCoords] = useState<[number, number]>(HCM_FALLBACK);
  const [online, setOnline] = useState(false);
  const locationSet = useRef(false);

  // Mở nhận chuyến → kết nối SignalR /hubs/driver + gửi vị trí mỗi 5s; tắt → ngắt kết nối.
  const hubState = useDriverHub(online, userCoords);

  // Backend push event "offer" khi có chuyến mời → map vào card chuyến đến.
  // Payload gốc đã được log trong hook để đối chiếu contract.
  useDriverHubOffer((payload) => {
    if (offer) return; // đang có chuyến chờ phản hồi — bỏ qua offer mới
    const parsed = parseTripOffer(payload);
    if (!parsed) {
      console.log('[HUB] ⚠ payload offer sai shape — bỏ qua (xem log ⇩ offer ở trên)');
      return;
    }
    setOffer({
      offerId: parsed.offerId,
      bookingId: parsed.bookingId,
      trip: offerToIncomingTrip(parsed),
      customer: { name: parsed.customer.fullName, rating: parsed.customer.rating ?? 0 },
    });
  });

  // Chuyến mời đang chờ phản hồi (từ hub) + đếm ngược
  const [offer, setOffer] = useState<ActiveOffer | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REQUEST_SECONDS);

  const { mutate: acceptOffer, isPending: accepting } = useAcceptOffer();
  const { mutate: declineOffer } = useDeclineOffer();

  // Sau khi accept, chờ backend lưu xong chuyến trước khi vào màn chuyến đang chạy.
  // pendingTrip = null khi không có gì đang chờ xác nhận.
  const [pendingTrip, setPendingTrip] = useState<{
    bookingId: string;
    trip: IncomingTrip;
  } | null>(null);
  const tripReady = useWaitForTrip(pendingTrip?.bookingId ?? null);

  useEffect(() => {
    if (!pendingTrip) return;
    if (tripReady.isSuccess) {
      const { trip } = pendingTrip;
      // tripId + thông tin khách thật lấy từ response /trips/me/current — chính xác hơn
      // dữ liệu suy ra từ offer (offer không có phone).
      const { tripId, status, counterparty } = tripReady.data.trip;
      const customer = {
        name: counterparty.fullName,
        rating: counterparty.rating ?? 0,
        phone: counterparty.phone,
      };
      setPendingTrip(null);
      goToActiveTrip(trip, customer, tripId, status);
    } else if (tripReady.isError) {
      setPendingTrip(null);
      Alert.alert('Chưa xác nhận được chuyến', 'Hệ thống chưa lưu xong chuyến, vui lòng thử lại sau.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTrip, tripReady.isSuccess, tripReady.isError]);

  const stopAlert = () => {
    Vibration.cancel();
  };

  // Bắt đầu/kết thúc rung + đếm ngược khi có chuyến mời
  useEffect(() => {
    if (!offer) return;

    setSecondsLeft(REQUEST_SECONDS);
    Vibration.vibrate(VIBRATION_PATTERN, true);

    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          stopAlert();
          setOffer(null); // hết giờ = tự động bỏ qua (backend tự chuyển offer cho tài xế khác)
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      stopAlert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer]);

  // Điều hướng sang luồng chuyến đang chạy với dữ liệu chuyến vừa nhận
  const goToActiveTrip = (
    trip: IncomingTrip,
    customer: ActiveOffer['customer'],
    tripId: string,
    status?: string
  ) => {
    navigation.navigate(ROUTES.ACTIVE_TRIP, {
      tripId,
      pickup: trip.pickup,
      dropoff: trip.dropoff,
      passenger: customer,
      fare: trip.income,
      payment: trip.payment,
      status,
    });
  };

  const acceptTrip = () => {
    if (!offer || accepting) return;
    stopAlert();
    const { offerId, bookingId, trip } = offer;

    acceptOffer(offerId, {
      onSuccess: () => {
        setOffer(null);
        // API accept trả 200 rỗng — không biết backend lưu chuyến xong lúc nào, nên
        // chờ xác nhận qua GET /trips/me/current (useWaitForTrip) trước khi vào màn chuyến đang chạy.
        setPendingTrip({ bookingId, trip });
      },
      onError: (err) => {
        // Chuyến có thể đã được tài xế khác nhận / offer hết hạn phía server
        console.log(`[API] ✗ accept offer ${offerId} thất bại: ${err.message}`);
        Alert.alert('Không nhận được chuyến', err.message);
        setOffer(null);
      },
    });
  };

  const declineTrip = () => {
    if (!offer) return;
    stopAlert();
    const { offerId } = offer;
    setOffer(null); // đóng card ngay, không bắt tài xế chờ API
    // Fire-and-forget: từ chối thất bại thì offer cũng tự hết hạn phía server
    declineOffer(offerId, {
      onError: (err) => console.log(`[API] ✗ decline offer ${offerId} thất bại: ${err.message}`),
    });
  };

  // Lấy vị trí tài xế qua locationManager — giống cách customer app làm ở MapScreen
  useEffect(() => {
    let cancelled = false;

    const onLocation = (loc: Location) => {
      const lng = loc.coords.longitude;
      const lat = loc.coords.latitude;
      if (!isFinite(lng) || !isFinite(lat)) return;
      const coords: [number, number] = [lng, lat];
      setUserCoords(coords);
      // Chỉ bay camera tới vị trí lần đầu, tránh giật khi GPS cập nhật liên tục
      if (!locationSet.current) {
        locationSet.current = true;
        cameraRef.current?.setCamera({
          centerCoordinate: coords,
          zoomLevel: 15,
          animationDuration: 800,
        });
      }
    };

    async function start() {
      // Android cần xin quyền runtime trước khi bật locationManager
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Quyền truy cập vị trí',
            message: 'Drivo cần vị trí của bạn để hiển thị bản đồ và nhận chuyến gần bạn.',
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
      locationManager.stop();
    };
  }, []);

  const recenter = () => {
    cameraRef.current?.setCamera({
      centerCoordinate: userCoords,
      zoomLevel: 15,
      animationDuration: 600,
    });
  };

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Bản đồ Mapbox full màn hình */}
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/standard"
        logoEnabled={false}
        attributionEnabled={false}
        localizeLabels={{ locale: 'vi' }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: HCM_FALLBACK, zoomLevel: 14 }}
        />
        <Mapbox.LocationPuck visible />
      </Mapbox.MapView>

      {/* ── Header nổi ── */}
      <View style={[styles.header, { top: insets.top + 10 }]}>
        {/* Pill thu nhập hôm nay (căn giữa) */}
        <TouchableOpacity style={styles.earningPill} activeOpacity={0.85}>
          <View style={styles.earningIcon}>
            <MaterialCommunityIcons name="cash" size={16} color="white" />
          </View>
          <Text style={styles.earningText}>{fmtVND(TODAY_EARNINGS)}đ</Text>
          <Ionicons name="chevron-down" size={14} color="#9ca3af" />
        </TouchableOpacity>

        {/* Nút thông báo (góc phải) */}
        <TouchableOpacity
          style={styles.notifBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS)}
        >
          <Ionicons name="notifications-outline" size={21} color="#111827" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* Nút về vị trí hiện tại */}
      <TouchableOpacity style={styles.recenterBtn} activeOpacity={0.85} onPress={recenter}>
        <Ionicons name="locate" size={20} color="#2563EB" />
      </TouchableOpacity>

      {/* ── Thẻ trạng thái dưới cùng ── */}
      <View style={styles.bottomSheet}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Dòng trạng thái — phản ánh cả kết nối hub: xanh = đã kết nối, vàng = đang kết nối */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: !online
                  ? '#9ca3af'
                  : hubState === 'connected'
                    ? '#22c55e'
                    : hubState === 'disconnected'
                      ? '#ef4444'
                      : '#f59e0b',
              },
            ]}
          />
          <Text style={styles.statusText}>
            {!online
              ? 'Đang ngoại tuyến'
              : hubState === 'connected'
                ? 'Đang trực tuyến'
                : hubState === 'disconnected'
                  ? 'Mất kết nối máy chủ'
                  : 'Đang kết nối...'}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={styles.metaChip}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={styles.metaText}>4.9</Text>
          </View>
        </View>

        {/* Nút bật/tắt nhận chuyến */}
        <TouchableOpacity
          style={[styles.onlineBtn, online ? styles.onlineBtnOn : styles.onlineBtnOff]}
          activeOpacity={0.9}
          onPress={() => setOnline((v) => !v)}
        >
          <Ionicons name="power" size={20} color="white" />
          <Text style={styles.onlineText}>{online ? 'Đang trực tuyến' : 'Mở nhận chuyến'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Yêu cầu chuyến đến (từ hub) ── */}
      {offer && (
        <IncomingTripCard
          trip={offer.trip}
          secondsLeft={secondsLeft}
          totalSeconds={REQUEST_SECONDS}
          accepting={accepting}
          onAccept={acceptTrip}
          onDecline={declineTrip}
        />
      )}

      {/* ── Đang chờ backend lưu xong chuyến sau khi accept ── */}
      {pendingTrip && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.confirmText}>Đang xác nhận chuyến...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
  elevation: 4,
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  earningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'white',
    height: 44,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 22,
    ...SHADOW,
  },
  earningIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  notifBtn: {
    position: 'absolute',
    right: 16,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  notifDot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    bottom: 168,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 14,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  metaText: { fontSize: 13, fontWeight: '700', color: '#b45309' },
  onlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
  },
  onlineBtnOff: {
    backgroundColor: '#1f2937',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  onlineBtnOn: {
    backgroundColor: '#16a34a',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  onlineText: { color: 'white', fontSize: 16, fontWeight: '700' },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 10,
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  confirmSubText: { fontSize: 12, color: '#6b7280' },
});
