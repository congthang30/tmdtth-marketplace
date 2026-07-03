export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
};

export type ApiSuccessBody<TData = unknown, TMeta = unknown> = {
  success: true;
  data: TData;
  message: string;
  meta?: TMeta;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<TItem> = {
  items: TItem[];
  meta: PaginationMeta;
  message?: string;
};
