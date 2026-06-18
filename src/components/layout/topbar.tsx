'use client';

import { useState } from 'react';
import { LogOut, User, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ProfileModal } from '@/components/profile/profile-modal';

export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const { logout, role } = useAuthStore();
  const { toggleMobileSidebar } = useUiStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
    <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-3 lg:px-6">
      {/* Hamburger (mobile) + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="flex items-center justify-center rounded-md p-1.5 text-ink hover:bg-background lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="h-6 w-1 rounded-full bg-gold" />
        <h1 className="text-[17px] font-semibold text-ink">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
<DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background">
            {/* Avatar uses gold ring */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white ring-2 ring-gold ring-offset-1">
              {role === 'super_admin' ? 'SA' : 'AD'}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <User className="mr-2 h-4 w-4" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-danger">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  );
}
