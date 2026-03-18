export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export type Pagination = {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
};

export function toPagination(input: PaginationInput, defaults = { pageSize: 25, maxPageSize: 100 }): Pagination {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(defaults.maxPageSize, Math.max(1, Math.floor(input.pageSize ?? defaults.pageSize)));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset, limit: pageSize };
}

