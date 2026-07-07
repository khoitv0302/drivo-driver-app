import { Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '../../../shared/components/ui/Card';
import { getAvatarColor, getInitials } from '../../../shared/utils/avatar';
import type { DriverTrip, PaymentMethod } from '../types';

const STATUS_CONFIG = {
  completed: { label: 'Hoàn thành', textColor: '#16a34a', bgColor: '#f0fdf4', dotColor: '#16a34a' },
  cancelled: { label: 'Đã hủy', textColor: '#dc2626', bgColor: '#fef2f2', dotColor: '#dc2626' },
} as const;

const PAYMENT_CONFIG: Record<PaymentMethod, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  cash: { label: 'Tiền mặt', icon: 'cash-outline' },
  wallet: { label: 'Ví Drivo', icon: 'wallet-outline' },
  card: { label: 'Thẻ', icon: 'card-outline' },
};

interface Props {
  trip: DriverTrip;
}

export default function TripCard({ trip }: Props) {
  const status = STATUS_CONFIG[trip.status];
  const pay = PAYMENT_CONFIG[trip.payment];

  return (
    <Card className="mx-4 mb-3 overflow-hidden" style={{ borderWidth: 1, borderColor: '#e5e7eb' }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="w-8 h-8 rounded-lg bg-primary-light items-center justify-center">
            <MaterialCommunityIcons
              name={trip.serviceType === 'car' ? 'car' : 'motorbike'}
              size={18}
              color="#2563EB"
            />
          </View>
          <Text className="text-sm font-semibold text-gray-900">
            {trip.serviceType === 'car' ? 'Chuyến ô tô' : 'Chuyến xe máy'}
          </Text>
        </View>

        <View
          className="flex-row items-center px-2.5 py-1 rounded-full"
          style={{ backgroundColor: status.bgColor, gap: 5 }}
        >
          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.dotColor }} />
          <Text className="text-xs font-semibold" style={{ color: status.textColor }}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Date & meta */}
      <View className="px-4 pb-3 flex-row items-center flex-wrap" style={{ gap: 5 }}>
        <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
        <Text className="text-xs text-gray-400">{trip.date} • {trip.time}</Text>
        <Text className="text-gray-200">|</Text>
        <Ionicons name="time-outline" size={12} color="#9ca3af" />
        <Text className="text-xs text-gray-400">{trip.duration}</Text>
        <Text className="text-gray-200">|</Text>
        <Ionicons name="navigate-outline" size={12} color="#9ca3af" />
        <Text className="text-xs text-gray-400">{trip.distance}</Text>
      </View>

      {/* Route */}
      <View className="mx-4 mb-3 bg-gray-50 rounded-2xl px-3 py-3">
        <View className="flex-row" style={{ gap: 10 }}>
          <View className="items-center" style={{ width: 14 }}>
            <View
              className="w-3 h-3 rounded-full bg-white"
              style={{ borderWidth: 2, borderColor: '#2563EB', marginTop: 1 }}
            />
            <View className="w-px bg-gray-300 my-1" style={{ flex: 1, minHeight: 18 }} />
            <View className="w-3 h-3 rounded-full bg-red-500" />
          </View>
          <View className="flex-1" style={{ gap: 12 }}>
            <Text className="text-sm text-gray-700 leading-5" numberOfLines={1}>{trip.from}</Text>
            <Text className="text-sm text-gray-700 leading-5" numberOfLines={1}>{trip.to}</Text>
          </View>
        </View>
      </View>

      {/* Passenger info */}
      <View className="px-4 pb-3 flex-row items-center">
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: getAvatarColor(trip.passengerName) }}
        >
          <Text className="text-xs font-bold text-white">{getInitials(trip.passengerName)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">{trip.passengerName}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">Khách hàng</Text>
        </View>
        {trip.passengerRating != null && (
          <View className="flex-row items-center" style={{ gap: 3 }}>
            <Ionicons name="star" size={13} color="#f59e0b" />
            <Text className="text-sm font-bold text-gray-800">{trip.passengerRating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View
        className="px-4 py-3 flex-row items-center justify-between"
        style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
      >
        <View>
          <Text className="text-xs text-gray-400">Thu nhập</Text>
          <Text className="text-base font-bold" style={{ color: trip.status === 'cancelled' ? '#9ca3af' : '#16a34a' }}>
            {trip.status === 'cancelled' ? '—' : `+${trip.earning.toLocaleString('vi-VN')}đ`}
          </Text>
        </View>

        <View className="flex-row items-center px-2.5 py-1.5 rounded-full bg-gray-100" style={{ gap: 5 }}>
          <Ionicons name={pay.icon} size={13} color="#6b7280" />
          <Text className="text-xs font-medium text-gray-600">{pay.label}</Text>
        </View>
      </View>
    </Card>
  );
}
