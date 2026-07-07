import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';
import { useStatusBarStyle } from '../../../shared/hooks/useStatusBarStyle';

type Gender = 'male' | 'female' | 'other';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

const MOCK_USER = {
  name: 'Nguyen Van A',
  phone: '+84969668834',
  gender: null as Gender | null,
  dob: '',
};

function formatDob(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isDobValid(dob: string): boolean {
  if (!dob) return true;
  const parts = dob.split('/');
  if (parts.length !== 3) return false;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 1900 || y > new Date().getFullYear()) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}

export default function ProfileScreen({ navigation }: RootScreenProps<'Profile'>) {
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');

  const [name, setName] = useState(MOCK_USER.name);
  const [gender, setGender] = useState<Gender | null>(MOCK_USER.gender);
  const [dob, setDob] = useState(MOCK_USER.dob);
  const [saved, setSaved] = useState(false);

  const nameValid = name.trim().length >= 2;
  const dobValid = isDobValid(dob);
  const canSave = nameValid && dobValid;

  function handleDobChange(text: string) {
    const next = text.replace(/\D/g, '');
    setDob(formatDob(next));
  }

  function handleSave() {
    if (!canSave) return;
    // TODO: call PUT /driver/me
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Blue header */}
      <View style={{ backgroundColor: '#2563EB', paddingTop: insets.top }}>
        <View style={{ position: 'absolute', right: -30, top: insets.top - 10, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ position: 'absolute', left: -20, bottom: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)' }} />

        <View className="flex-row items-center px-5 pt-4 pb-6" style={{ gap: 14 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-white">Hồ sơ</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>
              Cập nhật thông tin cá nhân
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View className="items-center pt-8 pb-6">
          <View style={{ position: 'relative' }}>
            <View
              style={{
                width: 100, height: 100, borderRadius: 50,
                backgroundColor: '#eff6ff',
                borderWidth: 3, borderColor: '#2563EB',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="person" size={52} color="#2563EB" />
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: '#2563EB',
                borderWidth: 2.5, borderColor: '#f9fafb',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="camera" size={15} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
            Nhấn vào biểu tượng máy ảnh để thay đổi ảnh
          </Text>
        </View>

        {/* Form card */}
        <View className="mx-4 bg-white rounded-3xl overflow-hidden"
          style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}
        >
          {/* Họ và tên */}
          <View className="px-5 pt-5 pb-4">
            <Text className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Họ và tên</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nhập họ và tên"
              placeholderTextColor="#9ca3af"
              className="text-base font-medium text-gray-900 py-1"
              style={{ borderBottomWidth: 1.5, borderBottomColor: name.trim().length > 0 ? '#2563EB' : '#e5e7eb' }}
              autoCorrect={false}
            />
            {name.trim().length > 0 && name.trim().length < 2 && (
              <View className="flex-row items-center mt-1.5 gap-1">
                <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
                <Text className="text-xs text-red-500">Tên ít nhất 2 ký tự</Text>
              </View>
            )}
          </View>

          <View className="h-px bg-gray-50 mx-5" />

          {/* Số điện thoại — readonly */}
          <View className="px-5 py-4">
            <Text className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Số điện thoại</Text>
            <View className="flex-row items-center" style={{ borderBottomWidth: 1.5, borderBottomColor: '#e5e7eb' }}>
              <Text className="text-base font-medium text-gray-400 flex-1 py-1">{MOCK_USER.phone}</Text>
              <View
                style={{
                  paddingHorizontal: 8, paddingVertical: 3,
                  backgroundColor: '#f3f4f6', borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#9ca3af' }}>Không thể đổi</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Optional fields */}
        <View className="mx-4 mt-4 bg-white rounded-3xl overflow-hidden"
          style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}
        >
          {/* Giới tính */}
          <View className="px-5 pt-5 pb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Giới tính</Text>
              <Text className="text-xs text-gray-300">Tuỳ chọn</Text>
            </View>
            <View className="flex-row gap-2">
              {GENDERS.map(g => {
                const active = gender === g.value;
                return (
                  <TouchableOpacity
                    key={g.value}
                    onPress={() => setGender(prev => (prev === g.value ? null : g.value))}
                    activeOpacity={0.7}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: active ? '#2563EB' : '#e5e7eb',
                      backgroundColor: active ? '#eff6ff' : 'white',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: 14, fontWeight: '600',
                      color: active ? '#2563EB' : '#6b7280',
                    }}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="h-px bg-gray-50 mx-5" />

          {/* Ngày sinh */}
          <View className="px-5 py-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ngày sinh</Text>
              <Text className="text-xs text-gray-300">Tuỳ chọn</Text>
            </View>
            <View className="flex-row items-center" style={{ borderBottomWidth: 1.5, borderBottomColor: dob ? '#2563EB' : '#e5e7eb' }}>
              <Ionicons name="calendar-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
              <TextInput
                value={dob}
                onChangeText={handleDobChange}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                className="flex-1 text-base font-medium text-gray-900 py-1"
                maxLength={10}
              />
            </View>
            {dob.length > 0 && !dobValid && (
              <View className="flex-row items-center mt-1.5 gap-1">
                <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
                <Text className="text-xs text-red-500">Ngày sinh không hợp lệ</Text>
              </View>
            )}
          </View>
        </View>

        {/* Save button */}
        <View className="mx-4 mt-6">
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            className="rounded-2xl py-4 items-center flex-row justify-center gap-2"
            style={{ backgroundColor: canSave ? '#2563EB' : '#e5e7eb' }}
            disabled={!canSave}
          >
            {saved
              ? <Ionicons name="checkmark-circle" size={20} color="white" />
              : <Ionicons name="save-outline" size={18} color={canSave ? 'white' : '#9ca3af'} />
            }
            <Text style={{ fontSize: 16, fontWeight: '700', color: canSave ? 'white' : '#9ca3af' }}>
              {saved ? 'Đã lưu!' : 'Lưu thay đổi'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
