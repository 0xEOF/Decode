'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import AppNav from './AppNav';
import AssistantPanel from './AssistantPanel';

export default function AppShell({ children }: { children: ReactNode }) {
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link href="/app/today" className="app-logo">
          Decode
        </Link>
        <AppNav />
        <button type="button" className="button-primary assistant-toggle" onClick={() => setAssistantOpen(true)}>
          AI Assistant
        </button>
      </header>

      <main className="app-main">{children}</main>

      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
