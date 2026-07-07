import { useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TripCard from '../components/TripCard';
import type { DriverTrip, TripStatus } from '../types';
import { useStatusBarStyle } from '../../../shared/hooks/useStatusBarStyle';

type FilterKey = 'all' | TripStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const TRIPS: DriverTrip[] = [
  {
    id: '1',
    status: 'completed',
    date: '02/07/2026',
    time: '08:30',
    from: 'Nguyễn Huệ, Quận 1',
    to: 'Sân bay Tân Sơn Nhất',
    earning: 120000,
    distance: '7.2 km',
    duration: '22 phút',
    passengerName: 'Trần Thị Mai',
    passengerRating: 5.0,
    serviceType: 'car',
    payment: 'cash',
  },
  {
    id: '2',
    status: 'completed',
    date: '02/07/2026',
    time: '10:15',
    from: 'Landmark 81, Bình Thạnh',
    to: 'Vincom Đồng Khởi, Quận 1',
    earning: 68000,
    distance: '4.2 km',
    duration: '15 phút',
    passengerName: 'Lê Hoàng Nam',
    passengerRating: 4.0,
    serviceType: 'motorbike',
    payment: 'wallet',
  },
  {
    id: '3',
    status: 'cancelled',
    date: '01/07/2026',
    time: '19:45',
    from: 'Chợ Bến Thành, Quận 1',
    to: 'Đại học Bách Khoa TP.HCM',
    earning: 0,
    distance: '5.8 km',
    duration: '—',
    passengerName: 'Phạm Quốc Bảo',
    serviceType: 'motorbike',
    payment: 'cash',
  },
  {
    id: '4',
    status: 'completed',
    date: '01/07/2026',
    time: '14:20',
    from: 'Nhà thờ Đức Bà, Quận 1',
    to: 'Cảng Cát Lái, Quận 2',
    earning: 215000,
    distance: '18.3 km',
    duration: '42 phút',
    passengerName: 'Nguyễn Văn Khoa',
    passengerRating: 5.0,
    serviceType: 'car',
    payment: 'card',
  },
  {
    id: '5',
    status: 'completed',
    date: '30/06/2026',
    time: '22:05',
    from: 'Phố đi bộ Bùi Viện, Quận 1',
    to: 'Chung cư Sunrise City, Quận 7',
    earning: 95000,
    distance: '6.4 km',
    duration: '19 phút',
    passengerName: 'Đỗ Thu Hà',
    passengerRating: 4.5,
    serviceType: 'car',
    payment: 'cash',
  },
];

function EmptyState() {
  return (
    <View className="items-center" style={{ paddingTop: 80 }}>
      <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Ionicons name="car-outline" size={38} color="#d1d5db" />
      </View>
      <Text className="text-base font-semibold text-gray-400">Chưa có chuyến đi nào</Text>
      <Text className="text-sm text-gray-300 mt-1">Các chuyến bạn nhận sẽ xuất hiện ở đây</Text>
    </View>
  );
}

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterKey>('all');

  // Header xanh trên cùng → chữ status bar màu trắng
  useStatusBarStyle('light');

  const completedCount = TRIPS.filter(t => t.status === 'completed').length;
  const totalEarning = TRIPS.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.earning, 0);

  const data = useMemo(
    () => (filter === 'all' ? TRIPS : TRIPS.filter(t => t.status === filter)),
    [filter]
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Blue header */}
      <View className="bg-primary overflow-hidden" style={{ paddingTop: insets.top }}>
        <View style={{ position: 'absolute', right: -40, top: insets.top - 20, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <View style={{ position: 'absolute', left: -24, bottom: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.05)' }} />

        <View className="px-5 pt-4 pb-4">
          <Text className="text-2xl font-bold text-white">Chuyến đi</Text>

          {/* Summary chips */}
          <View className="flex-row mt-4" style={{ gap: 10 }}>
            <View className="flex-1 bg-white/15 rounded-2xl px-4 py-3">
              <Text className="text-xs text-white/70">Chuyến hoàn thành</Text>
              <Text className="text-lg font-bold text-white mt-0.5">{completedCount}</Text>
            </View>
            <View className="flex-1 bg-white/15 rounded-2xl px-4 py-3">
              <Text className="text-xs text-white/70">Tổng thu nhập</Text>
              <Text className="text-lg font-bold text-white mt-0.5">{totalEarning.toLocaleString('vi-VN')}đ</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter tabs */}
      <View className="flex-row bg-white px-4 py-3" style={{ gap: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: active ? '#2563EB' : '#f3f4f6' }}
            >
              <Text className="text-sm font-semibold" style={{ color: active ? 'white' : '#6b7280' }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TripCard trip={item} />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
}
