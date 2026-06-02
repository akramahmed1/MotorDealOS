'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/vehicles', label: 'Vehicles', icon: '🚗' },
  { href: '/dashboard/leads', label: 'Leads', icon: '👥' },
];

const publicLinks = [
  { href: '/sell-your-car', label: 'Sell Car Form', icon: '📝' },
  { href: '/contact', label: 'Contact Form', icon: '📧' },
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

      <nav className="flex-1 overflow-y-auto p-4">
        <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Main</div>
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

        <div className="mt-6 mb-2 text-xs font-semibold uppercase text-gray-500">Public Forms</div>
        <ul className="space-y-2">
          {publicLinks.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center rounded px-3 py-2 text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </a>
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
