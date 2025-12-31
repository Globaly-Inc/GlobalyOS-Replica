import { useState, useCallback, useMemo, useEffect } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = typeof PAGE_SIZE_OPTIONS[number];

interface UsePaginationOptions {
  pageKey: string;
  defaultPageSize?: PageSize;
  totalCount?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: PageSize;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  from: number;
  to: number;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
  setTotalCount: (count: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  resetPage: () => void;
}

const STORAGE_KEY_PREFIX = 'pagination_pageSize_';

export function usePagination({
  pageKey,
  defaultPageSize = 20,
  totalCount: initialTotalCount = 0,
}: UsePaginationOptions): UsePaginationReturn {
  // Load persisted page size from localStorage
  const getStoredPageSize = (): PageSize => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${pageKey}`);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (PAGE_SIZE_OPTIONS.includes(parsed as PageSize)) {
          return parsed as PageSize;
        }
      }
    } catch {
      // localStorage might not be available
    }
    return defaultPageSize;
  };

  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSize>(getStoredPageSize);
  const [totalCount, setTotalCount] = useState(initialTotalCount);

  // Persist page size to localStorage
  const setPageSize = useCallback((size: PageSize) => {
    setPageSizeState(size);
    setPageState(1); // Reset to first page when changing page size
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${pageKey}`, String(size));
    } catch {
      // localStorage might not be available
    }
  }, [pageKey]);

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  // Ensure current page is valid when totalPages changes
  useEffect(() => {
    if (page > totalPages) {
      setPageState(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Calculate range for Supabase query (0-indexed)
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPageState((p) => p + 1);
    }
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setPageState((p) => p - 1);
    }
  }, [hasPrevPage]);

  const goToPage = useCallback((targetPage: number) => {
    const validPage = Math.max(1, Math.min(targetPage, totalPages));
    setPageState(validPage);
  }, [totalPages]);

  const resetPage = useCallback(() => {
    setPageState(1);
  }, []);

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    from,
    to,
    setPage,
    setPageSize,
    setTotalCount,
    nextPage,
    prevPage,
    goToPage,
    resetPage,
  };
}
