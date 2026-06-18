import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type {
  Session, AttendanceRecord, DailySummary, ApiResponse,
} from '@/types';
import type { CreateSessionFormValues } from '@/lib/validators/schemas';

export function useSessions(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['sessions', page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Session[]>>('/attendance/sessions', {
        params: { page, limit },
      });
      return data.data;
    },
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DailySummary>>(`/attendance/sessions/${id}`);
      return data.data;
    },
    enabled: !!id,
    refetchInterval: 10_000, // live-ish updates while a session is open
  });
}

export function useSessionRecords(id: string | undefined) {
  return useQuery({
    queryKey: ['sessions', id, 'records'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AttendanceRecord[]>>(
        `/attendance/sessions/${id}/records`,
      );
      return data.data;
    },
    enabled: !!id,
    refetchInterval: 5_000,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSessionFormValues) => {
      const { data } = await apiClient.post<ApiResponse<Session>>(
        '/attendance/sessions',
        payload,
      );
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await apiClient.delete(`/attendance/sessions/${sessionId}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      sessionId: string; memberId: string; status: string; overrideReason?: string;
    }) => {
      const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
        '/attendance/mark',
        payload,
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId, 'records'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId] });
    },
  });
}

export function useMemberAttendanceHistory(memberId: string | undefined, filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: ['attendance', 'member', memberId, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AttendanceRecord[]>>(
        `/attendance/member/${memberId}`,
        { params: filters },
      );
      return data.data;
    },
    enabled: !!memberId,
  });
}
