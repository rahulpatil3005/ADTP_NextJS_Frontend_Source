'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, KeyRound, ShieldCheck, ShieldOff,
  AlertTriangle, X, Eye, EyeOff, UserCog, Pencil,
} from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

// ── API hooks ─────────────────────────────────────────────
function useAdmins() {
  return useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admins');
      return (data.data ?? data) as any[];
    },
  });
}

function useAdminMutation(path: string, method: 'post' | 'patch' | 'delete' = 'patch') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: any) => (apiClient as any)[method](path, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
  });
}

// ── Create Admin Modal ────────────────────────────────────
function CreateAdminModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await apiClient.post('/admins', form);
      qc.invalidateQueries({ queryKey: ['admins'] });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create admin.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-ink">Create Admin</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-secondary hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-secondary">Full Name *</label>
            <input required value={form.fullName} onChange={set('fullName')} placeholder="e.g. Rahul Patil"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-secondary">Email *</label>
            <input required type="email" value={form.email} onChange={set('email')} placeholder="admin@example.com"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-secondary">Phone</label>
            <input value={form.phone} onChange={set('phone')} placeholder="10-digit mobile number"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-secondary">Password *</label>
            <div className="relative">
              <input required type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')}
                placeholder="Min. 8 characters"
                className="w-full rounded-lg border border-border px-3 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" loading={loading}>Create Admin</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Admin Modal ──────────────────────────────────────
function EditAdminModal({ admin, onClose }: { admin: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: admin.full_name ?? '',
    email: admin.email ?? '',
    phone: admin.phone ?? '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await apiClient.patch(`/admins/${admin.id}`, {
        fullName: form.fullName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
      });
      qc.invalidateQueries({ queryKey: ['admins'] });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update admin.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-ink">Edit Admin</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-secondary hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-secondary">Full Name *</label>
            <input required value={form.fullName} onChange={set('fullName')} placeholder="e.g. Rahul Patil"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-secondary">Email *</label>
            <input required type="email" value={form.email} onChange={set('email')} placeholder="admin@example.com"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-secondary">Phone</label>
            <input value={form.phone} onChange={set('phone')} placeholder="10-digit mobile number"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" loading={loading}>Save Changes</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────
function ResetPasswordModal({ admin, onClose }: { admin: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await apiClient.patch(`/admins/${admin.id}/reset-password`, { newPassword: password });
      qc.invalidateQueries({ queryKey: ['admins'] });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-ink">Reset Password</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-secondary hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <p className="text-sm text-ink-secondary">
            Set a new password for <span className="font-semibold text-ink">{admin.full_name}</span>.
          </p>
          <div className="relative">
            <input required type={showPass ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="New password (min. 8 chars)"
              className="w-full rounded-lg border border-border px-3 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" loading={loading}>Reset Password</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────
function DeleteAdminModal({ admin, onClose }: { admin: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiClient.delete(`/admins/${admin.id}`);
      qc.invalidateQueries({ queryKey: ['admins'] });
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <div>
            <h3 className="font-semibold text-ink">Delete Admin</h3>
            <p className="text-xs text-ink-secondary">This cannot be undone</p>
          </div>
        </div>
        <p className="mb-5 text-sm text-ink">
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold">{admin.full_name}</span>?
          Their account and login access will be removed.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Yes, Delete
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function AdminsPage() {
  const { data: admins = [], isLoading } = useAdmins();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleActive = async (admin: any) => {
    setTogglingId(admin.id);
    const endpoint = admin.is_active ? 'deactivate' : 'activate';
    try {
      await apiClient.patch(`/admins/${admin.id}/${endpoint}`);
      qc.invalidateQueries({ queryKey: ['admins'] });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <Topbar title="Admin Users" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-ink-secondary">
              Manage admin accounts. Admins can view members, add members, manage attendance sessions and scan QR codes.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="shrink-0">
            <Plus className="h-4 w-4" /> Create Admin
          </Button>
        </div>

        {/* Admin cards */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && admins.length === 0 && (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <UserCog className="mx-auto mb-3 h-10 w-10 text-ink-secondary/30" />
            <p className="text-sm font-medium text-ink-secondary">No admins yet</p>
            <p className="mt-1 text-xs text-ink-secondary/70">Create an admin to share management duties</p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Create First Admin
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {admins.map((admin) => (
            <div key={admin.id} className="rounded-xl border border-border bg-surface shadow-card">
              {/* Card header */}
              <div className="flex items-start gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {admin.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{admin.full_name}</p>
                  <p className="truncate text-xs text-ink-secondary">{admin.email}</p>
                  {admin.phone && <p className="text-xs text-ink-secondary">{admin.phone}</p>}
                </div>
                <Badge variant={admin.is_active ? 'success' : 'warning'} className="shrink-0">
                  {admin.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3 text-xs text-ink-secondary">
                <div>
                  <p className="font-medium uppercase tracking-wide text-[10px]">Employee Code</p>
                  <p className="mt-0.5 font-mono">{admin.employee_code ?? '—'}</p>
                </div>
                <div>
                  <p className="font-medium uppercase tracking-wide text-[10px]">Joined</p>
                  <p className="mt-0.5">{admin.created_at ? formatDate(admin.created_at) : '—'}</p>
                </div>
                <div>
                  <p className="font-medium uppercase tracking-wide text-[10px]">Last Login</p>
                  <p className="mt-0.5">{admin.last_login_at ? formatDate(admin.last_login_at) : 'Never'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 border-t border-border px-4 py-3">
                <button
                  onClick={() => toggleActive(admin)}
                  disabled={togglingId === admin.id}
                  title={admin.is_active ? 'Deactivate' : 'Activate'}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    admin.is_active
                      ? 'text-amber-600 hover:bg-amber-50'
                      : 'text-green-600 hover:bg-green-50'
                  } disabled:opacity-50`}
                >
                  {admin.is_active
                    ? <><ShieldOff className="h-3.5 w-3.5" /> Deactivate</>
                    : <><ShieldCheck className="h-3.5 w-3.5" /> Activate</>
                  }
                </button>

                <button
                  onClick={() => setEditTarget(admin)}
                  title="Edit admin"
                  className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-gray-100 hover:text-ink"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>

                <button
                  onClick={() => setResetTarget(admin)}
                  title="Reset password"
                  className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-gray-100 hover:text-ink"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Reset PWD
                </button>

                <button
                  onClick={() => setDeleteTarget(admin)}
                  title="Delete admin"
                  className="ml-auto flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate    && <CreateAdminModal   onClose={() => setShowCreate(false)} />}
      {editTarget    && <EditAdminModal     admin={editTarget}   onClose={() => setEditTarget(null)} />}
      {resetTarget   && <ResetPasswordModal admin={resetTarget}  onClose={() => setResetTarget(null)} />}
      {deleteTarget  && <DeleteAdminModal   admin={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}
