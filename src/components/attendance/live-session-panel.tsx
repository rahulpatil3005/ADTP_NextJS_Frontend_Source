'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Download, UserCheck, CheckCircle2, XCircle, AlertCircle, ClipboardList } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Card, Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { QrScanner } from './qr-scanner';
import { ManualEntryDialog } from './manual-entry-dialog';
import { useSession, useSessionRecords } from '@/lib/hooks/use-attendance';
import { useAuthStore } from '@/store/auth-store';
import { formatTime, getInitials, instrumentLabel, statusBadgeColor } from '@/lib/utils';
import { exportReportUrl } from '@/lib/hooks/use-dashboard';
import { apiClient } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';

interface ScanResult {
  type: 'success' | 'error';
  message: string;
  memberName?: string;
  status?: string;
}

interface ScanPopup {
  type: 'success' | 'duplicate' | 'error';
  memberName?: string;
  status?: string;
  message?: string;
}

function AttendancePopup({ popup, onClose }: { popup: ScanPopup; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const isSuccess = popup.type === 'success';
  const isDuplicate = popup.type === 'duplicate';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className={`mx-4 w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl ${
          isSuccess ? 'bg-white' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
          isSuccess ? 'bg-green-100' : isDuplicate ? 'bg-amber-100' : 'bg-red-100'
        }`}>
          {isSuccess && <CheckCircle2 className="h-10 w-10 text-green-500" />}
          {isDuplicate && <AlertCircle className="h-10 w-10 text-amber-500" />}
          {!isSuccess && !isDuplicate && <XCircle className="h-10 w-10 text-red-500" />}
        </div>

        {/* Title */}
        <h2 className={`text-xl font-bold ${
          isSuccess ? 'text-green-700' : isDuplicate ? 'text-amber-700' : 'text-red-700'
        }`}>
          {isSuccess ? 'Attendance Marked!' : isDuplicate ? 'Already Marked' : 'Scan Failed'}
        </h2>

        {/* Member name */}
        {popup.memberName && (
          <p className="mt-2 text-2xl font-semibold text-gray-800">{popup.memberName}</p>
        )}

        {/* Status badge / message */}
        {isSuccess && popup.status && (
          <span className={`mt-3 inline-block rounded-full px-4 py-1 text-sm font-medium capitalize ${
            popup.status === 'present' ? 'bg-green-100 text-green-700'
            : popup.status === 'late' ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-700'
          }`}>
            {popup.status}
          </span>
        )}

        {isDuplicate && (
          <p className="mt-2 text-sm text-amber-600">
            Attendance has already been recorded for this member in the current session.
          </p>
        )}

        {!isSuccess && !isDuplicate && popup.message && (
          <p className="mt-2 text-sm text-red-600">{popup.message}</p>
        )}

        {/* Auto-close hint */}
        <p className="mt-5 text-xs text-gray-400">Closes automatically in a moment…</p>

        <button
          onClick={onClose}
          className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${
            isSuccess ? 'bg-green-500' : isDuplicate ? 'bg-amber-500' : 'bg-red-500'
          }`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function LiveSessionPanel({
  sessionId, onBack,
}: { sessionId: string; onBack: () => void }) {
  const { data: summary } = useSession(sessionId);
  const { data: records, isLoading } = useSessionRecords(sessionId);
  const queryClient = useQueryClient();

  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [popup, setPopup] = useState<ScanPopup | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const role = useAuthStore((s) => s.role);

  // useRef so the lock is synchronous — React state updates are async
  // and would allow a second scan to slip through before re-render
  const processingRef = useRef(false);

  const handleScan = useCallback(async (payload: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    try {
      const { data } = await apiClient.post('/attendance/scan', {
        sessionId,
        qrPayload: payload,
      });
      const res = data.data;
      setLastResult({ type: 'success', message: 'Attendance marked', memberName: res.member?.fullName, status: res.status });
      setPopup({ type: 'success', memberName: res.member?.fullName, status: res.status });
      queryClient.invalidateQueries({ queryKey: ['session-records', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    } catch (err: any) {
      const statusCode = err?.response?.status;
      const msg = err?.response?.data?.message ?? 'Scan failed';
      const memberNameMatch = msg.match(/^Attendance already marked for (.+?) in/);
      const memberName = memberNameMatch?.[1];
      if (statusCode === 409) {
        setPopup({ type: 'duplicate', memberName, message: msg });
      } else {
        setPopup({ type: 'error', message: msg });
      }
      setLastResult({ type: 'error', message: msg });
    } finally {
      // Hold lock for 3s so scanner doesn't re-trigger on the same QR
      setTimeout(() => {
        processingRef.current = false;
        setProcessing(false);
      }, 3000);
    }
  }, [sessionId, queryClient]);

  return (
    <div>
      {popup && <AttendancePopup popup={popup} onClose={() => setPopup(null)} />}
      {manualOpen && (
        <ManualEntryDialog
          sessionId={sessionId}
          onClose={() => setManualOpen(false)}
          onSuccess={(memberName, status) => {
            setPopup({ type: 'success', memberName, status });
            queryClient.invalidateQueries({ queryKey: ['session-records', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
          }}
        />
      )}
      <Topbar title={summary?.session_title ?? 'Session'} />

      <div className="p-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sessions
        </button>

        {/* Stats row */}
        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Scanned" value={Number(summary.present_count) + Number(summary.late_count)} tone="success" />
            <MiniStat label="Present" value={summary.present_count} tone="success" />
            <MiniStat label="Late" value={summary.late_count} tone="warning" />
            <MiniStat label="Attendance" value={`${summary.attendance_percentage}%`} tone="primary" />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── QR Scanner panel ─────────────────────────────── */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">Scan Member QR</h3>
              <div className="flex items-center gap-2">
                {(role === 'super_admin' || role === 'admin') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setManualOpen(true)}
                  >
                    <ClipboardList className="h-4 w-4" /> Manual Entry
                  </Button>
                )}
                <Button size="sm" variant={scanning ? 'outline' : 'default'} onClick={() => { setScanning(!scanning); setLastResult(null); }}>
                  {scanning ? 'Close Scanner' : 'Open Scanner'}
                </Button>
              </div>
            </div>

            {scanning ? (
              <div className="space-y-4">
                <QrScanner onScan={handleScan} paused={processing} />

                {/* Scan result feedback */}
                {lastResult && (
                  <div className={`flex items-start gap-3 rounded-lg p-3 ${
                    lastResult.type === 'success' ? 'bg-success/10' : 'bg-danger/10'
                  }`}>
                    {lastResult.type === 'success'
                      ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                      : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                    }
                    <div>
                      {lastResult.memberName && (
                        <p className="text-sm font-semibold text-ink">{lastResult.memberName}</p>
                      )}
                      <p className={`text-sm ${lastResult.type === 'success' ? 'text-success' : 'text-danger'}`}>
                        {lastResult.message}
                        {lastResult.status && (
                          <span className="ml-2 rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium capitalize">
                            {lastResult.status}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {processing && !lastResult && (
                  <p className="text-center text-xs text-ink-secondary animate-pulse">Processing scan…</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <UserCheck className="h-10 w-10 text-ink-secondary/40" />
                <p className="text-sm text-ink-secondary">
                  Click <strong>Open Scanner</strong> to use your device camera to scan member QR codes.
                </p>
              </div>
            )}
          </Card>

          {/* ── Live scan log ─────────────────────────────────── */}
          <Card>
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-sm font-medium text-ink">
                Live Scan Log
                {records?.length ? (
                  <span className="ml-2 rounded-full bg-primary-accent px-2 py-0.5 text-xs text-primary">
                    {records.length}
                  </span>
                ) : null}
              </h3>
              <a
                href={exportReportUrl('excel')}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </a>
            </div>

            <div className="max-h-[420px] divide-y divide-border overflow-y-auto">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4"><Skeleton className="h-6 w-full" /></div>
              ))}

              {records?.map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-accent text-xs font-medium text-primary">
                    {getInitials(record.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{record.full_name}</p>
                    <p className="text-xs text-ink-secondary">
                      {instrumentLabel[record.instrument]} ·{' '}
                      <span className="font-mono">{record.member_code}</span>
                    </p>
                  </div>
                  <span className="text-xs text-ink-secondary">
                    {record.check_in_time ? formatTime(record.check_in_time) : '—'}
                  </span>
                  <Badge
                    variant={
                      record.attendance_status === 'present' ? 'success'
                      : record.attendance_status === 'late' ? 'warning'
                      : record.attendance_status === 'absent' ? 'danger' : 'info'
                    }
                  >
                    {record.attendance_status}
                  </Badge>
                </div>
              ))}

              {records?.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <UserCheck className="h-8 w-8 text-ink-secondary/50" />
                  <p className="text-sm text-ink-secondary">No scans yet.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  const colors: Record<string, string> = {
    success: 'text-success', danger: 'text-danger', warning: 'text-warning', primary: 'text-primary',
  };
  return (
    <Card className="p-4">
      <p className={`text-xl font-semibold ${colors[tone]}`}>{value}</p>
      <p className="mt-1 text-xs text-ink-secondary">{label}</p>
    </Card>
  );
}
