import type { Metadata } from 'next';
import './app.css';
import AppShell from './components/AppShell';
import { SITE_NAME } from '../../lib/site';

export const metadata: Metadata = {
  title: { default: 'Today', template: `%s · App · ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: LayoutProps<'/app'>) {
  return <AppShell>{children}</AppShell>;
}
