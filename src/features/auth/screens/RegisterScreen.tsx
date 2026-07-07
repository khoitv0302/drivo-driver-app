import { useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../../constants/routes';
import type { RootScreenProps, OtpMethod } from '../../../navigation/types';
import OtpMethodSheet from '../components/OtpMethodSheet';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_MIN_HEIGHT = SCREEN_HEIGHT * 0.6;

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    const max = digits.startsWith('0') ? 11 : 9;
    setValue(digits.slice(0, max));
  };

  const normalizePhone = (phone: string) => phone.replace(/^0+/, '');
  const isValid = normalizePhone(value).length >= 9;

  const handleContinue = () => {
    if (!isValid) return;
    Keyboard.dismiss();
    setSheetVisible(true);
  };

  const handleSelectMethod = (method: OtpMethod) => {
    setSheetVisible(false);
    navigation.navigate(ROUTES.OTP, { contact: `+84 ${normalizePhone(value)}`, method });
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Back — góc trái trên */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute left-4 z-10 w-10 h-10 items-center justify-center"
        style={{ top: insets.top + 6 }}
        activeOpacity={0.6}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={Keyboard.dismiss} className="flex-1">
          {/* Blue header — logo */}
          <View style={{ paddingTop: insets.top }} className="flex-1 items-center justify-center px-8">
            <View className="w-28 h-28 rounded-full bg-white/20 items-center justify-center">
              <MaterialCommunityIcons name="steering" size={64} color="white" />
            </View>
            <Text className="text-white/90 text-base font-medium text-center mt-5 leading-6">
              Tạo tài khoản tài xế để bắt đầu nhận chuyến
            </Text>
          </View>

          {/* White card */}
          <View
            className="bg-white rounded-t-3xl px-6 pt-3"
            style={{ minHeight: CARD_MIN_HEIGHT, paddingBottom: Math.max(insets.bottom, 28) }}
          >
            <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-6" />

            <Text className="text-3xl font-bold text-gray-900 text-center">Đăng ký tài xế</Text>
            <Text className="text-sm text-gray-400 text-center mt-2 mb-7 leading-5">
              Nhập số điện thoại để nhận mã xác thực
            </Text>

            {/* Label */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Số điện thoại</Text>

            {/* Phone input */}
            <View
              className={`flex-row items-center border rounded-2xl mb-5 overflow-hidden ${
                focused ? 'border-primary bg-primary-light' : 'border-gray-200'
              }`}
            >
              <TouchableOpacity
                className={`flex-row items-center px-3 py-4 border-r gap-1.5 ${
                  focused ? 'border-primary/30' : 'border-gray-200'
                }`}
                activeOpacity={0.7}
              >
                <Text className="text-base">🇻🇳</Text>
                <Text className="text-sm font-medium text-gray-700">+84</Text>
                <Ionicons name="chevron-down" size={13} color="#9ca3af" />
              </TouchableOpacity>
              <TextInput
                className="flex-1 px-3 py-4 text-base text-gray-900"
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
                autoCorrect={false}
                placeholderTextColor="#9ca3af"
                value={value}
                onChangeText={handlePhoneChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>

            {/* CTA button */}
            <TouchableOpacity
              className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
                isValid ? 'bg-primary' : 'bg-gray-200'
              }`}
              activeOpacity={0.85}
              disabled={!isValid}
              onPress={handleContinue}
            >
              <Text className={`font-semibold text-base ${isValid ? 'text-white' : 'text-gray-400'}`}>
                Tiếp tục
              </Text>
              <Ionicons name="arrow-forward" size={18} color={isValid ? 'white' : '#9ca3af'} />
            </TouchableOpacity>

            {/* Đã có tài khoản */}
            <View className="flex-row items-center justify-center mt-6">
              <Text className="text-sm text-gray-400">Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Text className="text-sm font-semibold text-primary">Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </ScrollView>

      <OtpMethodSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSelect={handleSelectMethod}
      />
    </View>
  );
}
