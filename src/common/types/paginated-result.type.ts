export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedResult<TItem> = {
  items: TItem[];
  pagination: PaginationMeta;
};
