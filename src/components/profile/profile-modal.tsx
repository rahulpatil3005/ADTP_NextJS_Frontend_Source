'use client';

import { useState } from 'react';
import { User, Lock, Eye, EyeOff, X, ShieldCheck } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { toast } from 'sonner';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const role = useAuthStore((s) => s.role);

  const { data, isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiClient.get('/auth/me').then((r) => r.data.data),
    enabled: open,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-ink">My Profile</h2>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab('profile')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === 'profile'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <User className="h-4 w-4" /> Profile
          </button>
          <button
            onClick={() => setTab('password')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === 'password'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Lock className="h-4 w-4" /> Change Password
          </button>
        </div>

        <div className="p-5">
          {tab === 'profile' && (
            <ProfileTab data={data} isLoading={isLoading} role={role} />
          )}
          {tab === 'password' && <PasswordTab onSuccess={onClose} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ data, isLoading, role }: { data: any; isLoading: boolean; role: string | null }) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-border" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-border" />
            <div className="h-3 w-24 rounded bg-border" />
          </div>
        </div>
        <div className="h-4 w-full rounded bg-border" />
        <div className="h-4 w-3/4 rounded bg-border" />
      </div>
    );
  }

  if (!data) return <p className="text-sm text-ink-secondary">Failed to load profile.</p>;

  const initials = (data.full_name ?? data.email ?? 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white ring-2 ring-gold ring-offset-2">
          {initials}
        </div>
        <div>
          <p className="text-lg font-semibold text-ink">{data.full_name ?? '—'}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <ShieldCheck className="h-3 w-3" />
            {role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="divide-y divide-border rounded-xl border border-border">
        <Row label="Email" value={data.email} />
        <Row label="Phone" value={data.phone ?? '—'} />
        <Row label="User ID" value={data.id?.slice(0, 8) + '...'} mono />
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs font-medium text-ink-secondary">{label}</span>
      <span className={`text-sm text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function PasswordTab({ onSuccess }: { onSuccess: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post('/auth/change-password', { currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to change password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-ink-secondary">Current Password</label>
        <div className="relative">
          <Input
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            required
          />
          <button type="button" onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink">
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-ink-secondary">New Password</label>
        <div className="relative">
          <Input
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
          />
          <button type="button" onClick={() => setShowNew((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink">
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-ink-secondary">Confirm New Password</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat new password"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Changing...' : 'Change Password'}
      </Button>
    </form>
  );
}
