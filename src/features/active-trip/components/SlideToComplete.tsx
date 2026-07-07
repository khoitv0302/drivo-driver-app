import { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  label: string;
  onComplete: () => void;
};

const TRACK_HEIGHT = 56;
const THUMB = 48;
const PAD = 4;

/**
 * Nút "kéo để hoàn thành" — trượt thumb hết chiều ngang mới kích hoạt onComplete.
 *
 * Lưu ý kỹ thuật:
 *  - Dùng useNativeDriver: false xuyên suốt vì ta gọi setValue() trong lúc kéo;
 *    trộn native-driver + setValue sẽ làm giá trị "đóng băng" sau lần chạm đầu.
 *  - Bật *Capture để giành gesture khỏi ScrollView cha (nếu không sẽ không kéo được).
 */
export default function SlideToComplete({ label, onComplete }: Props) {
  const [trackW, setTrackW] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  // Đọc qua ref để PanResponder (tạo 1 lần) luôn thấy giá trị mới nhất.
  const maxXRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const doneRef = useRef(false);
  onCompleteRef.current = onComplete;

  const maxX = Math.max(0, trackW - THUMB - PAD * 2);
  maxXRef.current = maxX;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 2,
      // Không nhường gesture cho ScrollView khi đang kéo
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        if (doneRef.current) return;
        const x = Math.min(Math.max(0, g.dx), maxXRef.current);
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, g) => settle(g.dx),
      onPanResponderTerminate: (_, g) => settle(g.dx),
    })
  ).current;

  function settle(dx: number) {
    if (doneRef.current) return;
    const m = maxXRef.current;
    const x = Math.min(Math.max(0, dx), m);
    if (m > 0 && x >= m - 8) {
      doneRef.current = true;
      Animated.timing(translateX, {
        toValue: m,
        duration: 120,
        useNativeDriver: false,
      }).start(() => onCompleteRef.current());
    } else {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: false,
        bounciness: 6,
      }).start();
    }
  }

  // Chữ mờ dần khi kéo để phản hồi tiến trình
  const labelOpacity = translateX.interpolate({
    inputRange: [0, Math.max(1, maxX)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={styles.track}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <Animated.Text style={[styles.label, { opacity: labelOpacity }]}>{label}</Animated.Text>

      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]}>
        <Ionicons name="chevron-forward" size={20} color="#2563EB" />
        <Ionicons name="chevron-forward" size={20} color="#93c5fd" style={styles.chevron2} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    paddingHorizontal: PAD,
    overflow: 'hidden',
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron2: { marginLeft: -12 },
});
