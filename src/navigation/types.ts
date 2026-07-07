import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Phương thức nhận mã OTP
export type OtpMethod = 'sms' | 'zalo';

// Một địa điểm trong lộ trình chuyến — [lng, lat] theo chuẩn Mapbox
export type TripPlace = {
  name: string;
  address?: string;
  distanceKm: number;
  coord: [number, number];
};

// Tham số truyền vào màn chuyến đang chạy (sau khi nhận chuyến)
export type ActiveTripParams = {
  /** Id chuyến từ response accept offer — cần cho các API /trips/{tripId}/...
   *  Optional: chuyến giả lập không có id, các nút chỉ đổi pha cục bộ. */
  tripId?: string;
  pickup: TripPlace;
  dropoff: TripPlace;
  passenger: { name: string; rating: number; note?: string };
  /** Giá cước hiển thị cho khách */
  fare: number;
  /** Nhãn phương thức thanh toán, vd "Tiền mặt" */
  payment: string;
};

// Root stack — luồng auth + app chính
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Otp: {
    /** Số điện thoại / email đã nhập, hiển thị trên màn OTP */
    contact: string;
    /** Kênh gửi OTP — đặt từ màn Đăng ký (sms / zalo) */
    method?: OtpMethod;
  };
  Main: undefined;
  ActiveTrip: ActiveTripParams;
  Notifications: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  TermsPolicy: undefined;
  SupportCenter: undefined;
  CompanyInfo: undefined;
};

// Bottom tabs của app chính
export type MainTabParamList = {
  Home: undefined;
  Trips: undefined;
  Earnings: undefined;
  Account: undefined;
};

// Helper props cho screen trong root stack
export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Helper props cho screen trong tab (gộp cả root để navigate ra ngoài tab)
export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
