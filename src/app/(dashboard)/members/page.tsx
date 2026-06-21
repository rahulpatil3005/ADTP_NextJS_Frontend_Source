'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, Filter, X, Download } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Input, Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { useMembers } from '@/lib/hooks/use-members';
import { getInitials, instrumentLabel, statusBadgeColor, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api/client';

const INSTRUMENT_OPTIONS = [
  { value: 'dhol',  label: 'ढोल (Dhol)' },
  { value: 'tasha', label: 'ताशा (Tasha)' },
  { value: 'tool',  label: 'टोल (Tool)' },
  { value: 'dhwaj', label: 'ध्वज (Dhwaj)' },
];

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'inactive',  label: 'Inactive' },
  { value: 'pending',   label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'left',      label: 'Left' },
  { value: 'graduated', label: 'Graduated' },
];

function MembersPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read state from URL so back-button restores page/filters
  const query      = searchParams.get('q') ?? '';
  const instrument = searchParams.get('instrument') ?? '';
  const status     = searchParams.get('status') ?? '';
  const page       = Number(searchParams.get('page') ?? '1');

  const [showFilter, setShowFilter] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const role = useAuthStore((s) => s.role);

  const setParam = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    // Always reset to page 1 when filters/search change (unless explicitly setting page)
    if (!('page' in updates)) params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDownloadAllQr = async () => {
    setDownloading(true);
    try {
      const res = await apiClient.get('/qr/download-all-zip', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ADTP_QR_Cards_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download QR cards. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const activeFilterCount = [instrument, status].filter(Boolean).length;

  const { data, isLoading } = useMembers({
    query: query || undefined,
    instrument: instrument || undefined,
    status: status || undefined,
    page,
    limit: 10,
  });

  const clearFilters = () => setParam({ instrument: '', status: '' });

  return (
    <div>
      <Topbar title="Members" />

      <div className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary" />
            <Input
              placeholder="Search by name, ID, or mobile…"
              className="pl-9"
              value={query}
              onChange={(e) => setParam({ q: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilter((v) => !v)}
              className={activeFilterCount > 0 ? 'border-primary text-primary' : ''}
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {role === 'super_admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAllQr}
                disabled={downloading}
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Preparing ZIP…' : 'Download All QR Cards'}
              </Button>
            )}
            <Button asChild size="sm">
              <Link href="/members/new">
                <Plus className="h-4 w-4" /> Register Member
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="mb-5 rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-ink">Filter Members</p>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowFilter(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-gray-100 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2">
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-secondary">Instrument</p>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setParam({ instrument: instrument === opt.value ? '' : opt.value })}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        instrument === opt.value
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-border bg-background text-ink hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      {instrument === opt.value && <X className="h-3 w-3" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-secondary">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setParam({ status: status === opt.value ? '' : opt.value })}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        status === opt.value
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-border bg-background text-ink hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      {status === opt.value && <X className="h-3 w-3" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-ink-secondary">
                {activeFilterCount === 0
                  ? 'No filters applied'
                  : `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied · ${data?.total ?? '…'} result${(data?.total ?? 0) !== 1 ? 's' : ''}`}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={activeFilterCount === 0} onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear Filters
                </Button>
                <Button size="sm" onClick={() => setShowFilter(false)}>Done</Button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-4 py-3 text-left font-medium text-ink-secondary">Member</th>
                <th className="px-4 py-3 text-left font-medium text-ink-secondary">Member ID</th>
                <th className="px-4 py-3 text-left font-medium text-ink-secondary">Instrument</th>
                <th className="px-4 py-3 text-left font-medium text-ink-secondary">Mobile</th>
                <th className="px-4 py-3 text-left font-medium text-ink-secondary">Joined</th>
                <th className="px-4 py-3 text-left font-medium text-ink-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <Skeleton className="h-4 w-28 rounded" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  </tr>
                ))}

              {data?.data.map((member) => {
                const st = statusBadgeColor[member.status] ?? statusBadgeColor.pending;
                return (
                  <tr key={member.id} className="border-b border-border last:border-0 hover:bg-background/60">
                    <td className="px-4 py-3">
                      <Link href={`/members/${member.id}`} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-accent text-xs font-medium text-primary">
                          {getInitials(member.full_name)}
                        </div>
                        <span className="font-medium text-ink">{member.full_name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-secondary">{member.member_id}</td>
                    <td className="px-4 py-3 text-ink-secondary">{instrumentLabel[member.instrument] ?? member.instrument}</td>
                    <td className="px-4 py-3 text-ink-secondary">{member.mobile_number}</td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {member.joining_date ? formatDate(member.joining_date) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
                        {member.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}

              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-secondary">
                    No members found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-ink-secondary">
            <span>
              Page {data.page} of {data.totalPages} · {data.total} members
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setParam({ page: String(page - 1) })}
              >
                Previous
              </Button>
              <Button
                variant="outline" size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setParam({ page: String(page + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense>
      <MembersPageInner />
    </Suspense>
  );
}
