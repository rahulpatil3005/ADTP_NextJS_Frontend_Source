import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', opts ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const instrumentLabel: Record<string, string> = {
  dhol: 'Dhol', tasha: 'Tasha', tool: 'Tool', dholki: 'Dholki', other: 'Other',
};

export const statusBadgeColor: Record<string, { bg: string; text: string }> = {
  present: { bg: 'bg-success-bg', text: 'text-success' },
  active: { bg: 'bg-success-bg', text: 'text-success' },
  late: { bg: 'bg-warning-bg', text: 'text-warning' },
  pending: { bg: 'bg-warning-bg', text: 'text-warning' },
  absent: { bg: 'bg-danger-bg', text: 'text-danger' },
  inactive: { bg: 'bg-danger-bg', text: 'text-danger' },
  leave: { bg: 'bg-info-bg', text: 'text-info' },
  half_day: { bg: 'bg-primary-accent', text: 'text-primary' },
};
