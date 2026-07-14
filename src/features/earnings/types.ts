// Kỳ thống kê thu nhập backend hỗ trợ.
export type EarningsPeriod = 'today' | 'week' | 'month';

// Một điểm trên biểu đồ thu nhập theo ngày.
export interface DailyEarning {
  /** Ngày dạng ISO "YYYY-MM-DD" */
  date: string;
  /** Thu nhập trong ngày (VND) */
  amount: number;
}

// Response GET /drivers/me/earnings?period=...
export interface EarningsResponse {
  period: EarningsPeriod;
  /** Khoảng thống kê (ISO "YYYY-MM-DD") */
  fromDate: string;
  toDate: string;
  /** Tổng thu nhập gộp trong kỳ (VND) */
  grossAmount: number;
  /** Số chuyến hoàn thành trong kỳ */
  tripCount: number;
  /** Tổng quãng đường (km) */
  distanceKm: number;
  /** Tổng thời gian online (giây) */
  onlineSeconds: number;
  /** Thu nhập theo từng ngày để vẽ biểu đồ */
  daily: DailyEarning[];
}
