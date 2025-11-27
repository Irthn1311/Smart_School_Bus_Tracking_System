import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

// Distance matrix (with caching)
export function useDistanceMatrix() {
  return useMutation({
    mutationFn: async (data: {
      origins: string[];
      destinations: string[];
      mode?: string;
      language?: string;
      units?: string;
    }) => {
      const response = await apiClient.getDistanceMatrix(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get distance matrix');
      }
      return response.data;
    },
    retry: 1,
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi tính toán khoảng cách');
    },
  });
}

/**
 * useETA - Distance Matrix with frontend caching for ETA queries
 * 
 * Features:
 * - Caches results for 120s (staleTime)
 * - Works in tandem with backend cache (also 120s)
 * - Returns { data, isLoading, error, isFetchedFromCacheFE, isBESaysCached }
 * - Automatically retries on failure
 * 
 * Usage:
 * ```tsx
 * const { data, isLoading, isFetchedFromCacheFE, isBESaysCached } = useETA({
 *   origins: ['10.77653,106.700981'],
 *   destinations: ['10.762622,106.660172'],
 *   mode: 'driving'
 * });
 * // isFetchedFromCacheFE: true if served from FE cache (React Query)
 * // isBESaysCached: true if BE response has cached: true
 * ```
 */
export function useETA(params: {
  origins: string[];
  destinations: string[];
  mode?: string;
  enabled?: boolean;
}) {
  const { origins, destinations, mode = 'driving', enabled = true } = params;
  
  const query = useQuery({
    queryKey: ['eta', 'distance-matrix', origins.sort().join(','), destinations.sort().join(','), mode],
    queryFn: async () => {
      const response = await apiClient.getDistanceMatrix({
        origins,
        destinations,
        mode,
        language: 'vi',
        units: 'metric',
      });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get ETA');
      }
      return response.data;
    },
    staleTime: 120000, // 120s - matches backend cache TTL
    gcTime: 300000, // 5 min - keep in cache longer for potential reuse
    retry: 2,
    enabled: enabled && origins.length > 0 && destinations.length > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Determine if data was fetched from FE cache (React Query)
  // If dataUpdatedAt is recent and isStale is false, likely from cache
  const isFetchedFromCacheFE = query.dataUpdatedAt > 0 && 
    (Date.now() - query.dataUpdatedAt) < 120000 && 
    !query.isStale &&
    query.dataUpdatedAt < Date.now();

  // Check if BE says it's cached
  const isBESaysCached = Boolean((query.data as any)?.cached === true);

  return {
    ...query,
    isFetchedFromCacheFE,
    isBESaysCached,
  };
}

// Directions
export function useDirections() {
  return useMutation({
    mutationFn: async (data: {
      origin: string;
      destination: string;
      waypoints?: Array<{ location: string }>;
      mode?: string;
      language?: string;
      units?: string;
    }) => {
      const response = await apiClient.getDirections(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get directions');
      }
      return response.data;
    },
    retry: 1,
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi lấy chỉ đường');
    },
  });
}

// Geocode
export function useGeocode() {
  return useMutation({
    mutationFn: async (data: { address: string; language?: string }) => {
      const response = await apiClient.geocode(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to geocode');
      }
      return response.data;
    },
    retry: 1,
  });
}

// Reverse geocode
export function useReverseGeocode() {
  return useMutation({
    mutationFn: async (data: { latlng: string; language?: string }) => {
      const response = await apiClient.reverseGeocode(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to reverse geocode');
      }
      return response.data;
    },
    retry: 1,
  });
}

