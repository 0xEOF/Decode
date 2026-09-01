'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/app/today', label: 'Today' },
  { href: '/app/calendar', label: 'Calendar' },
  { href: '/app/tasks', label: 'Tasks' },
  { href: '/app/courses', label: 'Courses' },
  { href: '/app/projects', label: 'Projects' },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="App">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href} className={`app-nav-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
