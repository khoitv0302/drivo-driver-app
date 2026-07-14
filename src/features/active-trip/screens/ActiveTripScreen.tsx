import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ROUTES } from '../../../constants/routes';
import type { RootScreenProps } from '../../../navigation/types';
import { useStatusBarStyle } from '../../../shared/hooks/useStatusBarStyle';
import { getAvatarColor, getInitials } from '../../../shared/utils/avatar';
import TripMap from '../components/TripMap';
import SlideToComplete from '../components/SlideToComplete';
import NavigationAppSheet from '../components/NavigationAppSheet';
import { useActiveTrip } from '../hooks/useActiveTrip';

// Phụ phí / khuyến mãi giả lập để dựng bảng kê cước (thay bằng API sau)
const SURCHARGE = 20000;
const PROMO = -10000;

function fmtVND(n: number) {
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? `-${s}` : s;
}

function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const TITLES: Record<string, string> = {
  enroute_pickup: 'Đang đến điểm đón',
  on_trip: 'Đang trên chuyến đi',
  at_dropoff: 'Đã đến điểm đến',
  summary: 'Hoàn tất chuyến đi',
  completed: 'Chuyến đi đã hoàn thành',
};

export default function ActiveTripScreen({ route, navigation }: RootScreenProps<'ActiveTrip'>) {
  const trip = route.params;
  const insets = useSafeAreaInsets();
  const {
    phase,
    rating,
    setRating,
    comment,
    setComment,
    leg,
    wait,
    advance,
    primaryAction,
    confirming,
    mapLeg,
    driverCoord,
    fareResult,
  } = useActiveTrip(trip);

  const isMapPhase = phase !== 'summary' && phase !== 'completed';
  // Nền bản đồ sáng và nền tổng kết xám nhạt đều cần chữ status bar màu đen
  useStatusBarStyle('dark');

  const [navSheetVisible, setNavSheetVisible] = useState(false);

  // Sau khi có cước thực từ POST /trips/{id}/arrived-destination thì dùng số đó thay cho giá quote ban đầu.
  const totalFare = fareResult?.fareAmount ?? trip.fare;
  const driverReceive = fareResult?.netFareAmount ?? trip.fare + SURCHARGE + PROMO;

  const goHome = () => navigation.navigate(ROUTES.MAIN);

  // Gọi khách qua trình quay số — chỉ chuyến thật mới có số (chuyến giả lập không có phone).
  const callPassenger = () => {
    if (!trip.passenger.phone) return;
    Linking.openURL(`tel:${trip.passenger.phone}`);
  };

  // Chỉ đường tới điểm đến của chặng hiện tại (điểm đón/điểm trả) — tài xế chọn app qua
  // NavigationAppSheet. Mỗi hàm ưu tiên mở thẳng app đã cài, fallback sang link web/Apple Maps
  // nếu máy không cài Google Maps.
  const openGoogleMaps = () => {
    const [lng, lat] = mapLeg.to;
    const appUrl =
      Platform.OS === 'ios'
        ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
        : `google.navigation:q=${lat},${lng}`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    Linking.canOpenURL(appUrl)
      .then((supported) => Linking.openURL(supported ? appUrl : webUrl))
      .catch(() => Linking.openURL(webUrl));
  };

  const openAppleMaps = () => {
    const [lng, lat] = mapLeg.to;
    Linking.openURL(`maps://?daddr=${lat},${lng}&dirflg=d`);
  };

  return (
    <View style={styles.root}>
      {isMapPhase && (
        <TripMap
          from={mapLeg.from}
          to={mapLeg.to}
          destinationKind={mapLeg.kind}
          padTop={190}
          padBottom={260}
          animateDriver={phase === 'on_trip'}
          driverCoord={driverCoord}
        />
      )}

      {/* ── Header nổi: chỉ nút quay lại (+ Báo cáo khi đang chở khách) ── */}
      <View style={[styles.header, { top: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        {phase === 'on_trip' && (
          <TouchableOpacity style={styles.reportBtn} activeOpacity={0.8}>
            <Ionicons name="warning-outline" size={14} color="#dc2626" />
            <Text style={styles.reportText}>Báo cáo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Card thông tin trên cùng (các pha bản đồ) ── */}
      {isMapPhase && (
        <View style={[styles.topCard, { top: insets.top + 60 }]}>{renderTopCard()}</View>
      )}

      {/* ── Nút nổi bên phải bản đồ ── */}
      {isMapPhase && (
        <View style={[styles.floatCol, { bottom: bottomSheetHeight() + 16 }]}>
          {phase === 'at_dropoff' && (
            <TouchableOpacity style={styles.floatBtn} activeOpacity={0.85}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#2563EB" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.navFloatBtn} activeOpacity={0.85} onPress={() => setNavSheetVisible(true)}>
            <Ionicons name="navigate" size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Thẻ dưới cùng ── */}
      {isMapPhase && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>{renderBottomSheet()}</View>
      )}

      {/* ── Pha tổng kết (kéo hoàn thành) ── */}
      {phase === 'summary' && renderSummary()}

      {/* ── Pha hoàn thành ── */}
      {phase === 'completed' && renderCompleted()}

      <NavigationAppSheet
        visible={navSheetVisible}
        onClose={() => setNavSheetVisible(false)}
        onSelectGoogleMaps={() => {
          setNavSheetVisible(false);
          openGoogleMaps();
        }}
        onSelectAppleMaps={() => {
          setNavSheetVisible(false);
          openAppleMaps();
        }}
      />
    </View>
  );

  // Chiều cao ước lượng của bottom sheet để đặt cột nút nổi phía trên nó
  function bottomSheetHeight() {
    if (phase === 'on_trip') return 320;
    if (phase === 'at_dropoff') return 230;
    return 250;
  }

  function renderTopCard() {
    if (phase === 'enroute_pickup') {
      return (
        <>
          <Text style={styles.cardTitle}>Đang đến điểm đón</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Cách điểm đón</Text>
              <Text style={styles.metaValue}>{(leg?.distanceKm ?? trip.pickup.distanceKm).toFixed(1)} km</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Thời gian đến</Text>
              <Text style={styles.metaValue}>{leg?.durationMin ?? 2} phút</Text>
            </View>
          </View>
        </>
      );
    }

    if (phase === 'at_dropoff') {
      return (
        <>
          <Text style={styles.cardTitle}>Đã đến điểm đến</Text>
          <View style={styles.waitRow}>
            <Text style={styles.waitSub}>Vui lòng chờ khách thanh toán</Text>
            <Text style={styles.waitClock}>{fmtClock(wait)}</Text>
          </View>
        </>
      );
    }

    // on_trip — tóm tắt lộ trình
    return (
      <>
        <Text style={styles.cardTitle}>Đang trên chuyến đi</Text>
        <View style={styles.routeRow}>
          <View style={styles.dotGreen} />
          <Text style={styles.routeName} numberOfLines={1}>{trip.pickup.name}</Text>
        </View>
        <View style={styles.connector} />
        <View style={styles.routeRow}>
          <View style={styles.dotRed} />
          <Text style={styles.routeName} numberOfLines={1}>{trip.dropoff.name}</Text>
          <Text style={styles.routeDist}>{(leg?.distanceKm ?? trip.dropoff.distanceKm).toFixed(1)} km</Text>
        </View>
        <View style={styles.estRow}>
          <Ionicons name="time-outline" size={14} color="#6b7280" />
          <Text style={styles.estText}>Ước tính {leg?.durationMin ?? 20} phút</Text>
        </View>
      </>
    );
  }

  function renderPassenger() {
    return (
      <View style={styles.paxRow}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(trip.passenger.name) }]}>
          <Text style={styles.avatarText}>{getInitials(trip.passenger.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.paxName}>{trip.passenger.name}</Text>
          <View style={styles.paxRatingRow}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={styles.paxRating}>{trip.passenger.rating.toFixed(1)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.paxIcon} activeOpacity={0.8}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.paxIcon, !trip.passenger.phone && { opacity: 0.4 }]}
          activeOpacity={0.8}
          onPress={callPassenger}
          disabled={!trip.passenger.phone}
        >
          <Ionicons name="call-outline" size={18} color="#2563EB" />
        </TouchableOpacity>
      </View>
    );
  }

  function renderBottomSheet() {
    return (
      <>
        <View style={styles.handle} />
        {renderPassenger()}

        {!!trip.passenger.note && (
          <View style={styles.noteRow}>
            <Text style={styles.noteLabel}>Ghi chú: </Text>
            <Text style={styles.noteText} numberOfLines={2}>{trip.passenger.note}</Text>
          </View>
        )}

        {phase === 'on_trip' && (
          <View style={styles.fareRow}>
            <View>
              <Text style={styles.fareLabel}>Giá cước</Text>
              <Text style={styles.fareValue}>{fmtVND(trip.fare)}đ</Text>
            </View>
            <View style={styles.payBadge}>
              <Ionicons name="cash-outline" size={13} color="#6b7280" />
              <Text style={styles.payText}>{trip.payment}</Text>
            </View>
          </View>
        )}

        {/* Nút hành động chính — gọi API tương ứng pha (nếu có) rồi mới chuyển pha */}
        <TouchableOpacity
          style={[styles.primaryBtn, confirming && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={primaryAction}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name={primaryIcon()} size={18} color="white" />
              <Text style={styles.primaryText}>{primaryLabel()}</Text>
            </>
          )}
        </TouchableOpacity>
      </>
    );
  }

  function primaryLabel() {
    switch (phase) {
      case 'enroute_pickup':
        return 'Khách đã lên xe';
      case 'on_trip':
        return 'Đã đến nơi';
      case 'at_dropoff':
        return 'Khách đã thanh toán';
      default:
        return '';
    }
  }

  function primaryIcon(): keyof typeof Ionicons.glyphMap {
    switch (phase) {
      case 'enroute_pickup':
        return 'person-add';
      case 'on_trip':
        return 'flag';
      case 'at_dropoff':
        return 'wallet';
      default:
        return 'checkmark-circle';
    }
  }

  function renderSummary() {
    return (
      <ScrollView
        style={styles.plainBg}
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tổng cước */}
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cước phí</Text>
            <View style={styles.detailChip}>
              <Text style={styles.detailText}>Chi tiết</Text>
              <Ionicons name="chevron-down" size={13} color="#6b7280" />
            </View>
          </View>
          <Text style={styles.totalValue}>{fmtVND(totalFare)}đ</Text>
          <Text style={styles.thankText}>Cảm ơn bạn đã phục vụ khách hàng!</Text>
        </View>

        {/* Đánh giá khách hàng */}
        <View style={styles.card}>
          {renderPassenger()}
          <Text style={styles.rateLabel}>Đánh giá khách hàng</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} activeOpacity={0.7} onPress={() => setRating(n)}>
                <Ionicons
                  name={n <= rating ? 'star' : 'star-outline'}
                  size={30}
                  color={n <= rating ? '#2563EB' : '#d1d5db'}
                  style={{ marginHorizontal: 4 }}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.commentInput}
            placeholder="Nhận xét về khách hàng (không bắt buộc)"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            value={comment}
            onChangeText={setComment}
          />
        </View>

        <View style={{ height: 16 }} />
        <SlideToComplete label="Kéo để hoàn thành chuyến đi" onComplete={advance} />
      </ScrollView>
    );
  }

  function renderCompleted() {
    return (
      <ScrollView
        style={styles.completedBg}
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: check + confetti */}
        <View style={styles.heroWrap}>
          <View style={[styles.confetti, { top: 6, left: 70, backgroundColor: '#22c55e', transform: [{ rotate: '25deg' }] }]} />
          <View style={[styles.confetti, { top: 30, right: 78, backgroundColor: '#fbbf24', transform: [{ rotate: '-18deg' }] }]} />
          <View style={[styles.confettiDot, { top: 70, left: 42, backgroundColor: '#3b82f6' }]} />
          <View style={[styles.confetti, { bottom: 44, left: 56, backgroundColor: '#60a5fa', transform: [{ rotate: '40deg' }] }]} />
          <View style={[styles.confettiDot, { bottom: 60, right: 60, backgroundColor: '#22c55e' }]} />
          <View style={[styles.confetti, { top: 52, right: 48, backgroundColor: '#f87171', transform: [{ rotate: '12deg' }] }]} />

          <View style={styles.checkRing}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={46} color="white" />
            </View>
          </View>
          <Text style={styles.completedTitle}>Hoàn thành chuyến đi</Text>
          <Text style={styles.completedSubtitle}>Cảm ơn bạn đã hoàn thành chuyến đi!</Text>
        </View>

        {/* Chi tiết thanh toán */}
        <View style={styles.card}>
          <Text style={styles.detailHeading}>Chi tiết thanh toán</Text>

          {renderFareRow('wallet', '#dcfce7', '#16a34a', 'Tổng cước phí', fmtVND(totalFare) + 'đ')}
          {!fareResult && (
            <>
              <View style={styles.rowDivider} />
              {renderFareRow('pricetag', '#e0e7ff', '#4f46e5', 'Phụ phí', fmtVND(SURCHARGE) + 'đ')}
            </>
          )}
          <View style={styles.rowDivider} />
          {renderFareRow(
            'ticket',
            '#dcfce7',
            '#16a34a',
            'Khuyến mãi',
            fmtVND(fareResult ? -fareResult.discountAmount : PROMO) + 'đ',
            '#16a34a'
          )}

          <View style={styles.dashedDivider} />

          {/* Bạn nhận được — dòng nổi bật */}
          <View style={styles.receiveRow}>
            <Text style={styles.receiveLabel}>Bạn nhận được</Text>
            <Text style={styles.receiveValue}>{fmtVND(driverReceive)}đ</Text>
          </View>
        </View>

        {/* Ghi chú bảo mật */}
        <TouchableOpacity style={styles.secureCard} activeOpacity={0.85}>
          <View style={styles.secureIcon}>
            <Ionicons name="shield-checkmark" size={18} color="#16a34a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.secureTitle}>Thanh toán an toàn & bảo mật</Text>
            <Text style={styles.secureSub}>Thông tin của bạn được bảo vệ tuyệt đối</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>

        <View style={{ height: 20 }} />
        <TouchableOpacity style={styles.homeBtn} activeOpacity={0.85} onPress={goHome}>
          <Ionicons name="home" size={17} color="white" />
          <Text style={styles.homeBtnText}>Quay về trang chủ</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderFareRow(
    icon: keyof typeof Ionicons.glyphMap,
    iconBg: string,
    iconColor: string,
    label: string,
    value: string,
    valueColor = '#111827'
  ) {
    return (
      <View style={styles.fareRowLine}>
        <View style={[styles.fareRowIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.fareRowLabel}>{label}</Text>
        <Text style={[styles.fareRowValue, { color: valueColor }]}>{value}</Text>
      </View>
    );
  }
}

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
  elevation: 4,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  plainBg: { flex: 1, backgroundColor: '#f3f4f6' },
  completedBg: { flex: 1, backgroundColor: '#f0fdf4' },

  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'white',
    ...SHADOW,
  },
  reportText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },

  topCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 16,
    zIndex: 15,
    ...SHADOW,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaCol: { flex: 1 },
  metaDivider: { width: 1, height: 34, backgroundColor: '#e5e7eb', marginHorizontal: 12 },
  metaLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  metaValue: { fontSize: 18, fontWeight: '800', color: '#111827' },

  waitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waitSub: { fontSize: 13, color: '#6b7280' },
  waitClock: { fontSize: 20, fontWeight: '800', color: '#111827' },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 22 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a' },
  dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  connector: { width: 1, height: 12, backgroundColor: '#e5e7eb', marginLeft: 4.5, marginVertical: 2 },
  routeName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#111827' },
  routeDist: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  estRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  estText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  floatCol: { position: 'absolute', right: 16, gap: 12, zIndex: 15 },
  floatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  navFloatBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
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
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 14 },

  paxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontSize: 14, fontWeight: '800' },
  paxName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  paxRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  paxRating: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  paxIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  noteRow: { flexDirection: 'row', marginTop: 12 },
  noteLabel: { fontSize: 12, color: '#6b7280' },
  noteText: { flex: 1, fontSize: 12, color: '#374151', fontWeight: '500' },

  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  fareLabel: { fontSize: 12, color: '#6b7280' },
  fareValue: { fontSize: 18, fontWeight: '800', color: '#2563EB', marginTop: 2 },
  payBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  payText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  // Pha tổng kết / hoàn thành
  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...SHADOW,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13, color: '#6b7280' },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 6 },
  thankText: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 14 },

  rateLabel: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 12, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center' },
  commentInput: {
    marginTop: 16,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    backgroundColor: '#f9fafb',
  },

  // Hero màn hoàn thành
  heroWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  confetti: { position: 'absolute', width: 10, height: 6, borderRadius: 2 },
  confettiDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  checkRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#bbf7d0',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  completedTitle: { fontSize: 22, fontWeight: '800', color: '#16a34a' },
  completedSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 6, textAlign: 'center' },

  detailHeading: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  fareRowLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  fareRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fareRowLabel: { flex: 1, fontSize: 14, color: '#374151' },
  fareRowValue: { fontSize: 16, fontWeight: '800' },
  rowDivider: { height: 1, backgroundColor: '#f3f4f6' },
  dashedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    marginVertical: 8,
  },
  receiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  receiveLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  receiveValue: { fontSize: 20, fontWeight: '800', color: '#111827' },

  secureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  secureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  secureSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  homeBtnText: { color: 'white', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
});
