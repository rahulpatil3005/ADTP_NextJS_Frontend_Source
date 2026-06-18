import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface SystemSetting {
  key: string;
  value: any;
  description: string;
  updated_at: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: SystemSetting[] }>('/settings');
      return data.data;
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data } = await apiClient.patch('/settings', { key, value });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}
