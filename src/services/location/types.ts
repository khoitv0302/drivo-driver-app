// Body của POST /location/heartbeat. Cố ý trùng shape với tham số của hub method
// UpdateLocation để 2 kênh (SignalR / HTTP) gửi đúng cùng một dữ liệu — backend feed
// chung một pipeline: presence, GEO candidate set, relay live-tracking cho khách.
// driverId LẤY TỪ JWT, không bao giờ nằm trong body.
export type LocationHeartbeatPayload = {
  lat: number;
  lng: number;
  /** Bắt buộc — backend dùng làm key cho set geo:online:{vehicleType} */
  vehicleType: string;
  heading?: number;
  speed?: number;
};
