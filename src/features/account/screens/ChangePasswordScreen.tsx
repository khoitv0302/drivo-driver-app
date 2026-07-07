import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';
import { useStatusBarStyle } from '../../../shared/hooks/useStatusBarStyle';

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------
type Strength = 0 | 1 | 2 | 3;

function getStrength(password: string): Strength {
  if (password.length === 0) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score as Strength;
}

const STRENGTH_LABEL: Record<Strength, { label: string; color: string }> = {
  0: { label: '', color: '#e5e7eb' },
  1: { label: 'Yếu', color: '#ef4444' },
  2: { label: 'Trung bình', color: '#f59e0b' },
  3: { label: 'Mạnh', color: '#22c55e' },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
};

function PasswordField({ label, value, onChange, error, placeholder }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-gray-700 mb-1.5">{label}</Text>
      <View
        className={`flex-row items-center bg-white rounded-2xl px-4 ${error ? 'border border-red-400' : 'border border-gray-200'}`}
        style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          placeholder={placeholder ?? '••••••••'}
          placeholderTextColor="#9ca3af"
          className="flex-1 text-gray-900 py-4 text-base"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setVisible(v => !v)} activeOpacity={0.6} className="pl-2 py-2">
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
      {error ? (
        <View className="flex-row items-center mt-1.5 gap-1">
          <Ionicons name="alert-circle-outline" size={13} color="#ef4444" />
          <Text className="text-xs text-red-500">{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function ChangePasswordScreen({ navigation }: RootScreenProps<'ChangePassword'>) {
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');

  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ next?: string; confirm?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const strength = getStrength(next);
  const strengthInfo = STRENGTH_LABEL[strength];

  function validate() {
    const e: typeof errors = {};
    if (next.length < 8) e.next = 'Mật khẩu tối thiểu 8 ký tự';
    if (!confirm) e.confirm = 'Vui lòng xác nhận mật khẩu mới';
    else if (next !== confirm) e.confirm = 'Mật khẩu xác nhận không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    // TODO: call API
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-5">
          <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
        </View>
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">Đổi mật khẩu thành công!</Text>
        <Text className="text-sm text-gray-500 text-center leading-5 mb-8">
          Mật khẩu của bạn đã được cập nhật. Vui lòng sử dụng mật khẩu mới cho lần đăng nhập tiếp theo.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          className="w-full rounded-2xl py-4 items-center"
          style={{ backgroundColor: '#2563EB' }}
        >
          <Text className="text-white font-bold text-base">Về trang tài khoản</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={{ backgroundColor: '#2563EB', paddingTop: insets.top }}>
        {/* Decorative circles */}
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
            <Text className="text-xl font-bold text-white">Đổi mật khẩu</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>
              Cập nhật mật khẩu tài khoản của bạn
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Lock icon card */}
        <View className="items-center py-6 mb-2">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#EFF6FF' }}>
            <Ionicons name="lock-closed" size={30} color="#2563EB" />
          </View>
          <Text className="text-sm text-gray-500 text-center leading-5">
            Để bảo mật tài khoản, hãy sử dụng mật khẩu{'\n'}có ít nhất 8 ký tự, bao gồm chữ và số.
          </Text>
        </View>

        {/* Form */}
        <PasswordField
          label="Mật khẩu mới"
          value={next}
          onChange={v => { setNext(v); setErrors(e => ({ ...e, next: undefined })); }}
          error={errors.next}
          placeholder="Tối thiểu 8 ký tự"
        />

        {/* Strength indicator */}
        {next.length > 0 && (
          <View className="mb-5 -mt-3">
            <View className="flex-row gap-1.5 mb-1">
              {[1, 2, 3].map(i => (
                <View
                  key={i}
                  className="flex-1 h-1 rounded-full"
                  style={{ backgroundColor: strength >= i ? strengthInfo.color : '#e5e7eb' }}
                />
              ))}
            </View>
            <Text className="text-xs" style={{ color: strengthInfo.color }}>
              Độ mạnh: {strengthInfo.label}
            </Text>
          </View>
        )}

        <PasswordField
          label="Xác nhận mật khẩu mới"
          value={confirm}
          onChange={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: undefined })); }}
          error={errors.confirm}
          placeholder="Nhập lại mật khẩu mới"
        />

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.85}
          className="rounded-2xl py-4 items-center mt-2"
          style={{ backgroundColor: '#2563EB' }}
        >
          <Text className="text-white font-bold text-base">Cập nhật mật khẩu</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
