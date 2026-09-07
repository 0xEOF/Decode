import Link from 'next/link';
import type { ReactNode } from 'react';
import AppNav from './AppNav';
import AssistantWidget from './AssistantWidget';
import { SITE_NAME } from '../../../lib/site';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link href="/app/today" className="app-logo">
          {SITE_NAME}
        </Link>
        <AppNav />
      </header>

      <main className="app-main">{children}</main>

      <AssistantWidget />
    </div>
  );
}
