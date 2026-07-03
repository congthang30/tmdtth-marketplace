import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { PaginatedResult, PaginationMeta } from '../types/api-response.type';

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
  take: number;
};

export function getPaginationParams(
  query: PaginationQueryDto,
): PaginationParams {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function createPaginationMeta({
  page,
  limit,
  total,
}: {
  page: number;
  limit: number;
  total: number;
}): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function createPaginatedResult<TItem>({
  items,
  page,
  limit,
  total,
  message,
}: {
  items: TItem[];
  page: number;
  limit: number;
  total: number;
  message?: string;
}): PaginatedResult<TItem> {
  return {
    items,
    message,
    meta: createPaginationMeta({ page, limit, total }),
  };
}
