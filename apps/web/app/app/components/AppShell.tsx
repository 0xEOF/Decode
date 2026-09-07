import Link from 'next/link';
import type { ReactNode } from 'react';
import AppNav from './AppNav';
import AssistantWidget from './AssistantWidget';
import { SITE_NAME } from '../../../lib/site';

interface AppShellProps {
  children: ReactNode;
  /** null when browsing anonymously — the app stays usable with mock data either way; see proxy.ts. */
  userEmail: string | null;
}

export default function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link href="/app/today" className="app-logo">
          {SITE_NAME}
        </Link>
        <AppNav />
        {userEmail ? (
          <form action="/api/auth/signout" method="post" className="app-auth-control">
            <span className="app-auth-email">{userEmail}</span>
            <button type="submit" className="app-auth-signout">
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/signin" className="app-auth-control app-auth-signin">
            Sign in
          </Link>
        )}
      </header>

      <main className="app-main">{children}</main>

      <AssistantWidget />
    </div>
  );
}
