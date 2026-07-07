// Khoảng cách đường chim bay giữa 2 toạ độ [lng, lat] (km) — công thức haversine.
// Dùng để ước lượng nhanh trên client; khoảng cách lộ trình thật lấy từ Directions API.
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371; // bán kính Trái Đất (km)
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
