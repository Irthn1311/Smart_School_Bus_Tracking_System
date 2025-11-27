import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

interface UseApiOptions {
  immediate?: boolean;
}

export function useApi<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = { immediate: true }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message || "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    refetch: execute,
  };
}

// Hook cho pagination
export function usePaginatedApi<T>(
  apiCall: (
    page: number,
    limit: number,
    filters?: any
  ) => Promise<{
    data: T[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }>,
  initialPage = 1,
  initialLimit = 10,
  initialFilters = {}
) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall(page, limit, filters);
      setData(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit, filters]);

  const goToPage = (newPage: number) => {
    setPage(newPage);
  };

  const changeLimit = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  };

  const updateFilters = (newFilters: any) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when changing filters
  };

  return {
    data,
    pagination,
    loading,
    error,
    page,
    limit,
    filters,
    goToPage,
    changeLimit,
    updateFilters,
    refetch: fetchData,
  };
}
