'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ScanLine, FileBarChart,
  ShieldCheck, Settings, ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, roles: ['super_admin', 'admin'] },
  { href: '/members',    label: 'Members',     icon: Users,           roles: ['super_admin', 'admin'] },
  { href: '/attendance', label: 'Attendance',  icon: ScanLine,        roles: ['super_admin', 'admin'] },
  { href: '/reports',    label: 'Reports',     icon: FileBarChart,    roles: ['super_admin', 'admin'] },
  { href: '/admins',     label: 'Admins',      icon: ShieldCheck,     roles: ['super_admin'] },
  { href: '/settings',   label: 'Settings',    icon: Settings,        roles: ['super_admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const role = useAuthStore((s) => s.role);

  const visibleItems = navItems.filter((item) => !role || item.roles.includes(role));

  return (
    <aside
      className={cn(
        'flex h-screen flex-col transition-all duration-200',
        'bg-sidebar-bg border-r border-sidebar-border',
        sidebarCollapsed ? 'w-[68px]' : 'w-[240px]',
      )}
    >
      {/* ── Logo / Brand ──────────────────────────────────── */}
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-sidebar-border px-2">
        <img
          src="/avishkar-logo.svg"
          alt="Avishkar Dhol Tasha Pathak"
          className={cn(
            'object-contain transition-all duration-200',
            sidebarCollapsed ? 'h-8 w-auto' : 'h-10 w-auto',
          )}
        />
      </div>

      {/* ── Nav Items ─────────────────────────────────────── */}
      <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                sidebarCollapsed ? 'justify-center' : 'justify-start',
                isActive
                  ? 'bg-primary font-semibold text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/10 hover:text-white/90',
              )}
            >
              <Icon
                className={cn(
                  'h-[20px] w-[20px] shrink-0',
                  isActive ? 'text-gold' : '',
                )}
              />
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Gold divider + collapse button ────────────────── */}
      <div className="border-t border-sidebar-border">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center py-3 text-white/40 hover:text-white/70 transition-colors"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')}
          />
        </button>
      </div>
    </aside>
  );
}
