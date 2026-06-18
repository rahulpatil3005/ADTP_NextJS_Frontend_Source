'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMembers } from '@/lib/hooks/use-members';
import { useMarkAttendance } from '@/lib/hooks/use-attendance';
import { getInitials, instrumentLabel } from '@/lib/utils';

interface Props {
  sessionId: string;
  onClose: () => void;
  onSuccess: (memberName: string, status: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'late',    label: 'Late',    color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'absent',  label: 'Absent',  color: 'bg-red-100 text-red-700 border-red-300' },
];

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ManualEntryDialog({ sessionId, onClose, onSuccess }: Props) {
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<{ id: string; full_name: string; member_id: string; instrument: string } | null>(null);
  const [status, setStatus] = useState('present');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 350);

  // API returns { data: Member[], total, page, ... } wrapped in ApiResponse
  // useMembers accesses data.data → so members are in membersData?.data
  const { data: membersData, isLoading } = useMembers({
    query: debouncedSearch,
    status: 'active',
    limit: 50,
  });
  const members: any[] = membersData?.data ?? [];

  const mark = useMarkAttendance();

  const handleSubmit = async () => {
    if (!selectedMember) return;
    setError(null);
    try {
      await mark.mutateAsync({
        sessionId,
        memberId: selectedMember.id,
        status,
        overrideReason: reason.trim() || `Manual entry by admin`,
      });
      onSuccess(selectedMember.full_name, status);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to mark attendance');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">Manual Attendance Entry</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Step 1: Search member */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">
              1. Search Member
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Name or member ID…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedMember(null); }}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Member list */}
            {search.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50 shadow-sm">
                {isLoading && (
                  <p className="p-3 text-center text-xs text-gray-400">Searching…</p>
                )}
                {!isLoading && members.length === 0 && (
                  <p className="p-3 text-center text-xs text-gray-400">No members found</p>
                )}
                {members.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMember(m); setSearch(m.full_name); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/5 ${
                      selectedMember?.id === m.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(m.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.full_name}</p>
                      <p className="text-xs text-gray-400">{m.member_id} · {instrumentLabel[m.instrument] ?? m.instrument}</p>
                    </div>
                    {selectedMember?.id === m.id && (
                      <span className="ml-auto text-primary text-xs font-semibold">Selected</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Selected member pill */}
            {selectedMember && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(selectedMember.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{selectedMember.full_name}</p>
                  <p className="text-xs text-gray-400">{selectedMember.member_id}</p>
                </div>
                <button onClick={() => { setSelectedMember(null); setSearch(''); }} className="text-gray-300 hover:text-gray-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Status */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">
              2. Mark As
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`rounded-lg border py-2.5 text-sm font-semibold transition-all ${
                    status === opt.value
                      ? opt.color + ' border-2 shadow-sm scale-[1.02]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Reason (optional) */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">
              3. Reason <span className="normal-case text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Scanner not working, late arrival…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!selectedMember || mark.isPending}
            loading={mark.isPending}
            onClick={handleSubmit}
          >
            Mark {STATUS_OPTIONS.find(o => o.value === status)?.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
