export type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  meta?: ApiMeta;
};

export type ApiErrorPayload = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
};
