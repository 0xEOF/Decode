import Link from 'next/link';
import type { ReactNode } from 'react';
import AppNav from './AppNav';
import AssistantWidget from './AssistantWidget';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link href="/app/today" className="app-logo">
          Decode
        </Link>
        <AppNav />
      </header>

      <main className="app-main">{children}</main>

      <AssistantWidget />
    </div>
  );
}
