import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      {/* contain:layout+style isolates repaints to the main scroll area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
