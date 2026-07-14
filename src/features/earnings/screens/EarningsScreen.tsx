import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '../../../shared/components/ui/Card';
import { useStatusBarStyle } from '../../../shared/hooks/useStatusBarStyle';
import { useEarnings } from '../api/useEarnings';
import type { EarningsPeriod } from '../types';

const PERIODS: { key: EarningsPeriod; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
];

const AVAILABLE_BALANCE = 2450000;

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// "2026-07-13" → "T2" | ... | "CN" (không lệ thuộc timezone thiết bị).
function weekdayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return WEEKDAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// Giây online → chuỗi giờ gọn, vd 300 → "0.1", 23400 → "6.5".
function fmtHours(seconds: number): string {
  return (seconds / 3600).toFixed(1);
}

type Activity = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  sub: string;
  amount: number;
};

const ACTIVITIES: Activity[] = [
  { id: '1', icon: 'car', color: '#2563EB', bg: '#EFF6FF', title: 'Chuyến đi', sub: 'Nguyễn Huệ → Sân bay Tân Sơn Nhất', amount: 120000 },
  { id: '2', icon: 'gift', color: '#f59e0b', bg: '#fffbeb', title: 'Thưởng giờ cao điểm', sub: 'Hoàn thành 5 chuyến 17h–19h', amount: 50000 },
  { id: '3', icon: 'car', color: '#2563EB', bg: '#EFF6FF', title: 'Chuyến đi', sub: 'Landmark 81 → Vincom Đồng Khởi', amount: 68000 },
  { id: '4', icon: 'arrow-up', color: '#dc2626', bg: '#fef2f2', title: 'Rút tiền về ngân hàng', sub: 'MB Bank ****414', amount: -500000 },
  { id: '5', icon: 'car', color: '#2563EB', bg: '#EFF6FF', title: 'Chuyến đi', sub: 'Nhà thờ Đức Bà → Cảng Cát Lái', amount: 215000 },
];

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN');
}

