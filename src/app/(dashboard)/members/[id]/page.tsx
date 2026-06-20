'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, QrCode, Trash2, X, Music2, AlertTriangle, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { useMember, useDeactivateMember, useUpdateMember } from '@/lib/hooks/use-members';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api/client';
import { formatDate, instrumentLabel } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'active',     label: 'Active',     description: 'Member is fully active and can attend sessions', color: 'border-green-300 bg-green-50 text-green-700' },
  { value: 'inactive',   label: 'Inactive',   description: 'Member is temporarily inactive',                 color: 'border-gray-300 bg-gray-50 text-gray-600' },
  { value: 'suspended',  label: 'Suspended',  description: 'Member is suspended due to a violation',         color: 'border-red-300 bg-red-50 text-red-700' },
  { value: 'left',       label: 'Left',       description: 'Member has voluntarily left the pathak',         color: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'graduated',  label: 'Graduated',  description: 'Member has completed their tenure',              color: 'border-blue-300 bg-blue-50 text-blue-700' },
] as const;

type MemberStatus = typeof STATUS_OPTIONS[number]['value'];

function statusBadgeVariant(status: string) {
  if (status === 'active')    return 'success';
  if (status === 'suspended') return 'danger';
  if (status === 'left')      return 'warning';
  if (status === 'graduated') return 'info';
  return 'default' as any;
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const { data: member, isLoading } = useMember(id);
  const deactivate = useDeactivateMember();
  const updateMember = useUpdateMember(id);

  const [qrData, setQrData] = useState<{ qrDataUrl: string; memberId: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<MemberStatus>('active');
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const handleChangeStatus = async () => {
    setStatusLoading(true);
    try {
      await updateMember.mutateAsync({ status: selectedStatus } as any);
      toast.success(`Member status changed to ${selectedStatus}.`);
      setShowStatusModal(false);
      setStatusReason('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Fetch & show QR ────────────────────────────────────────
  const handleViewQr = async () => {
    setQrLoading(true);
    try {
      const { data } = await apiClient.get(`/qr/member/${id}`);
      setQrData({ qrDataUrl: data.data.qrDataUrl, memberId: data.data.memberId });
    } catch {
      toast.error('Could not fetch QR code.');
    } finally {
      setQrLoading(false);
    }
  };

  // ── Download card PNG via canvas ────────────────────────────
  const downloadCard = (qrDataUrl: string) => {
    if (!member) return;

    // 2× scale for HD output — all drawing coords stay at 680×1020 logical pixels
    const W = 680, H = 1020;
    const R = 32;
    const SCALE = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE; canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    // ── Rounded card background ──────────────────────────────
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, R);
    ctx.fill();

    // ── Crimson header (rounded top) ─────────────────────────
    const headerH = 180;
    ctx.fillStyle = '#8A0112';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, headerH, [R, R, 0, 0]);
    ctx.fill();

    // Music icon circle in header
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(56, 56, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♪', 56, 63);

    // Org name & card title in header
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '600 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AVISHKAR DHOL TASHA PATHAK', 98, 47);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Member Card', 98, 78);

    // Thin accent line at header bottom
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, headerH - 4, W, 4);

    // ── Avatar circle ─────────────────────────────────────────
    const avatarY = headerH + 64;
    ctx.fillStyle = '#FDEEF0';
    ctx.beginPath();
    ctx.arc(W / 2, avatarY, 52, 0, Math.PI * 2);
    ctx.fill();
    // Thin ring
    ctx.strokeStyle = '#F5C2C7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#8A0112';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    const initials = member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    ctx.fillText(initials, W / 2, avatarY + 12);

    // ── Member name ───────────────────────────────────────────
    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(member.full_name, W / 2, avatarY + 76);

    // ── Instrument badge ──────────────────────────────────────
    const badge = (member.instrument ?? '').charAt(0).toUpperCase() + (member.instrument ?? '').slice(1);
    ctx.font = '600 15px sans-serif';
    const bW = ctx.measureText(badge).width + 36;
    const bY = avatarY + 94;
    ctx.fillStyle = '#FDEEF0';
    ctx.beginPath();
    ctx.roundRect(W / 2 - bW / 2, bY, bW, 30, 15);
    ctx.fill();
    ctx.fillStyle = '#8A0112';
    ctx.fillText(badge, W / 2, bY + 20);

    // ── Divider ───────────────────────────────────────────────
    const divY = bY + 52;
    ctx.strokeStyle = '#E0DFD8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, divY); ctx.lineTo(W - 60, divY);
    ctx.stroke();

    // ── QR code ───────────────────────────────────────────────
    const qrImg = new Image();
    qrImg.onload = () => {
      const qrSize = 380;
      const qrX = (W - qrSize) / 2;
      const qrY = divY + 24;

      // QR container box
      ctx.fillStyle = '#FAFAF7';
      ctx.strokeStyle = '#E0DFD8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 16);
      ctx.fill();
      ctx.stroke();

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // ── Member ID pill ─────────────────────────────────────
      const idY = qrY + qrSize + 36;
      ctx.fillStyle = '#FDEEF0';
      ctx.beginPath();
      ctx.roundRect(W / 2 - 130, idY, 260, 44, 10);
      ctx.fill();
      ctx.fillStyle = '#8A0112';
      ctx.font = 'bold 19px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(member.member_id, W / 2, idY + 28);

      // ── Scan instruction ───────────────────────────────────
      ctx.fillStyle = '#888888';
      ctx.font = '14px sans-serif';
      ctx.fillText('Scan this QR code to mark attendance', W / 2, idY + 74);
      ctx.fillText('Keep this card safe', W / 2, idY + 94);

      // ── Footer stripe (rounded bottom) ─────────────────────
      ctx.fillStyle = '#8A0112';
      ctx.beginPath();
      ctx.roundRect(0, H - 52, W, 52, [0, 0, R, R]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '13px sans-serif';
      ctx.fillText('avishkardhtp.org', W / 2, H - 20);

      // ── Outer card shadow border ───────────────────────────
      ctx.strokeStyle = '#E0DFD8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(1, 1, W - 2, H - 2, R);
      ctx.stroke();

      // ── Download ───────────────────────────────────────────
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png', 1.0);
      a.download = `member-card-${member.member_id}.png`;
      a.click();
    };
    qrImg.src = qrDataUrl;
  };

  // ── Delete member ───────────────────────────────────────────
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deactivate.mutateAsync(id);
      toast.success('Member removed from system.');
      router.push('/members');
    } catch {
      toast.error('Failed to delete member.');
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Member Profile" />
      <div className="mx-auto max-w-3xl p-6">
        <button
          onClick={() => router.back()}
          className="mb-5 flex items-center gap-2 text-sm text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Members
        </button>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}

        {member && (
          <div className="space-y-5">
            {/* Header card */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-accent text-xl font-bold text-primary">
                {member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-ink">{member.full_name}</h2>
                <p className="font-mono text-sm text-ink-secondary">{member.member_id}</p>
                <div className="mt-1">
                  <Badge variant={statusBadgeVariant(member.status)}>
                    {member.status}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" loading={qrLoading} onClick={handleViewQr}>
                  <QrCode className="h-4 w-4" /> View QR
                </Button>
                {role === 'super_admin' && (
                  <Button size="sm" variant="outline" onClick={() => { setSelectedStatus(member.status as MemberStatus); setShowStatusModal(true); }}>
                    <UserCog className="h-4 w-4" /> Change Status
                  </Button>
                )}
                {role === 'super_admin' && (
                  <Button size="sm" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
            </div>

            {/* Personal Info */}
            <Section title="Personal Information">
              <Grid>
                <Field label="Full Name" value={member.full_name} />
                <Field label="Date of Birth" value={member.date_of_birth ? formatDate(member.date_of_birth) : '—'} />
                <Field label="Gender" value={member.gender ?? '—'} />
                <Field label="Mobile" value={member.mobile_number} />
                <Field label="Email" value={member.email ?? '—'} />
                <Field label="Address" value={member.address ?? '—'} />
                <Field label="Aadhaar" value={member.aadhaar_number ? '••••••••' + member.aadhaar_number.slice(-4) : '—'} />
                <Field label="PAN" value={member.pan_number ?? '—'} />
                <Field label="Current Status" value={member.current_status ?? '—'} />
              </Grid>
            </Section>

            {/* Pathak Info */}
            <Section title="Pathak Information">
              <Grid>
                <Field label="Instrument" value={instrumentLabel[member.instrument] ?? member.instrument} />
                <Field label="Availability" value={member.availability ?? '—'} />
                <Field label="Joining Date" value={member.joining_date ? formatDate(member.joining_date) : '—'} />
                <Field label="Prior Pathak Experience" value={member.has_prior_pathak_exp ? 'Yes' : 'No'} />
                {member.prior_pathak_name && <Field label="Previous Pathak" value={member.prior_pathak_name} />}
              </Grid>
              {member.joining_reason && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-secondary">Joining Reason</p>
                  <p className="text-sm text-ink">{member.joining_reason}</p>
                </div>
              )}
            </Section>

            {(member.guardian_name || member.guardian_contact) && (
              <Section title="Guardian Information">
                <Grid>
                  <Field label="Guardian Name" value={member.guardian_name ?? '—'} />
                  <Field label="Guardian Contact" value={member.guardian_contact ?? '—'} />
                </Grid>
              </Section>
            )}

            {(member.medical_conditions || member.physical_limitations || member.health_notes) && (
              <Section title="Health Information">
                <Grid>
                  <Field label="Medical Conditions" value={member.medical_conditions ?? '—'} />
                  <Field label="Physical Limitations" value={member.physical_limitations ?? '—'} />
                </Grid>
                {member.health_notes && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-secondary">Health Notes</p>
                    <p className="text-sm text-ink">{member.health_notes}</p>
                  </div>
                )}
              </Section>
            )}
          </div>
        )}
      </div>

      {/* ── QR Modal ─────────────────────────────────────────── */}
      {qrData && member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-6">
          <div className="my-auto w-full max-w-sm rounded-2xl border border-border bg-surface shadow-2xl">
            {/* Modal header stripe */}
            <div className="flex items-center justify-between rounded-t-2xl bg-primary px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Music2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-white/70">Avishkar Dhol Tasha Pathak</p>
                  <p className="text-xs font-semibold text-white">Member Card</p>
                </div>
              </div>
              <button onClick={() => setQrData(null)} className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex flex-col items-center px-6 py-8 text-center">
              {/* Avatar */}
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary-accent text-lg font-bold text-primary">
                {member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-base font-semibold text-ink">{member.full_name}</h3>
              <span className="mt-0.5 rounded-full bg-primary-accent px-3 py-0.5 text-xs font-medium capitalize text-primary">
                {member.instrument}
              </span>

              <div className="my-5 h-px w-full bg-border" />

              {/* QR image — large crisp container for fast scanning */}
              <div className="rounded-xl bg-[#FAFAF7] p-3 ring-1 ring-border">
                <img
                  src={qrData.qrDataUrl}
                  alt={`QR for ${member.member_id}`}
                  className="h-56 w-56 rounded-lg"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>

              {/* Member ID */}
              <div className="mt-4 rounded-md bg-primary-accent px-4 py-1.5">
                <p className="font-mono text-xs font-bold tracking-widest text-primary">{member.member_id}</p>
              </div>

              <p className="mt-3 text-[11px] text-ink-secondary">
                Scan this QR to mark attendance · Keep this card safe
              </p>
            </div>

            {/* Modal footer */}
            <div className="flex gap-2 border-t border-border px-5 py-5">
              <Button className="flex-1" onClick={() => downloadCard(qrData.qrDataUrl)}>
                <Download className="h-4 w-4" /> Download Card
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setQrData(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Status Modal ──────────────────────────────── */}
      {showStatusModal && member && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="flex w-full flex-col rounded-t-2xl border border-border bg-surface shadow-2xl sm:max-w-md sm:rounded-xl max-h-[90vh]">

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-ink sm:text-base">Change Member Status</h3>
              </div>
              <button onClick={() => setShowStatusModal(false)} className="rounded-lg p-1 text-ink-secondary hover:bg-gray-100 hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-3">
              <p className="text-sm text-ink-secondary">
                Select a new status for <span className="font-semibold text-ink">{member.full_name}</span>.
              </p>

              {/* Status options — 1 col on mobile, keep readable on all sizes */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-1">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedStatus(opt.value)}
                    className={`w-full rounded-lg border-2 px-3 py-2.5 text-left transition-all sm:px-4 sm:py-3 ${
                      selectedStatus === opt.value
                        ? opt.color + ' border-current'
                        : 'border-border bg-surface hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold leading-tight">{opt.label}</span>
                      <span className="shrink-0 text-xs opacity-60">
                        {member.status === opt.value ? 'Current' : selectedStatus === opt.value ? 'Selected' : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-snug opacity-70">{opt.description}</p>
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-secondary">
                  Reason <span className="normal-case text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Disciplinary action, personal leave…"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Footer — stacked on mobile, side by side on sm+ */}
            <div className="flex shrink-0 flex-col gap-2 border-t border-border px-4 py-4 sm:flex-row sm:px-5">
              <Button
                className="w-full sm:flex-1"
                disabled={selectedStatus === member.status || statusLoading}
                loading={statusLoading}
                onClick={handleChangeStatus}
              >
                Confirm Change
              </Button>
              <Button variant="outline" className="w-full sm:flex-1" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────── */}
      {showDeleteConfirm && member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/10">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-ink">Delete Member</h3>
                <p className="text-sm text-ink-secondary">This action cannot be undone</p>
              </div>
            </div>
            <p className="mb-5 text-sm text-ink">
              Are you sure you want to permanently remove{' '}
              <span className="font-semibold">{member.full_name}</span> ({member.member_id}) from the system?
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
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">{title}</h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-ink-secondary">{label}</p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  );
}
