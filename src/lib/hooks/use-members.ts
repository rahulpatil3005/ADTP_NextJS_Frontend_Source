import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Member, MemberListResponse, MemberAttendanceSummary, ApiResponse } from '@/types';
import type { CreateMemberFormValues } from '@/lib/validators/schemas';

interface MemberFilters {
  query?: string;
  instrument?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useMembers(filters: MemberFilters = {}) {
  return useQuery({
    queryKey: ['members', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<{ data: Member[]; total: number; page: number; totalPages: number }>>('/members', {
        params: filters,
      });
      // API returns { data: Member[], total, page, totalPages }
      return data.data;
    },
  });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Member>>(`/members/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useMemberAttendanceSummary(id: string | undefined) {
  return useQuery({
    queryKey: ['members', id, 'attendance-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MemberAttendanceSummary>>(
        `/members/${id}/attendance-summary`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateMemberFormValues) => {
      const { data } = await apiClient.post<ApiResponse<{ id: string; member_id: string; qrDataUrl: string }>>(
        '/members',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CreateMemberFormValues>) => {
      const { data } = await apiClient.patch<ApiResponse<Member>>(`/members/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['members', id] });
    },
  });
}

export function useDeactivateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(`/members/${id}`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });
}
