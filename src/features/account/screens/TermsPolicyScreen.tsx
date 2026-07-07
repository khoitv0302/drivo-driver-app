import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';
import { useStatusBarStyle } from '../../../shared/hooks/useStatusBarStyle';

const SECTIONS = [
  {
    title: '1. Điều khoản sử dụng',
    content: 'Bằng cách sử dụng ứng dụng Drivo Tài xế, bạn đồng ý tuân thủ các điều khoản và điều kiện được quy định trong tài liệu này. Drivo cung cấp nền tảng kết nối tài xế với khách hàng có nhu cầu di chuyển trên toàn quốc.',
  },
  {
    title: '2. Tài khoản tài xế',
    content: 'Tài xế có trách nhiệm bảo mật thông tin đăng nhập và cung cấp giấy tờ hợp lệ (GPLX, đăng ký xe, bảo hiểm). Mỗi tài xế chỉ được đăng ký một tài khoản. Drivo có quyền tạm khóa tài khoản vi phạm điều khoản.',
  },
  {
    title: '3. Chính sách nhận & huỷ chuyến',
    content: 'Tài xế nên hạn chế huỷ chuyến sau khi đã nhận. Tỷ lệ huỷ chuyến cao có thể ảnh hưởng tới điểm uy tín và khả năng nhận chuyến của tài xế theo quy định hiện hành.',
  },
  {
    title: '4. Thu nhập và đối soát',
    content: 'Thu nhập của tài xế được tính theo từng chuyến sau khi trừ phí nền tảng. Việc đối soát và thanh toán được thực hiện theo chu kỳ quy định. Tài xế có thể theo dõi chi tiết trong mục Thu nhập.',
  },
  {
    title: '5. Chính sách bảo mật',
    content: 'Drivo thu thập thông tin cá nhân của tài xế nhằm mục đích vận hành và cải thiện dịch vụ. Chúng tôi cam kết không chia sẻ thông tin cho bên thứ ba khi chưa có sự đồng ý, trừ khi pháp luật yêu cầu.',
  },
  {
    title: '6. Quyền sở hữu trí tuệ',
    content: 'Toàn bộ nội dung, giao diện và tính năng của ứng dụng Drivo thuộc quyền sở hữu của Công ty Cổ phần Drivo Việt Nam. Nghiêm cấm sao chép, phân phối khi chưa được phép.',
  },
  {
    title: '7. Giới hạn trách nhiệm',
    content: 'Drivo không chịu trách nhiệm cho các thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ. Trách nhiệm tối đa của Drivo không vượt quá giá trị giao dịch phát sinh sự cố.',
  },
  {
    title: '8. Thay đổi điều khoản',
    content: 'Drivo có quyền cập nhật điều khoản bất kỳ lúc nào. Tài xế sẽ được thông báo trước ít nhất 7 ngày khi có thay đổi quan trọng. Tiếp tục sử dụng dịch vụ đồng nghĩa với việc chấp nhận điều khoản mới.',
  },
];

export default function TermsPolicyScreen({ navigation }: RootScreenProps<'TermsPolicy'>) {
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View style={{ backgroundColor: '#2563EB', paddingTop: insets.top }}>
        <View style={{ position: 'absolute', right: -30, top: insets.top - 10, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View className="flex-row items-center px-5 pt-4 pb-6" style={{ gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-white">Điều khoản & Chính sách</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>Cập nhật lần cuối: 01/06/2026</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View className="bg-blue-50 rounded-2xl p-4 mb-4 flex-row" style={{ gap: 10 }}>
          <Ionicons name="information-circle" size={20} color="#2563EB" style={{ marginTop: 1 }} />
          <Text className="text-sm text-blue-700 flex-1 leading-5">
            Vui lòng đọc kỹ các điều khoản trước khi hoạt động. Sử dụng Drivo Tài xế đồng nghĩa với việc bạn đồng ý với tất cả điều khoản bên dưới.
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
            <Text className="text-sm font-bold text-gray-900 mb-2">{section.title}</Text>
            <Text className="text-sm text-gray-600 leading-6">{section.content}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
