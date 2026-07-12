'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

const NAV = [
  { href: '/admin', label: 'Overview', icon: 'ti-chart-bar', exact: true },
  { href: '/admin/voices', label: 'Voices', icon: 'ti-microphone' },
  { href: '/admin/packs', label: 'Packs', icon: 'ti-package' },
  { href: '/admin/users', label: 'Customers', icon: 'ti-users' },
  { href: '/admin/orders', label: 'Orders', icon: 'ti-receipt' },
  { href: '/admin/vouches', label: 'Vouches', icon: 'ti-brand-youtube' },
];

export default function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <i className="ti ti-shield-lock" /> Admin
        </div>
        <nav className="admin-nav">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
                <i className={`ti ${item.icon}`} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-foot">
          <span>{email}</span>
          <Link href="/dashboard">← Back to site</Link>
          <LogoutButton />
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
