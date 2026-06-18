'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ScanLine, FileBarChart,
  ShieldCheck, Settings, ChevronLeft, X,
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
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, toggleMobileSidebar } = useUiStore();
  const role = useAuthStore((s) => s.role);

  const visibleItems = navItems.filter((item) => !role || item.roles.includes(role));

  const renderNav = (collapsed: boolean, onLinkClick?: () => void) => (
    <>
      <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                collapsed ? 'justify-center' : 'justify-start',
                isActive
                  ? 'bg-primary font-semibold text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/10 hover:text-white/90',
              )}
            >
              <Icon className={cn('h-[20px] w-[20px] shrink-0', isActive ? 'text-gold' : '')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:flex h-screen flex-col transition-all duration-200',
          'bg-sidebar-bg border-r border-sidebar-border',
          sidebarCollapsed ? 'w-[68px]' : 'w-[240px]',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-sidebar-border px-2">
          <img
            src="/avishkar-logo.svg"
            alt="Avishkar Dhol Tasha Pathak"
            className={cn('object-contain transition-all duration-200', sidebarCollapsed ? 'h-8 w-auto' : 'h-10 w-auto')}
          />
        </div>
        {renderNav(sidebarCollapsed)}
        <div className="hidden border-t border-sidebar-border lg:block">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center py-3 text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </button>
        </div>
      </aside>

      {/* ── Mobile overlay + drawer ────────────────────────── */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col',
          'bg-sidebar-bg border-r border-sidebar-border',
          'transition-transform duration-200 lg:hidden',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <img src="/avishkar-logo.svg" alt="Avishkar Dhol Tasha Pathak" className="h-10 w-auto object-contain" />
          <button onClick={toggleMobileSidebar} className="text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Mobile always shows labels (collapsed=false) */}
        {renderNav(false, toggleMobileSidebar)}
      </aside>
    </>
  );
}
