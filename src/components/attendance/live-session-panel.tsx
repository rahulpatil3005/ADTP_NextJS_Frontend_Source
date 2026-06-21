'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Download, UserCheck, CheckCircle2, XCircle, AlertCircle, ClipboardList, ScanFace, Camera, RefreshCw, Aperture, X, LogOut, Search } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Card, Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { QrScanner } from './qr-scanner';
import { ManualEntryDialog } from './manual-entry-dialog';
import { useSession, useSessionRecords, useMarkAttendance } from '@/lib/hooks/use-attendance';
import { useMembers } from '@/lib/hooks/use-members';
import { useAuthStore } from '@/store/auth-store';
import { formatTime, getInitials, instrumentLabel, statusBadgeColor } from '@/lib/utils';
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
  const { data: records, isLoading: recordsLoading } = useSessionRecords(sessionId);
  const { data: allMembersRes, isLoading: membersLoading } = useMembers({ status: 'active', limit: 500 });
  const markAttendance = useMarkAttendance();
  const queryClient = useQueryClient();
  const isLoading = recordsLoading || membersLoading;

  // Map of member_id → record for quick lookup
  const recordByMemberId = new Map(records?.map(r => [r.member_id, r]) ?? []);

  // All active members merged with their record (if any)
  const allMembers = allMembersRes?.data ?? [];
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const [mode, setMode] = useState<'checkin' | 'checkout'>('checkin');

  // Clock-in state
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [popup, setPopup] = useState<ScanPopup | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [faceScanOpen, setFaceScanOpen] = useState(false);

  // Clock-out state
  const [coScanning, setCoScanning] = useState(false);
  const [coFaceScanOpen, setCoFaceScanOpen] = useState(false);
  const [coLastResult, setCoLastResult] = useState<ScanResult | null>(null);
  const [coProcessing, setCoProcessing] = useState(false);
  const [clockingOut, setClockingOut] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [registerSearch, setRegisterSearch] = useState('');
  const role = useAuthStore((s) => s.role);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get(`/attendance/sessions/${sessionId}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a'); a.href = url; a.download = `session-attendance-${sessionId}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  // ── Clock-in QR handler ───────────────────────────────────
  const processingRef = useRef(false);
  const handleScan = useCallback(async (payload: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    try {
      const { data } = await apiClient.post('/attendance/scan', { sessionId, qrPayload: payload });
      const res = data.data;
      setLastResult({ type: 'success', message: 'Attendance marked', memberName: res.member?.fullName, status: res.status });
      setPopup({ type: 'success', memberName: res.member?.fullName, status: res.status });
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'records'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    } catch (err: any) {
      const statusCode = err?.response?.status;
      const msg = err?.response?.data?.message ?? 'Scan failed';
      const memberNameMatch = msg.match(/^Attendance already marked for (.+?) in/);
      if (statusCode === 409) setPopup({ type: 'duplicate', memberName: memberNameMatch?.[1], message: msg });
      else setPopup({ type: 'error', message: msg });
      setLastResult({ type: 'error', message: msg });
    } finally {
      setTimeout(() => { processingRef.current = false; setProcessing(false); }, 3000);
    }
  }, [sessionId, queryClient]);

  // ── Clock-out QR handler ──────────────────────────────────
  const coProcessingRef = useRef(false);
  const handleCoScan = useCallback(async (payload: string) => {
    if (coProcessingRef.current) return;
    coProcessingRef.current = true;
    setCoProcessing(true);
    try {
      const { data } = await apiClient.post('/attendance/qr-checkout', { sessionId, qrPayload: payload });
      const res = data.data;
      setCoLastResult({ type: 'success', message: 'Clocked out', memberName: res.memberName });
      setPopup({ type: 'success', memberName: res.memberName, status: 'clocked out' });
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'records'] });
    } catch (err: any) {
      const statusCode = err?.response?.status;
      const msg = err?.response?.data?.message ?? 'Clock out failed';
      if (statusCode === 409) setPopup({ type: 'duplicate', message: msg });
      else setPopup({ type: 'error', message: msg });
      setCoLastResult({ type: 'error', message: msg });
    } finally {
      setTimeout(() => { coProcessingRef.current = false; setCoProcessing(false); }, 3000);
    }
  }, [sessionId, queryClient]);

  // ── Manual check-in ───────────────────────────────────────
  const handleCheckIn = async (memberId: string) => {
    setCheckingIn(memberId);
    try {
      await markAttendance.mutateAsync({ sessionId, memberId, status: 'present' });
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Check-in failed');
    } finally { setCheckingIn(null); }
  };

  // ── Clock-out by record ID (manual list button) ───────────
  const handleClockOut = async (recordId: string) => {
    setClockingOut(recordId);
    try {
      await apiClient.post(`/attendance/records/${recordId}/checkout`);
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'records'] });
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Clock out failed');
    } finally { setClockingOut(null); }
  };

  // Switch mode: close all open scanners
  const switchMode = (m: 'checkin' | 'checkout') => {
    setMode(m);
    setScanning(false); setFaceScanOpen(false); setLastResult(null);
    setCoScanning(false); setCoFaceScanOpen(false); setCoLastResult(null);
  };

  return (
    <div>
      {popup && <AttendancePopup popup={popup} onClose={() => setPopup(null)} />}
      {manualOpen && (
        <ManualEntryDialog
          sessionId={sessionId}
          onClose={() => setManualOpen(false)}
          onSuccess={(memberName, status) => {
            setPopup({ type: 'success', memberName, status });
            queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'records'] });
            queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
          }}
        />
      )}
      <Topbar title={summary?.session_title ?? 'Session'} />

      <div className="p-4 sm:p-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sessions
        </button>

        {/* Stats row */}
        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat label="Scanned" value={Number(summary.present_count) + Number(summary.late_count)} tone="success" />
            <MiniStat label="Present" value={summary.present_count} tone="success" />
            <MiniStat label="Late" value={summary.late_count} tone="warning" />
            <MiniStat label="Attendance" value={`${summary.attendance_percentage}%`} tone="primary" />
          </div>
        )}

        {/* ── Mode tabs ──────────────────────────────────────── */}
        <div className="mb-6 flex rounded-xl border border-border bg-surface p-1 w-full sm:w-fit">
          <button
            onClick={() => switchMode('checkin')}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              mode === 'checkin' ? 'bg-violet-600 text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <UserCheck className="h-4 w-4" /> Clock In
          </button>
          <button
            onClick={() => switchMode('checkout')}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              mode === 'checkout' ? 'bg-danger text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <LogOut className="h-4 w-4" /> Clock Out
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {mode === 'checkin' ? (<>
          {/* ── Clock-In: QR Scanner ─────────────────────────── */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">Scan QR to Clock In</h3>
                <p className="text-xs text-ink-secondary mt-0.5">Member scans their card to check in</p>
              </div>
              <Button
                size="sm"
                variant={scanning ? 'outline' : 'default'}
                className={!scanning ? 'bg-violet-600 hover:bg-violet-700 border-violet-600 text-white' : ''}
                onClick={() => { setScanning(!scanning); setLastResult(null); }}
              >
                {scanning ? 'Close Scanner' : 'Open Scanner'}
              </Button>
            </div>
            {scanning ? (
              <div className="space-y-4">
                <QrScanner onScan={handleScan} paused={processing} />
                {lastResult && (
                  <div className={`flex items-start gap-3 rounded-lg p-3 ${lastResult.type === 'success' ? 'bg-success/10' : 'bg-danger/10'}`}>
                    {lastResult.type === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
                    <div>
                      {lastResult.memberName && <p className="text-sm font-semibold text-ink">{lastResult.memberName}</p>}
                      <p className={`text-sm ${lastResult.type === 'success' ? 'text-success' : 'text-danger'}`}>
                        {lastResult.message}
                        {lastResult.status && <span className="ml-2 rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium capitalize">{lastResult.status}</span>}
                      </p>
                    </div>
                  </div>
                )}
                {processing && !lastResult && <p className="text-center text-xs text-ink-secondary animate-pulse">Processing scan…</p>}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <UserCheck className="h-10 w-10 text-ink-secondary/40" />
                <p className="text-sm text-ink-secondary">Click <strong>Open Scanner</strong> to scan member QR codes.</p>
              </div>
            )}
          </Card>

          {/* ── Clock-In: Face Scan ───────────────────────────── */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">Face Scan Clock In</h3>
                <p className="text-xs text-ink-secondary mt-0.5">Identify member by face to check in</p>
              </div>
              <Button
                size="sm"
                variant={faceScanOpen ? 'outline' : 'default'}
                onClick={() => setFaceScanOpen(!faceScanOpen)}
                className={!faceScanOpen ? 'bg-violet-600 hover:bg-violet-700 border-violet-600' : ''}
              >
                <ScanFace className="h-4 w-4" />
                {faceScanOpen ? 'Close' : 'Open Face Scan'}
              </Button>
            </div>
            {faceScanOpen ? (
              <FaceScanPanel
                sessionId={sessionId}
                onResult={(result) => {
                  setPopup(result.type === 'success'
                    ? { type: 'success', memberName: result.memberName, status: result.status }
                    : { type: 'error', message: result.message });
                  if (result.type === 'success') {
                    queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'records'] });
                    queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <ScanFace className="h-10 w-10 text-violet-300" />
                <p className="text-sm text-ink-secondary">Click <strong>Open Face Scan</strong> to identify members by face.</p>
                <p className="text-xs text-ink-secondary/70">Members need a face photo uploaded to their profile.</p>
              </div>
            )}
          </Card>

          {/* ── Clock-In: Manual Entry list ───────────────────── */}
          <Card className="md:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-sm font-medium text-ink">Manual Clock In</h3>
              <button
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                onClick={() => setManualOpen(true)}
              >
                <ClipboardList className="h-3.5 w-3.5" /> Advanced
              </button>
            </div>
            <div className="max-h-[232px] divide-y divide-border overflow-y-auto">
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3"><Skeleton className="h-6 w-full" /></div>
              ))}
              {records?.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <UserCheck className="h-8 w-8 text-ink-secondary/50" />
                  <p className="text-sm text-ink-secondary">No check-ins yet.</p>
                </div>
              )}
              {records?.map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-accent text-xs font-medium text-primary">
                    {getInitials(record.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{record.full_name}</p>
                    <p className="text-xs text-ink-secondary">{instrumentLabel[record.instrument]}</p>
                  </div>
                  <Badge variant={record.attendance_status === 'present' ? 'success' : record.attendance_status === 'late' ? 'warning' : 'info'}>
                    {record.attendance_status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          </>) : (<>
          {/* ── Clock-Out: QR Scanner panel ──────────────────── */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">Scan QR to Clock Out</h3>
                <p className="text-xs text-ink-secondary mt-0.5">Member scans their card to leave</p>
              </div>
              <Button size="sm" variant={coScanning ? 'outline' : 'danger'} onClick={() => { setCoScanning(!coScanning); setCoLastResult(null); }}>
                {coScanning ? 'Close Scanner' : 'Open Scanner'}
              </Button>
            </div>
            {coScanning ? (
              <div className="space-y-4">
                <QrScanner onScan={handleCoScan} paused={coProcessing} />
                {coLastResult && (
                  <div className={`flex items-start gap-3 rounded-lg p-3 ${coLastResult.type === 'success' ? 'bg-success/10' : 'bg-danger/10'}`}>
                    {coLastResult.type === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
                    <div>
                      {coLastResult.memberName && <p className="text-sm font-semibold text-ink">{coLastResult.memberName}</p>}
                      <p className={`text-sm ${coLastResult.type === 'success' ? 'text-success' : 'text-danger'}`}>{coLastResult.message}</p>
                    </div>
                  </div>
                )}
                {coProcessing && !coLastResult && <p className="text-center text-xs text-ink-secondary animate-pulse">Processing…</p>}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <LogOut className="h-10 w-10 text-danger/30" />
                <p className="text-sm text-ink-secondary">Click <strong>Open Scanner</strong> to scan a member's QR code to clock them out.</p>
              </div>
            )}
          </Card>

          {/* ── Clock-Out: Face Scan panel ────────────────────── */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">Face Scan Clock Out</h3>
                <p className="text-xs text-ink-secondary mt-0.5">Identify member by face to clock out</p>
              </div>
              <Button
                size="sm"
                variant={coFaceScanOpen ? 'outline' : 'danger'}
                onClick={() => setCoFaceScanOpen(!coFaceScanOpen)}
              >
                <ScanFace className="h-4 w-4" />
                {coFaceScanOpen ? 'Close' : 'Open Face Scan'}
              </Button>
            </div>
            {coFaceScanOpen ? (
              <FaceScanPanel
                sessionId={sessionId}
                endpoint="/attendance/face-checkout"
                onResult={(result) => {
                  setPopup(result.type === 'success'
                    ? { type: 'success', memberName: result.memberName, status: 'clocked out' }
                    : { type: 'error', message: result.message });
                  if (result.type === 'success') queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'records'] });
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <ScanFace className="h-10 w-10 text-danger/30" />
                <p className="text-sm text-ink-secondary">Click <strong>Open Face Scan</strong> to identify a member by face and clock them out.</p>
              </div>
            )}
          </Card>

          {/* ── Clock-Out: Manual list ────────────────────────── */}
          <Card className="md:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-sm font-medium text-ink">Manual Clock Out</h3>
              <span className="text-xs text-ink-secondary">{records?.filter(r => !r.check_out_time).length ?? 0} still in</span>
            </div>
            <div className="max-h-[232px] divide-y divide-border overflow-y-auto">
              {records?.filter(r => !r.check_out_time).map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-accent text-xs font-medium text-primary">
                    {getInitials(record.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{record.full_name}</p>
                    <p className="text-xs text-ink-secondary">{instrumentLabel[record.instrument]}</p>
                  </div>
                  <button
                    onClick={() => handleClockOut(record.id)}
                    disabled={clockingOut === record.id}
                    className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 disabled:opacity-40 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {clockingOut === record.id ? '…' : 'Clock Out'}
                  </button>
                </div>
              ))}
              {records?.filter(r => !r.check_out_time).length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success/50" />
                  <p className="text-sm text-ink-secondary">All members have clocked out.</p>
                </div>
              )}
            </div>
          </Card>
          </>)}

          {/* ── Attendance Register ───────────────────────────── */}
          <Card className="md:col-span-2 xl:col-span-3">
            <div className="border-b border-border">
              <div className="flex items-center justify-between p-3 sm:p-4">
                <h3 className="text-sm font-medium text-ink">
                  Attendance Register
                  <span className="ml-2 text-xs font-normal text-ink-secondary">
                    {records?.length ?? 0} / {allMembers.length} checked in
                  </span>
                </h3>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-50 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exporting ? 'Exporting…' : 'Export Excel'}
                </button>
              </div>
              <div className="border-t border-border px-3 py-2.5 sm:px-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-secondary" />
                  <input
                    type="text"
                    placeholder="Search by name or member ID…"
                    value={registerSearch}
                    onChange={(e) => setRegisterSearch(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-sm placeholder:text-ink-secondary/60 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  {registerSearch && (
                    <button
                      onClick={() => setRegisterSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-secondary hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table header — desktop only */}
            <div className="hidden md:grid md:grid-cols-[1fr_120px_90px_90px_130px] gap-x-3 border-b border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              <span>Member</span>
              <span className="text-center">Status</span>
              <span className="text-center">Check-In</span>
              <span className="text-center">Check-Out</span>
              <span className="text-center">Action</span>
            </div>

            <div className="max-h-[480px] divide-y divide-border overflow-y-auto">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3"><Skeleton className="h-8 w-full rounded" /></div>
              ))}

              {!isLoading && allMembers
                .filter((m) => !registerSearch || m.full_name.toLowerCase().includes(registerSearch.toLowerCase()) || m.member_id?.toLowerCase().includes(registerSearch.toLowerCase()))
                .map((member) => {
                const record = recordByMemberId.get(member.id);
                const checkedIn  = !!record;
                const checkedOut = !!record?.check_out_time;
                const checkInTime  = record?.check_in_time  ? formatTime(record.check_in_time)  : null;
                const checkOutTime = record?.check_out_time ? formatTime(record.check_out_time) : null;

                return (
                  <div key={member.id} className={`transition-colors ${!checkedIn ? 'opacity-60 hover:opacity-100' : ''}`}>
                    {/* Mobile layout */}
                    <div className="flex items-center gap-3 px-3 py-3 md:hidden">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        checkedOut ? 'bg-danger/10 text-danger'
                        : checkedIn ? 'bg-success/10 text-success'
                        : 'bg-primary-accent text-primary'
                      }`}>
                        {getInitials(member.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-ink truncate">{member.full_name}</p>
                          {record ? (
                            <Badge variant={record.attendance_status === 'present' ? 'success' : record.attendance_status === 'late' ? 'warning' : 'danger'}>
                              {record.attendance_status}
                            </Badge>
                          ) : (
                            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-ink-secondary">absent</span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-0.5 text-xs">
                          <span className={checkInTime ? 'text-success' : 'text-ink-secondary/30'}>
                            In: {checkInTime ?? '—'}
                          </span>
                          <span className={checkOutTime ? 'text-danger' : 'text-ink-secondary/30'}>
                            Out: {checkOutTime ?? '—'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {!checkedIn ? (
                          <button
                            onClick={() => handleCheckIn(member.id)}
                            disabled={checkingIn === member.id}
                            className="flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success hover:bg-success/20 disabled:opacity-40 transition-colors"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {checkingIn === member.id ? '…' : 'In'}
                          </button>
                        ) : !checkedOut ? (
                          <button
                            onClick={() => handleClockOut(record.id)}
                            disabled={clockingOut === record.id}
                            className="flex items-center gap-1 rounded-lg bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 disabled:opacity-40 transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            {clockingOut === record.id ? '…' : 'Out'}
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-ink-secondary">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden md:grid md:grid-cols-[1fr_120px_90px_90px_130px] items-center gap-x-3 px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          checkedOut ? 'bg-danger/10 text-danger'
                          : checkedIn ? 'bg-success/10 text-success'
                          : 'bg-primary-accent text-primary'
                        }`}>
                          {getInitials(member.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{member.full_name}</p>
                          <p className="text-xs text-ink-secondary">{instrumentLabel[member.instrument] ?? member.instrument}</p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        {record ? (
                          <Badge variant={record.attendance_status === 'present' ? 'success' : record.attendance_status === 'late' ? 'warning' : 'danger'}>
                            {record.attendance_status}
                          </Badge>
                        ) : (
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-ink-secondary">absent</span>
                        )}
                      </div>
                      <div className="text-center text-xs font-medium">
                        {checkInTime ? <span className="text-success">{checkInTime}</span> : <span className="text-ink-secondary/30">—</span>}
                      </div>
                      <div className="text-center text-xs font-medium">
                        {checkOutTime ? <span className="text-danger">{checkOutTime}</span> : <span className="text-ink-secondary/30">—</span>}
                      </div>
                      <div className="flex justify-center gap-1.5">
                        {!checkedIn ? (
                          <button
                            onClick={() => handleCheckIn(member.id)}
                            disabled={checkingIn === member.id}
                            className="flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/20 disabled:opacity-40 transition-colors"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {checkingIn === member.id ? '…' : 'Check In'}
                          </button>
                        ) : !checkedOut ? (
                          <button
                            onClick={() => handleClockOut(record.id)}
                            disabled={clockingOut === record.id}
                            className="flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 disabled:opacity-40 transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            {clockingOut === record.id ? '…' : 'Check Out'}
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-ink-secondary">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!isLoading && allMembers.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <UserCheck className="h-8 w-8 text-ink-secondary/50" />
                  <p className="text-sm text-ink-secondary">No active members found.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Face Scan Panel ───────────────────────────────────────────
type FaceScanResult = { type: 'success' | 'error'; memberName?: string; status?: string; message?: string; confidence?: number };

function FaceScanPanel({ sessionId, onResult, endpoint = '/attendance/face-scan' }: { sessionId: string; onResult: (r: FaceScanResult) => void; endpoint?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<FaceScanResult | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCamReady(false);
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCamReady(true);
      }
    } catch {
      setCamError('Camera not accessible. Check browser permissions.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [facingMode, startCamera]);

  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || processing) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setProcessing(true);
      setLastResult(null);
      try {
        const fd = new FormData();
        fd.append('photo', blob, 'face.jpg');
        fd.append('sessionId', sessionId);
        const { data } = await apiClient.post(endpoint, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const d = data.data;
        const result: FaceScanResult = {
          type: 'success',
          memberName: d?.member?.fullName,
          status: d?.status,
          confidence: d?.confidence,
        };
        setLastResult(result);
        onResult(result);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? 'Face not recognised';
        const result: FaceScanResult = { type: 'error', message: msg };
        setLastResult(result);
        onResult(result);
      } finally {
        setProcessing(false);
      }
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="space-y-3">
      {/* Video feed — responsive height */}
      <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '4/3' }}>
        {camError ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white/60">
            <div>
              <Camera className="mx-auto mb-2 h-8 w-8 opacity-40" />
              {camError}
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {!camReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-sm text-white/60">
                Starting camera…
              </div>
            )}
            {/* Face oval guide */}
            {camReady && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className="border-2 border-dashed border-white/60"
                  style={{ width: '38%', aspectRatio: '3/4', borderRadius: '50%' }}
                />
              </div>
            )}
            {/* Flip button overlay */}
            {camReady && (
              <button
                type="button"
                onClick={() => setFacingMode((m) => m === 'user' ? 'environment' : 'user')}
                className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1.5 text-xs text-white hover:bg-black/70"
              >
                <RefreshCw className="h-3 w-3" /> Flip
              </button>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Result */}
      {lastResult && (
        <div className={`flex items-start gap-3 rounded-xl p-4 text-sm ${
          lastResult.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {lastResult.type === 'success'
            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          }
          <div>
            {lastResult.memberName && <p className="font-semibold text-ink">{lastResult.memberName}</p>}
            {lastResult.confidence !== undefined && (
              <p className="text-xs text-ink-secondary">{lastResult.confidence}% confidence · {lastResult.status}</p>
            )}
            {lastResult.message && <p className="text-xs text-red-600">{lastResult.message}</p>}
          </div>
        </div>
      )}

      {/* Capture button */}
      <button
        type="button"
        onClick={handleCapture}
        disabled={!camReady || processing || !!camError}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
      >
        {processing
          ? <span className="animate-pulse">Identifying…</span>
          : <><Aperture className="h-4 w-4" /> Capture &amp; Identify</>
        }
      </button>

      <p className="text-center text-xs text-ink-secondary/60">
        Members must have a face photo uploaded to be identified.
      </p>
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
