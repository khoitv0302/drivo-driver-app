import { View, type ViewProps } from 'react-native';

type Props = ViewProps & {
  /** Thêm shadow nổi nhẹ */
  elevated?: boolean;
};

/**
 * Card — container trắng bo góc, dùng chung cho toàn app.
 * Mặc định có shadow nhẹ; tắt bằng elevated={false}.
 */
export default function Card({ elevated = true, className = '', style, children, ...rest }: Props) {
  return (
    <View
      className={`bg-white rounded-2xl ${className}`}
      style={[
        elevated && {
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
