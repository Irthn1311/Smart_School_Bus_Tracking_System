import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

export const stopKeys = {
  all: ['stops'] as const,
  lists: () => [...stopKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...stopKeys.lists(), filters] as const,
  details: () => [...stopKeys.all, 'detail'] as const,
  detail: (id: number) => [...stopKeys.details(), id] as const,
};

// Get stops list
export function useStopsList(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: stopKeys.list(params || {}),
    queryFn: async () => {
      if (!params) {
        throw new Error('Params are required');
      }
      const response = await apiClient.getStops(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch stops');
      }
      return response;
    },
    enabled: !!params, // Only fetch when params are provided
    staleTime: 60000, // 1 minute
  });
}

// Create stop
export function useCreateStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { tenDiem: string; viDo?: number; kinhDo?: number; address?: string; scheduled_time?: string }) => {
      // If no coordinates but has address, geocode the address
      let stopData = { ...data };
      if ((!data.viDo || !data.kinhDo) && data.address) {
        try {
          const geocodeResponse = await apiClient.geocode({ address: data.address });
          if (geocodeResponse.success && geocodeResponse.data) {
            const location = (geocodeResponse.data as any)?.results?.[0]?.geometry?.location;
            if (location) {
              stopData.viDo = location.lat;
              stopData.kinhDo = location.lng;
            }
          }
        } catch (error) {
          console.warn('Failed to geocode address:', error);
          // Continue without coordinates - backend may handle it
        }
      }

      const response = await apiClient.createStop(stopData);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create stop');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stopKeys.lists() });
      toast.success('Đã tạo điểm dừng mới');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi tạo điểm dừng');
    },
  });
}

// Update stop
export function useUpdateStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiClient.updateStop(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update stop');
      }
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: stopKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: stopKeys.lists() });
      toast.success('Đã cập nhật điểm dừng');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi cập nhật điểm dừng');
    },
  });
}

// Delete stop
export function useDeleteStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.deleteStop(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete stop');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stopKeys.lists() });
      toast.success('Đã xóa điểm dừng');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi xóa điểm dừng');
    },
  });
}

