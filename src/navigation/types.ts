import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Root stack — sẽ mở rộng khi thêm auth flow và các feature khác
export type RootStackParamList = {
  Bootstrap: undefined;
};

// Helper props cho screen trong root stack
export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
