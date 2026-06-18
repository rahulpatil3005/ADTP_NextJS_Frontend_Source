import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui/primitives';
import { getInitials, instrumentLabel, statusBadgeColor } from '@/lib/utils';
import type { Member } from '@/types';

const avatarPalette = [
  'bg-info-bg text-info', 'bg-primary-accent text-primary',
  'bg-success-bg text-success', 'bg-warning-bg text-warning',
];

export function RecentRegistrations({ members }: { members: Member[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Registrations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {members.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-secondary">No registrations yet</p>
        )}
        {members.map((member, i) => {
          const status = statusBadgeColor[member.status] ?? statusBadgeColor.pending;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-medium ${avatarPalette[i % avatarPalette.length]}`}
              >
                {getInitials(member.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{member.full_name}</p>
                <p className="truncate text-xs text-ink-secondary">
                  {instrumentLabel[member.instrument]} ·{' '}
                  <span className="font-mono">{member.member_id}</span>
                </p>
              </div>
              <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
                {member.status === 'active' ? 'Active' : 'Pending'}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
