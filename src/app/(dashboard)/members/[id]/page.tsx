'use client';

import { use, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, QrCode, Trash2, X, Music2, AlertTriangle, UserCog, Pencil, Camera } from 'lucide-react';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      await apiClient.post(`/members/${id}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Photo uploaded successfully.');
      window.location.reload();
    } catch {
      toast.error('Photo upload failed. Please try again.');
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  const openEdit = () => {
    if (!member) return;
    setEditForm({
      fullName:       member.full_name ?? '',
      dateOfBirth:    member.date_of_birth ?? '',
      gender:         member.gender ?? '',
      mobileNumber:   member.mobile_number ?? '',
      email:          member.email ?? '',
      address:        member.address ?? '',
      currentStatus:  member.current_status ?? '',
      instrument:     member.instrument ?? '',
      availability:   member.availability ?? '',
      parentsName:    member.guardian_name ?? '',
      parentsContact: member.guardian_contact ?? '',
      joiningReason:  member.joining_reason ?? '',
      healthDetails:  member.health_notes ?? '',
    });
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    setEditLoading(true);
    try {
      const payload: Record<string, string> = {};
      Object.entries(editForm).forEach(([k, v]) => { if (v !== '') payload[k] = v; });
      await updateMember.mutateAsync(payload as any);
      toast.success('Member details updated.');
      setShowEditModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update member.');
    } finally {
      setEditLoading(false);
    }
  };

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

  // ── Download card PNG via canvas (matches server-side renderMemberCard exactly)
  const downloadCard = (qrDataUrl: string) => {
    if (!member) return;

    const W = 680, H = 1020, R = 32, SCALE = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE; canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    // ── White card background ─────────────────────────────────
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, R); ctx.fill();

    // ── Compact crimson header ────────────────────────────────
    const headerH = 112;
    ctx.fillStyle = '#8A0112';
    ctx.beginPath(); ctx.roundRect(0, 0, W, headerH, [R, R, 0, 0]); ctx.fill();

    // Music icon circle — drawn note shape (matches server-side)
    const iconCX = 56, iconCY = 56, iconR = 28;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(iconCX, iconCY, iconR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(iconCX - 4, iconCY + 8, 7, 5, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(iconCX + 3, iconCY + 8); ctx.lineTo(iconCX + 3, iconCY - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(iconCX + 3, iconCY - 10);
    ctx.bezierCurveTo(iconCX + 18, iconCY - 6, iconCX + 16, iconCY + 2, iconCX + 3, iconCY - 2); ctx.stroke();

    // Org name & card title
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '14px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('AVISHKAR DHOL TASHA PATHAK', 98, 44);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Member Card', 98, 76);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(0, headerH - 4, W, 4);

    // ── Avatar circle ─────────────────────────────────────────
    const avatarR = 52;
    const avatarY = headerH + 80;
    ctx.fillStyle = '#FDEEF0';
    ctx.beginPath(); ctx.arc(W / 2, avatarY, avatarR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#F5C2C7'; ctx.lineWidth = 2; ctx.stroke();
    const initials = member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    ctx.fillStyle = '#8A0112'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(initials, W / 2, avatarY + 12);

    // ── Member name ───────────────────────────────────────────
    const nameY = avatarY + avatarR + 36;
    ctx.fillStyle = '#1A1A2E'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(member.full_name, W / 2, nameY);

    // ── Instrument badge ──────────────────────────────────────
    const badge = (member.instrument ?? '').charAt(0).toUpperCase() + (member.instrument ?? '').slice(1);
    ctx.font = 'bold 15px sans-serif';
    const bW = ctx.measureText(badge).width + 40; const bH = 32; const bY = nameY + 20;
    ctx.fillStyle = '#FDEEF0';
    ctx.beginPath(); ctx.roundRect(W / 2 - bW / 2, bY, bW, bH, 16); ctx.fill();
    ctx.fillStyle = '#8A0112'; ctx.fillText(badge, W / 2, bY + 22);

    // ── Divider ───────────────────────────────────────────────
    const divY = bY + bH + 36;
    ctx.strokeStyle = '#E0DFD8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, divY); ctx.lineTo(W - 60, divY); ctx.stroke();

    // ── QR code ───────────────────────────────────────────────
    const qrImg = new Image();
    qrImg.onload = () => {
      const qrSize = 360;
      const qrX = (W - qrSize) / 2;
      const qrY = divY + 36;

      ctx.fillStyle = '#FAFAF7'; ctx.strokeStyle = '#E0DFD8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 20);
      ctx.fill(); ctx.stroke();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // ── Member ID pill ─────────────────────────────────────
      const idY = qrY + qrSize + 40;
      ctx.fillStyle = '#FDEEF0';
      ctx.beginPath(); ctx.roundRect(W / 2 - 140, idY, 280, 46, 12); ctx.fill();
      ctx.fillStyle = '#8A0112'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(member.member_id, W / 2, idY + 30);

      // ── Scan instructions ──────────────────────────────────
      ctx.fillStyle = '#888888'; ctx.font = '14px sans-serif';
      ctx.fillText('Scan this QR code to mark attendance', W / 2, idY + 72);
      ctx.fillText('Keep this card safe', W / 2, idY + 93);

      // ── Footer ─────────────────────────────────────────────
      ctx.fillStyle = '#8A0112';
      ctx.beginPath(); ctx.roundRect(0, H - 54, W, 54, [0, 0, R, R]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '14px sans-serif';
      ctx.font = '13px sans-serif';
      ctx.fillText('avishkardhtp.org', W / 2, H - 20);

      // ── Outer card shadow border ───────────────────────────
      ctx.strokeStyle = '#E0DFD8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(1, 1, W - 2, H - 2, R);
      ctx.stroke();

      ctx.fillText('avishkardhtp.org', W / 2, H - 20);

      // ── Outer border ───────────────────────────────────────
      ctx.strokeStyle = '#E0DFD8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(1, 1, W - 2, H - 2, R); ctx.stroke();

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
              <div className="relative shrink-0 group">
                {member.photo_url?.startsWith('data:') ? (
                  <img
                    src={member.photo_url}
                    alt={member.full_name}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-primary-accent"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-accent text-xl font-bold text-primary">
                    {member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                {(role === 'super_admin' || role === 'admin') && (
                  <>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      title="Upload photo"
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-wait"
                    >
                      {photoUploading
                        ? <span className="text-[10px] text-white font-medium">...</span>
                        : <Camera className="h-5 w-5 text-white" />}
                    </button>
                  </>
                )}
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
                {(role === 'super_admin' || role === 'admin') && (
                  <Button size="sm" variant="outline" onClick={openEdit}>
                    <Pencil className="h-4 w-4" /> Edit Member
                  </Button>
                )}
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
                {member.alternate_mobile && <Field label="Alternate Mobile" value={member.alternate_mobile} />}
                <Field label="Email" value={member.email ?? '—'} />
                <Field label="Aadhaar" value={member.aadhaar_number ? '••••••••' + member.aadhaar_number.slice(-4) : '—'} />
                <Field label="PAN" value={member.pan_number ?? '—'} />
              </Grid>
              <div className="mt-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-secondary">Address</p>
                <p className="text-sm text-ink">{member.address ?? '—'}</p>
              </div>
            </Section>

            {/* Current Status */}
            <Section title="Current Status">
              <Grid>
                <Field label="Occupation / Status" value={member.current_status ? member.current_status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '—'} />
                {member.current_status_org && <Field label="Organisation / School / College" value={member.current_status_org} />}
              </Grid>
            </Section>

            {/* Pathak Info */}
            <Section title="Pathak Information">
              <Grid>
                <Field label="Instrument" value={instrumentLabel[member.instrument] ?? member.instrument} />
                <Field
                  label="Availability"
                  value={
                    member.availability === 'other' && member.availability_other
                      ? member.availability_other
                      : member.availability
                        ? member.availability.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                        : '—'
                  }
                />
                <Field label="Joining Date" value={member.joining_date ? formatDate(member.joining_date) : '—'} />
                <Field label="Prior Pathak Experience" value={member.has_prior_pathak_exp ? 'Yes' : 'No'} />
                {member.prior_pathak_name && <Field label="Previous Pathak" value={member.prior_pathak_name} />}
              </Grid>
              {member.joining_reason && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-secondary">Why Joined</p>
                  <p className="text-sm text-ink">{member.joining_reason}</p>
                </div>
              )}
            </Section>

            <Section title="Guardian / Parent Information">
              <Grid>
                <Field label="Guardian Name" value={member.guardian_name ?? '—'} />
                <Field label="Guardian Contact" value={member.guardian_contact ?? '—'} />
              </Grid>
            </Section>

            <Section title="Health Information">
              <Grid>
                {member.medical_conditions && <Field label="Medical Conditions" value={member.medical_conditions} />}
                {member.physical_limitations && <Field label="Physical Limitations" value={member.physical_limitations} />}
              </Grid>
              {member.health_notes ? (
                <div className={member.medical_conditions || member.physical_limitations ? 'mt-4' : ''}>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-secondary">Health Details</p>
                  <p className="text-sm text-ink">{member.health_notes}</p>
                </div>
              ) : !member.medical_conditions && !member.physical_limitations ? (
                <p className="text-sm text-ink-secondary">No health conditions reported.</p>
              ) : null}
            </Section>
          </div>
        )}
      </div>

      {/* ── Edit Member Modal ────────────────────────────────── */}
      {showEditModal && member && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="flex w-full flex-col rounded-t-2xl border border-border bg-surface shadow-2xl sm:max-w-2xl sm:rounded-xl" style={{ maxHeight: '90vh' }}>

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-ink sm:text-base">Edit Member</h3>
                  <p className="text-xs text-ink-secondary">{member.full_name} · {member.member_id}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="rounded-lg p-1 text-ink-secondary hover:bg-gray-100 hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* Personal Information */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-secondary">Personal Information</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Full Name</label>
                    <input className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={editForm.fullName ?? ''} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Date of Birth</label>
                    <input type="date" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={editForm.dateOfBirth ?? ''} onChange={e => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Gender</label>
                    <select className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={editForm.gender ?? ''} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Mobile Number</label>
                    <input className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={editForm.mobileNumber ?? ''} onChange={e => setEditForm(f => ({ ...f, mobileNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Email</label>
                    <input type="email" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={editForm.email ?? ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Current Occupation</label>
                    <select className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={editForm.currentStatus ?? ''} onChange={e => setEditForm(f => ({ ...f, currentStatus: e.target.value }))}>
                      <option value="">Select status</option>
                      <option value="school_student">School Student</option>
                      <option value="college_student">College Student</option>
                      <option value="working_professional">Working Professional</option>
                      <option value="business">Business</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Address</label>
                    <textarea rows={2} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none" value={editForm.address ?? ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Pathak Information */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-secondary">Pathak Information</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Instrument</label>
                    <select className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={editForm.instrument ?? ''} onChange={e => setEditForm(f => ({ ...f, instrument: e.target.value }))}>
                      <option value="">Select instrument</option>
                      <option value="dhol">ढोल (Dhol)</option>
                      <option value="tasha">ताशा (Tasha)</option>
                      <option value="tool">टोल (Tool)</option>
                      <option value="dhwaj">ध्वज (Dhwaj)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Availability</label>
                    <select className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={editForm.availability ?? ''} onChange={e => setEditForm(f => ({ ...f, availability: e.target.value }))}>
                      <option value="">Select availability</option>
                      <option value="daily">Daily</option>
                      <option value="two_days_week">2 Days in Week</option>
                      <option value="three_days_week">3 Days in Week</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Joining Reason</label>
                    <textarea rows={2} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none" value={editForm.joiningReason ?? ''} onChange={e => setEditForm(f => ({ ...f, joiningReason: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Guardian / Parent Information */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-secondary">Guardian / Parent Information</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Parent / Guardian Name</label>
                    <input className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={editForm.parentsName ?? ''} onChange={e => setEditForm(f => ({ ...f, parentsName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Parent / Guardian Mobile</label>
                    <input className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={editForm.parentsContact ?? ''} onChange={e => setEditForm(f => ({ ...f, parentsContact: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Health */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-secondary">Health Information</p>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-secondary">Health Details / Limitations</label>
                  <textarea rows={2} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none" value={editForm.healthDetails ?? ''} onChange={e => setEditForm(f => ({ ...f, healthDetails: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row">
              <button
                onClick={handleEdit}
                disabled={editLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 sm:flex-1"
              >
                {editLoading ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink hover:bg-background sm:flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
