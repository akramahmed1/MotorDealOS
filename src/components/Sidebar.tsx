'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/vehicles', label: 'Vehicles', icon: '🚗' },
  { href: '/dashboard/leads', label: 'Leads', icon: '👥' },
  { href: '/dashboard/imports/autofunds', label: 'Import Inventory', icon: '📥' },
  { href: '/dashboard/imports/workbook', label: 'Import Workbook', icon: '📋' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = createBrowserClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      <div className="border-b border-gray-800 p-4">
        <h1 className="text-xl font-bold text-blue-400">MotorDealOS</h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center rounded px-3 py-2 transition ${
                  pathname === item.href
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-800 p-4">
        <button
          onClick={handleSignOut}
          className="w-full rounded bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}