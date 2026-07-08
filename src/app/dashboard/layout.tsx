import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}