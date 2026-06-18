'use client';

import { Users, UserCheck, UserX, ShieldCheck, UserPlus, Activity } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { StatCard } from '@/components/dashboard/stat-card';
import { WeeklyAttendanceChart } from '@/components/charts/weekly-attendance-chart';
import { RecentRegistrations } from '@/components/dashboard/recent-registrations';
import { Skeleton } from '@/components/ui/primitives';
import { useSuperAdminDashboard, useAdminDashboard } from '@/lib/hooks/use-dashboard';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardPage() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';

  return isSuperAdmin ? <SuperAdminDashboard /> : <AdminDashboard />;
}

function SuperAdminDashboard() {
  const { data, isLoading, error } = useSuperAdminDashboard();

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="p-6">
        {isLoading && <DashboardSkeleton />}
        {error && <p className="text-sm text-danger">Failed to load dashboard data.</p>}
        {data && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatCard
                label="Total Members"
                value={data.members.total_members}
                sublabel={`${data.members.pending_members} pending approval`}
                icon={Users}
                tone="primary"
              />
              <StatCard
                label="Present Today"
                value={data.todaySummary?.present_count ?? 0}
                sublabel={
                  data.todaySummary
                    ? `${data.todaySummary.attendance_percentage}% attendance`
                    : 'No session today'
                }
                icon={UserCheck}
                tone="success"
              />
              <StatCard
                label="Absent Today"
                value={data.todaySummary?.absent_count ?? 0}
                icon={UserX}
                tone="danger"
              />
              <StatCard
                label="Total Admins"
                value={data.totalAdmins}
                icon={ShieldCheck}
                tone="warning"
              />
              <StatCard
                label="New This Week"
                value={data.recentRegistrations.length}
                icon={UserPlus}
                tone="info"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <WeeklyAttendanceChart data={data.weeklyTrend} />
              <RecentRegistrations members={data.recentRegistrations} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading, error } = useAdminDashboard();

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="p-6">
        {isLoading && <DashboardSkeleton cols={3} />}
        {error && <p className="text-sm text-danger">Failed to load dashboard data.</p>}
        {data && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Active Members"
                value={data.totalActiveMembers}
                icon={Users}
                tone="primary"
              />
              <StatCard
                label="Present Today"
                value={data.todaySummary?.present_count ?? 0}
                sublabel={
                  data.todaySummary
                    ? `${data.todaySummary.attendance_percentage}% attendance`
                    : 'No session today'
                }
                icon={UserCheck}
                tone="success"
              />
              <StatCard
                label="Absent Today"
                value={data.todaySummary?.absent_count ?? 0}
                icon={UserX}
                tone="danger"
              />
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-ink-secondary" />
                <h3 className="font-medium text-ink">Recent Attendance Activity</h3>
              </div>
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-ink-secondary">No recent activity.</p>
              ) : (
                <div className="divide-y divide-border">
                  {data.recentActivity.slice(0, 10).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <span className="font-medium text-ink">{r.full_name}</span>
                        <span className="ml-2 text-xs text-ink-secondary">{r.member_code}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-ink-secondary">
                        <span>{r.session_title}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${
                            r.status === 'present'
                              ? 'bg-success/10 text-success'
                              : 'bg-danger/10 text-danger'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div>
      <div className={`mb-6 grid grid-cols-2 gap-4 lg:grid-cols-${cols}`}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-[110px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[300px] rounded-lg" />
    </div>
  );
}