const CHART_HEIGHT = 110;

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<EarningsPeriod>('week');

  // Header xanh trên cùng → chữ status bar màu trắng
  useStatusBarStyle('light');

  const { data, isLoading, isError, refetch } = useEarnings(period);

  const chart = (data?.daily ?? []).map(d => ({ day: weekdayLabel(d.date), value: d.amount }));
  const maxChart = Math.max(1, ...chart.map(d => d.value));

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Blue header: số dư + rút tiền ── */}
        <View className="bg-primary overflow-hidden" style={{ paddingTop: insets.top }}>
          <View style={{ position: 'absolute', right: -50, top: insets.top - 10, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <View style={{ position: 'absolute', left: -30, bottom: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.05)' }} />

          <View className="px-5 pt-4 pb-6">
            <Text className="text-lg font-bold text-white mb-4">Thu nhập</Text>

            <Text className="text-sm text-white/70">Số dư khả dụng</Text>
            <Text className="text-3xl font-extrabold text-white mt-1">{fmtVND(AVAILABLE_BALANCE)}đ</Text>

            <TouchableOpacity
              activeOpacity={0.85}
              className="flex-row items-center justify-center bg-white rounded-2xl py-3.5 mt-4"
              style={{ gap: 8 }}
            >
              <Ionicons name="cash-outline" size={19} color="#2563EB" />
              <Text className="text-base font-bold" style={{ color: '#2563EB' }}>Rút tiền</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Period selector ── */}
        <View className="flex-row bg-white mx-4 mt-4 rounded-2xl p-1" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          {PERIODS.map(p => {
            const active = period === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPeriod(p.key)}
                activeOpacity={0.7}
                className="flex-1 py-2.5 rounded-xl items-center"
                style={{ backgroundColor: active ? '#2563EB' : 'transparent' }}
              >
                <Text className="text-sm font-semibold" style={{ color: active ? 'white' : '#6b7280' }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Earning tổng + lưới thống kê ── */}
        <Card className="mx-4 mt-4 p-5">
          <Text className="text-sm text-gray-400">Thu nhập {PERIODS.find(p => p.key === period)?.label.toLowerCase()}</Text>

          {isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#2563EB" />
            </View>
          ) : isError ? (
            <View className="py-6 items-center">
              <Text className="text-sm text-gray-400 mb-2">Không tải được dữ liệu</Text>
              <TouchableOpacity onPress={() => refetch()} activeOpacity={0.7}>
                <Text className="text-sm font-semibold" style={{ color: '#2563EB' }}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text className="text-2xl font-extrabold text-gray-900 mt-1">{fmtVND(data?.grossAmount ?? 0)}đ</Text>

              <View className="flex-row flex-wrap mt-4" style={{ rowGap: 16 }}>
                <StatItem icon="car-sports" label="Chuyến" value={`${data?.tripCount ?? 0}`} />
                <StatItem icon="clock-outline" label="Giờ online" value={`${fmtHours(data?.onlineSeconds ?? 0)}h`} />
                <StatItem icon="map-marker-distance" label="Quãng đường" value={`${data?.distanceKm ?? 0} km`} />
                <StatItem icon="cash-multiple" label="Thu nhập" value={`${fmtVND(data?.grossAmount ?? 0)}đ`} />
              </View>
            </>
          )}
        </Card>

        {/* ── Biểu đồ tuần ── */}
        <Card className="mx-4 mt-4 p-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-sm font-bold text-gray-900">Thu nhập 7 ngày</Text>
            <Text className="text-xs text-gray-400">nghìn đồng</Text>
          </View>

          {chart.length === 0 ? (
            <View style={{ height: CHART_HEIGHT }} className="items-center justify-center">
              <Text className="text-xs text-gray-400">Chưa có dữ liệu</Text>
            </View>
          ) : (
            <View className="flex-row items-end justify-between" style={{ height: CHART_HEIGHT }}>
              {chart.map((d, i) => {
                const isToday = i === chart.length - 1;
                const h = Math.max(6, (d.value / maxChart) * CHART_HEIGHT);
                return (
                  <View key={i} className="items-center" style={{ flex: 1 }}>
                    <Text className="text-[10px] font-semibold mb-1" style={{ color: isToday ? '#2563EB' : '#9ca3af' }}>
                      {Math.round(d.value / 1000)}
                    </Text>
                    <View
                      style={{
                        width: 18,
                        height: h,
                        borderRadius: 6,
                        backgroundColor: isToday ? '#2563EB' : '#dbeafe',
                      }}
                    />
                    <Text className="text-[11px] mt-1.5" style={{ color: isToday ? '#2563EB' : '#9ca3af', fontWeight: isToday ? '700' : '400' }}>
                      {d.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* ── Hoạt động gần đây ── */}
        <View className="flex-row items-center justify-between mx-4 mt-5 mb-2">
          <Text className="text-base font-bold text-gray-900">Hoạt động gần đây</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text className="text-sm font-medium" style={{ color: '#2563EB' }}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <Card className="mx-4 overflow-hidden">
          {ACTIVITIES.map((a, idx) => (
            <View key={a.id}>
              <View className="flex-row items-center px-4 py-3.5">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: a.bg }}>
                  <Ionicons name={a.icon} size={19} color={a.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">{a.title}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{a.sub}</Text>
                </View>
                <Text
                  className="text-sm font-bold"
                  style={{ color: a.amount < 0 ? '#dc2626' : '#16a34a' }}
                >
                  {a.amount < 0 ? '-' : '+'}{fmtVND(Math.abs(a.amount))}đ
                </Text>
              </View>
              {idx < ACTIVITIES.length - 1 && <View className="h-px bg-gray-100 mx-4" />}
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

function StatItem({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-row items-center" style={{ width: '50%' }}>
      <View className="w-9 h-9 rounded-xl bg-primary-light items-center justify-center mr-2.5">
        <MaterialCommunityIcons name={icon} size={18} color="#2563EB" />
      </View>
      <View>
        <Text className="text-xs text-gray-400">{label}</Text>
        <Text className="text-sm font-bold text-gray-900 mt-0.5">{value}</Text>
      </View>
    </View>
  );
}
