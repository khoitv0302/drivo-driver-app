import { useEffect, useMemo, useRef, useState } from 'react';

type LngLat = [number, number];

/**
 * Giả lập vị trí tài xế di chuyển dọc theo lộ trình (mock để test UI khi chưa có backend).
 *
 * 👉 Khi tích hợp backend: bỏ hook này, thay `coord`/`remainingKm`/`heading`
 *    bằng dữ liệu vị trí realtime nhận từ socket / API rồi truyền thẳng vào TripMap.
 */

const EARTH_R = 6371000; // bán kính Trái Đất (m)

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

/** Khoảng cách Haversine giữa 2 điểm [lng, lat] (mét) */
function distanceMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Hướng di chuyển (độ, 0 = Bắc) từ a tới b */
function bearing(a: LngLat, b: LngLat): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function lerp(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

type Options = {
  enabled: boolean;
  /** Tốc độ giả lập (km/h) */
  speedKmh?: number;
};

type Result = {
  /** Vị trí tài xế hiện tại — null khi không giả lập */
  coord: LngLat | null;
  /** Phần lộ trình còn lại (từ vị trí hiện tại tới đích) — để chỉ vẽ đoạn phía trước */
  remainingRoute: LngLat[] | null;
  /** Quãng đường còn lại tới đích (km) */
  remainingKm: number;
  /** Hướng đầu xe (độ) */
  heading: number;
};

export function useDriverSimulation(route: LngLat[] | null, { enabled, speedKmh = 32 }: Options): Result {
  const [coord, setCoord] = useState<LngLat | null>(null);
  const [remainingRoute, setRemainingRoute] = useState<LngLat[] | null>(null);
  const [remainingKm, setRemainingKm] = useState(0);
  const [heading, setHeading] = useState(0);

  // Độ dài từng đoạn + tổng chiều dài lộ trình (mét)
  const geo = useMemo(() => {
    if (!route || route.length < 2) return { lengths: [] as number[], total: 0 };
    const lengths: number[] = [];
    let total = 0;
    for (let i = 1; i < route.length; i++) {
      const d = distanceMeters(route[i - 1], route[i]);
      lengths.push(d);
      total += d;
    }
    return { lengths, total };
  }, [route]);

  const lastRoundedRef = useRef(-1);

  useEffect(() => {
    if (!enabled || !route || route.length < 2 || geo.total === 0) {
      setCoord(null);
      setRemainingRoute(null);
      return;
    }

    // Đặt lại về đầu lộ trình
    setCoord(route[0]);
    setRemainingRoute(route);
    setRemainingKm(geo.total / 1000);
    setHeading(bearing(route[0], route[1]));
    lastRoundedRef.current = -1;

    let traveled = 0; // mét đã đi
    const speed = (speedKmh * 1000) / 3600; // m/s
    const tickMs = 250;

    const id = setInterval(() => {
      traveled = Math.min(traveled + speed * (tickMs / 1000), geo.total);

      // Tìm đoạn chứa vị trí hiện tại và nội suy toạ độ
      let acc = 0;
      let pos: LngLat = route[route.length - 1];
      let head = heading;
      let segIndex = route.length - 1;
      for (let i = 0; i < geo.lengths.length; i++) {
        if (acc + geo.lengths[i] >= traveled) {
          const t = geo.lengths[i] === 0 ? 0 : (traveled - acc) / geo.lengths[i];
          pos = lerp(route[i], route[i + 1], t);
          head = bearing(route[i], route[i + 1]);
          segIndex = i;
          break;
        }
        acc += geo.lengths[i];
      }

      setCoord(pos);
      setHeading(head);
      // Đoạn còn lại phía trước: vị trí hiện tại + các đỉnh chưa đi qua
      setRemainingRoute([pos, ...route.slice(segIndex + 1)]);

      // Chỉ cập nhật quãng đường còn lại khi đổi tới mức 0.1km (giảm re-render)
      const rem = (geo.total - traveled) / 1000;
      const rounded = Math.round(rem * 10) / 10;
      if (rounded !== lastRoundedRef.current) {
        lastRoundedRef.current = rounded;
        setRemainingKm(rem);
      }

      if (traveled >= geo.total) clearInterval(id);
    }, tickMs);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, route, geo, speedKmh]);

  return { coord, remainingRoute, remainingKm, heading };
}
