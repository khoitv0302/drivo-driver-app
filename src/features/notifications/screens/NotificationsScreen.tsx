import { useState } from 'react';
import {
  SectionList,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';
import type { Notification, NotificationSection } from '../types';
import { useStatusBarStyle } from '../../../shared/hooks/useStatusBarStyle';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type FilterType = 'all' | Notification['type'];

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'trip', label: 'Chuyến đi' },
  { key: 'payment', label: 'Thu nhập' },
  { key: 'system', label: 'Cập nhật' },
];

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: IconName; color: string; bg: string }
> = {
  promotion: { icon: 'gift-outline', color: '#f59e0b', bg: '#fffbeb' },
  trip:      { icon: 'car-outline', color: '#2563EB', bg: '#EFF6FF' },
  payment:   { icon: 'wallet-outline', color: '#16a34a', bg: '#f0fdf4' },
  system:    { icon: 'information-circle-outline', color: '#6b7280', bg: '#f3f4f6' },
};

const INITIAL_SECTIONS: NotificationSection[] = [
  {
    title: 'Hôm nay',
    data: [
      {
        id: '1',
        type: 'promotion',
        title: 'Thưởng giờ cao điểm!',
        body: 'Hoàn thành 5 chuyến trong khung 17h–19h hôm nay để nhận thưởng 50.000đ.',
        time: '5 phút trước',
        isRead: false,
      },
      {
        id: '2',
        type: 'trip',
        title: 'Chuyến đi đã hoàn thành',
        body: 'Chuyến từ Nguyễn Huệ, Quận 1 đến Sân bay Tân Sơn Nhất đã hoàn thành.',
        time: '2 giờ trước',
        isRead: false,
      },
      {
        id: '3',
        type: 'payment',
        title: 'Đã nhận thu nhập',
        body: 'Bạn nhận được 120.000đ cho chuyến vừa hoàn thành.',
        time: '2 giờ trước',
        isRead: false,
      },
    ],
  },
  {
    title: 'Hôm qua',
    data: [
      {
        id: '4',
        type: 'trip',
        title: 'Khách hàng đã đánh giá bạn',
        body: 'Bạn nhận được 5 sao từ khách hàng cho chuyến đi hôm qua. Cảm ơn bạn!',
        time: 'Hôm qua, 21:30',
        isRead: true,
      },
      {
        id: '5',
        type: 'payment',
        title: 'Đối soát tuần',
        body: 'Thu nhập tuần của bạn là 2.450.000đ đã được chuyển vào tài khoản.',
        time: 'Hôm qua, 09:00',
        isRead: true,
      },
    ],
  },
  {
    title: 'Trước đó',
    data: [
      {
        id: '6',
        type: 'system',
        title: 'Tài khoản đã được xác minh',
        body: 'Hồ sơ tài xế của bạn đã được xác minh thành công. Bạn có thể bắt đầu nhận chuyến.',
        time: '13/06/2026',
        isRead: true,
      },
      {
        id: '7',
        type: 'system',
        title: 'Chào mừng đến với Drivo Tài xế!',
        body: 'Cảm ơn bạn đã trở thành đối tác tài xế. Bật trực tuyến để bắt đầu nhận chuyến ngay!',
        time: '10/06/2026',
        isRead: true,
      },
    ],
  },
];

function filterSections(sections: NotificationSection[], filter: FilterType): NotificationSection[] {
  if (filter === 'all') return sections;
  const typeMap: Partial<Record<FilterType, Notification['type'][]>> = {
    trip: ['trip'],
    payment: ['payment'],
    system: ['system', 'promotion'],
  };
  const allowed = typeMap[filter] ?? [];
  return sections
    .map(s => ({ ...s, data: s.data.filter(n => allowed.includes(n.type)) }))
    .filter(s => s.data.length > 0);
}

export default function NotificationsScreen({ navigation }: RootScreenProps<'Notifications'>) {
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');
  const [sections, setSections] = useState<NotificationSection[]>(INITIAL_SECTIONS);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const unreadCount = sections.flatMap(s => s.data).filter(n => !n.isRead).length;
  const displayedSections = filterSections(sections, activeFilter);

  const markAllRead = () => {
    setSections(prev =>
      prev.map(section => ({
        ...section,
        data: section.data.map(n => ({ ...n, isRead: true })),
      }))
    );
  };

  const markRead = (id: string) => {
    setSections(prev =>
      prev.map(section => ({
        ...section,
        data: section.data.map(n => (n.id === id ? { ...n, isRead: true } : n)),
      }))
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Blue header */}
      <View className="bg-primary overflow-hidden" style={{ paddingTop: insets.top }}>
        <View
          style={{
            position: 'absolute', right: -40, top: insets.top - 20,
            width: 200, height: 200, borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.07)',
          }}
        />
        <View
          style={{
            position: 'absolute', left: -20, bottom: -30,
            width: 120, height: 120, borderRadius: 60,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        />

        {/* Title row */}
        <View className="flex-row items-center px-5 pt-4 pb-3" style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="flex-1 text-xl font-bold text-white">Thông báo</Text>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllRead}
              activeOpacity={0.7}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: activeFilter === f.key ? 'white' : 'rgba(255,255,255,0.2)',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: activeFilter === f.key ? '#2563EB' : 'rgba(255,255,255,0.9)',
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notification list */}
      <SectionList
        sections={displayedSections}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }}>
            <Text
              style={{
                fontSize: 11, fontWeight: '700', color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: 0.8,
              }}
            >
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const cfg = TYPE_CONFIG[item.type];
          return (
            <TouchableOpacity
              onPress={() => markRead(item.id)}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'flex-start',
                paddingHorizontal: 16, paddingVertical: 14,
                backgroundColor: item.isRead ? 'white' : '#f0f6ff',
                borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12,
              }}
            >
              <View
                style={{
                  width: 46, height: 46, borderRadius: 23,
                  backgroundColor: cfg.bg, alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Ionicons name={cfg.icon} size={22} color={cfg.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14, fontWeight: item.isRead ? '500' : '700',
                    color: '#111827', lineHeight: 20,
                  }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={{ fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 18 }}
                  numberOfLines={2}
                >
                  {item.body}
                </Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
                  {item.time}
                </Text>
              </View>

              {!item.isRead && (
                <View
                  style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: '#2563EB', marginTop: 6, flexShrink: 0,
                  }}
                />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <View
              style={{
                width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}
            >
              <Ionicons name="notifications-outline" size={36} color="#d1d5db" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#9ca3af' }}>
              Chưa có thông báo
            </Text>
          </View>
        }
      />
    </View>
  );
}
