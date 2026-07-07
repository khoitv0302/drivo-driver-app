import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';
import { useAuthStore } from '../../../store';

const OTP_LENGTH = 6;
const EXPIRE_SECONDS = 150; // 02:30
const RESEND_SECONDS = 30; // 00:30

function formatTime(total: number) {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function OtpScreen({ navigation, route }: RootScreenProps<'Otp'>) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [expire, setExpire] = useState(EXPIRE_SECONDS);
  const [resend, setResend] = useState(RESEND_SECONDS);
  const setToken = useAuthStore(s => s.setToken);

  // Countdown hết hạn mã
  useEffect(() => {
    if (expire <= 0) return;
    const t = setInterval(() => setExpire((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [expire]);

  // Countdown gửi lại
  useEffect(() => {
    if (resend <= 0) return;
    const t = setInterval(() => setResend((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resend]);

  const handleChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setCode(digits);
  };

  const handleResend = () => {
    if (resend > 0) return;
    setResend(RESEND_SECONDS);
    setExpire(EXPIRE_SECONDS);
    setCode('');
  };

  const focusedIndex = code.length;
  const isComplete = code.length === OTP_LENGTH;

  const handleVerify = () => {
    if (!isComplete) return;
    Keyboard.dismiss();
    // Lưu token vào SecureStore — RootNavigator sẽ tự chuyển sang Main
    setToken('mock-token-' + Date.now());
  };

  return (
    <Pressable onPress={Keyboard.dismiss} className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-1 px-6">
        {/* Back */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center -ml-2 mt-2"
          activeOpacity={0.6}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        {/* Title */}
        <Text className="text-3xl font-bold text-gray-900 mt-6">Xác thực OTP</Text>
        <Text className="text-sm text-gray-400 mt-2 leading-5">
          Chúng tôi đã gửi mã xác thực tới số điện thoại
        </Text>
        <Text className="text-base font-semibold text-primary mt-1">{route.params.contact}</Text>

        {/* OTP boxes */}
        <Pressable onPress={() => inputRef.current?.focus()} className="flex-row justify-between mt-8">
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const char = code[i] ?? '';
            const isActive = i === focusedIndex || (focusedIndex === OTP_LENGTH && i === OTP_LENGTH - 1);
            return (
              <View
                key={i}
                className={`w-[52px] h-[58px] rounded-2xl border items-center justify-center ${
                  char ? 'border-primary bg-primary-light' : isActive ? 'border-primary' : 'border-gray-200'
                }`}
              >
                <Text className="text-2xl font-bold text-gray-900">{char}</Text>
              </View>
            );
          })}
        </Pressable>

        {/* Hidden input thực sự nhận ký tự */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          autoFocus
          className="absolute opacity-0 w-px h-px"
          caretHidden
        />

        {/* Expire countdown */}
        <View className="flex-row items-center justify-center mt-6 gap-1.5">
          <MaterialCommunityIcons name="shield-check-outline" size={15} color="#9ca3af" />
          <Text className="text-sm text-gray-400">
            Mã xác thực sẽ hết hạn sau <Text className="text-primary font-medium">{formatTime(expire)}</Text>
          </Text>
        </View>

        {/* Resend */}
        <View className="items-center mt-16">
          <Text className="text-sm text-gray-400">Chưa nhận được mã?</Text>
          <TouchableOpacity onPress={handleResend} disabled={resend > 0} activeOpacity={0.7} className="mt-2">
            <Text className={`text-base font-semibold ${resend > 0 ? 'text-gray-300' : 'text-primary'}`}>
              {resend > 0 ? `Gửi lại OTP (${formatTime(resend)})` : 'Gửi lại OTP'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* CTA button */}
        <TouchableOpacity
          className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-auto ${
            isComplete ? 'bg-primary' : 'bg-gray-200'
          }`}
          activeOpacity={0.85}
          disabled={!isComplete}
          onPress={handleVerify}
        >
          <Text className={`font-semibold text-base ${isComplete ? 'text-white' : 'text-gray-400'}`}>
            Tiếp tục
          </Text>
          <Ionicons name="arrow-forward" size={18} color={isComplete ? 'white' : '#9ca3af'} />
        </TouchableOpacity>

        {/* Security note */}
        <View
          className="flex-row items-center bg-primary-light rounded-2xl px-4 py-3.5 gap-3 mt-4"
          style={{ marginBottom: Math.max(insets.bottom, 20) }}
        >
          <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#2563EB" />
          <Text className="flex-1 text-sm text-gray-600 leading-5">
            Vì lý do bảo mật, vui lòng không chia sẻ mã xác thực cho người khác.
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
