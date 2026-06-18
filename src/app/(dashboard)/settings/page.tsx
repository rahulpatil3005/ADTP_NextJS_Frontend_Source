'use client';

import { useState } from 'react';
import { MessageCircle, ShieldCheck } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Input, Label, Skeleton } from '@/components/ui/primitives';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api/client';
import { useSettings, useUpdateSetting } from '@/lib/hooks/use-settings';

// ── Toggle switch component ───────────────────────────────
function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        enabled ? 'bg-primary' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ── Setting row ───────────────────────────────────────────
function SettingRow({
  icon, title, description, settingKey, settings, onToggle, isSuperAdmin,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  settingKey: string;
  settings: any[] | undefined;
  onToggle: (key: string, value: boolean) => void;
  isSuperAdmin: boolean;
}) {
  const setting = settings?.find((s) => s.key === settingKey);
  const enabled = setting?.value === true || setting?.value === 'true';

  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <Toggle
        enabled={enabled}
        onChange={(v) => onToggle(settingKey, v)}
        disabled={!isSuperAdmin}
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const logout = useAuthStore((s) => s.logout);
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';

  const { data: settings, isLoading: settingsLoading } = useSettings();
  const updateSetting = useUpdateSetting();

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updateSetting.mutateAsync({ key, value });
    } catch {
      // silently ignore — refetch will restore correct state
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password changed successfully. Please log in again.' });
      setTimeout(() => { logout(); window.location.href = '/login'; }, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message ?? 'Failed to change password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Settings" />
      <div className="p-6 space-y-6 max-w-xl">

        {/* ── Notification settings ──────────────────────── */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-1">
            <h2 className="font-semibold text-ink">Notifications</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {isSuperAdmin ? 'Only super admins can change these settings.' : 'Contact a super admin to change these settings.'}
            </p>
          </div>

          <div className="divide-y divide-border">
            {settingsLoading ? (
              <div className="py-4">
                {[1].map((i) => (
                  <div key={i} className="flex items-start justify-between gap-4 py-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="mt-0.5 h-9 w-9 rounded-lg shrink-0" />
                      <div className="space-y-2 pt-1">
                        <Skeleton className="h-3.5 w-40 rounded" />
                        <Skeleton className="h-3 w-64 rounded" />
                        <Skeleton className="h-3 w-52 rounded" />
                      </div>
                    </div>
                    <Skeleton className="mt-1 h-6 w-11 rounded-full shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <SettingRow
                icon={<MessageCircle className="h-4 w-4" />}
                title="WhatsApp QR Card on Registration"
                description="Automatically send the member's QR card to their registered mobile number via WhatsApp when a new member is created."
                settingKey="notifications.whatsapp_qr_on_registration"
                settings={settings}
                onToggle={handleToggle}
                isSuperAdmin={isSuperAdmin}
              />
            )}
          </div>

          {!isSuperAdmin && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              View only — super admin access required to change notification settings.
            </p>
          )}
        </div>

        {/* ── Change password ────────────────────────────── */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 font-semibold text-ink">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Current Password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div>
              <Label className="mb-1.5 block">New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <Label className="mb-1.5 block">Confirm New Password</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            {message && (
              <p className={`text-sm ${message.type === 'success' ? 'text-success' : 'text-danger'}`}>
                {message.text}
              </p>
            )}
            <Button type="submit" loading={loading}>Update Password</Button>
          </form>
        </div>

      </div>
    </div>
  );
}
