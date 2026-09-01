import type { Metadata } from 'next';
import './app.css';
import AppShell from './components/AppShell';

export const metadata: Metadata = {
  title: { default: 'Today', template: '%s · App · Decode' },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: LayoutProps<'/app'>) {
  return <AppShell>{children}</AppShell>;
}
