'use client';

import { useState } from 'react';
import { Plus, Users, Clock, MapPin, Trash2, AlertTriangle } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Card, Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { useSessions, useDeleteSession } from '@/lib/hooks/use-attendance';
import { useAuthStore } from '@/store/auth-store';
import { formatDate } from '@/lib/utils';
import { CreateSessionDialog } from '@/components/attendance/create-session-dialog';
import { LiveSessionPanel } from '@/components/attendance/live-session-panel';

export default function AttendancePage() {
  const { data: sessions, isLoading } = useSessions();
  const deleteSession = useDeleteSession();
  const role = useAuthStore((s) => s.role);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      await deleteSession.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch {
      // error handled silently — session list will still refresh
    } finally {
      setDeleteLoading(false);
    }
  };

  if (selectedSessionId) {
    return (
      <LiveSessionPanel
        sessionId={selectedSessionId}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  return (
    <div>
      <Topbar title="Attendance Sessions" />

      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-ink-secondary">
            Open a session to start scanning or manually mark attendance.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> New Session
          </Button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-lg" />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions?.map((session) => (
            <Card key={session.id} className="flex flex-col overflow-hidden">
              {/* Clickable body */}
              <div
                className="flex-1 cursor-pointer p-4 transition-colors hover:bg-gray-50"
                onClick={() => setSelectedSessionId(session.id)}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-medium text-ink leading-snug">{session.title}</h3>
                  <Badge variant="info" className="shrink-0">{session.session_type}</Badge>
                </div>
                <div className="space-y-1.5 text-xs text-ink-secondary">
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {formatDate(session.session_date)}
                    {session.start_time && ` · ${session.start_time}`}
                  </p>
                  {session.location_name && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {session.location_name}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> {session.total_scanned ?? 0} scanned
                  </p>
                </div>
              </div>

              {/* Card footer — super_admin delete */}
              {role === 'super_admin' && (
                <div className="flex items-center justify-end border-t border-border px-4 py-2">
                  <button
                    onClick={() => setConfirmDelete({ id: session.id, title: session.title })}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>

        {sessions?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-ink-secondary">No sessions yet.</p>
            <Button variant="outline" className="mt-3" onClick={() => setDialogOpen(true)}>
              Create your first session
            </Button>
          </div>
        )}
      </div>

      <CreateSessionDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* ── Delete Confirm Modal ──────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-ink">Delete Session</h3>
                <p className="text-xs text-ink-secondary">This cannot be undone</p>
              </div>
            </div>

            <p className="mb-2 text-sm text-ink">
              Are you sure you want to delete{' '}
              <span className="font-semibold">"{confirmDelete.title}"</span>?
            </p>
            <p className="mb-5 text-xs text-danger">
              All attendance records and scan logs for this session will be permanently deleted.
            </p>

            <div className="flex gap-2">
              <Button
                variant="danger"
                className="flex-1"
                loading={deleteLoading}
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" /> Yes, Delete
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
