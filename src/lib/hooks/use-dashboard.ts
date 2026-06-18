import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { SuperAdminDashboard, AdminDashboard, ApiResponse } from '@/types';

export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'super-admin'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<SuperAdminDashboard>>(
        '/dashboard/super-admin',
      );
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AdminDashboard>>('/dashboard/admin');
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useMembersReport() {
  return useQuery({
    queryKey: ['reports', 'members'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<unknown[]>>('/reports/members');
      return data.data;
    },
  });
}

export function exportReportUrl(format: 'excel' | 'csv', from?: string, to?: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return `${base}/reports/export/${format}?${params.toString()}`;
}
