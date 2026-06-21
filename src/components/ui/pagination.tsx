'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '…')[] = [1];

  if (current > 3) pages.push('…');

  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('…');
  pages.push(total);

  return pages;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  const btn = (
    content: React.ReactNode,
    onClick: () => void,
    disabled: boolean,
    active = false,
    key?: string | number,
  ) => (
    <button
      key={key}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
        active
          ? 'border-amber-400 bg-amber-50 text-amber-600'
          : disabled
            ? 'cursor-not-allowed border-border bg-background text-ink-secondary/30'
            : 'border-border bg-background text-ink-secondary hover:border-amber-300 hover:text-ink',
      )}
    >
      {content}
    </button>
  );

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {btn(<ChevronLeft className="h-4 w-4" />, () => onPageChange(page - 1), page <= 1, false, 'prev')}

      {pages.map((p, i) =>
        p === '…'
          ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-sm text-ink-secondary/50">
              …
            </span>
          )
          : btn(p, () => onPageChange(p as number), false, p === page, p)
      )}

      {btn(<ChevronRight className="h-4 w-4" />, () => onPageChange(page + 1), page >= totalPages, false, 'next')}
    </div>
  );
}
