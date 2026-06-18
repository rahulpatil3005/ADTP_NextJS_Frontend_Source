import { Music2 } from 'lucide-react';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center gap-2.5 border-b border-border bg-surface px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-accent">
          <Music2 className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-ink">Avishkar DHTP — Member Portal</span>
      </header>
      <main className="mx-auto max-w-2xl p-4">{children}</main>
    </div>
  );
}
