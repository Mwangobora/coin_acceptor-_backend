import type { PaginatedResult } from '../types/paginated-result.type';

export function buildPaginatedResult<TItem>(
  items: TItem[],
  page: number,
  pageSize: number,
  totalItems: number,
): PaginatedResult<TItem> {
  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

export function pageToSkip(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}
