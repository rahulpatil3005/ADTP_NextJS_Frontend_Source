import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/primitives';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  tone?: 'primary' | 'success' | 'danger' | 'warning' | 'info';
}

const toneStyles: Record<string, { text: string; bg: string }> = {
  primary: { text: 'text-primary', bg: 'bg-primary-accent' },
  success: { text: 'text-success', bg: 'bg-success-bg' },
  danger: { text: 'text-danger', bg: 'bg-danger-bg' },
  warning: { text: 'text-warning', bg: 'bg-warning-bg' },
  info: { text: 'text-info', bg: 'bg-info-bg' },
};

export function StatCard({ label, value, sublabel, icon: Icon, tone = 'primary' }: StatCardProps) {
  const styles = toneStyles[tone];
  return (
    <Card className="p-4">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-md', styles.bg)}>
        <Icon className={cn('h-[18px] w-[18px]', styles.text)} />
      </div>
      <p className={cn('text-[22px] font-semibold leading-none', styles.text)}>{value}</p>
      <p className="mt-1.5 text-[13px] text-ink-secondary">{label}</p>
      {sublabel && <p className="mt-0.5 text-[11px] text-ink-secondary/70">{sublabel}</p>}
    </Card>
  );
}
