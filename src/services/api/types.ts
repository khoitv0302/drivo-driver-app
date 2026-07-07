// Kiểu dữ liệu dùng chung cho toàn bộ tầng API.

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

// Một lỗi field-level backend trả về, ví dụ:
// { code: "PHONE_INVALID_VN_E164", message: "...", field: "phone" }
export interface ApiFieldError {
  code: string;
  message: string;
  field?: string | null;
}

// Body lỗi chuẩn của backend Drivo (HTTP 4xx/5xx).
export interface ApiErrorResponse {
  errors: ApiFieldError[];
  traceId?: string;
  culture?: string;
}

// Lỗi đã được chuẩn hoá sau khi qua interceptor — feature code bắt kiểu này.
export class ApiError extends Error {
  /** HTTP status, 0 nếu lỗi mạng/không có response */
  readonly status: number;
  /** Danh sách lỗi field-level từ backend (nếu có) */
  readonly errors: ApiFieldError[];
  readonly traceId?: string;

  constructor(message: string, status: number, errors: ApiFieldError[] = [], traceId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.traceId = traceId;
  }

  /** Lấy message của lỗi ở một field cụ thể (vd 'phone') nếu có */
  fieldError(field: string): string | undefined {
    return this.errors.find((e) => e.field === field)?.message;
  }
}
