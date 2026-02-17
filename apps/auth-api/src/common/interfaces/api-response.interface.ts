export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  errors: any;
  meta: {
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
    [key: string]: any;
  };
}
