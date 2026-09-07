import type { Metadata } from 'next';
import './app.css';
import AppShell from './components/AppShell';
import { SITE_NAME } from '../../lib/site';
import { getAuthedUser } from '../../lib/api-auth';

export const metadata: Metadata = {
  title: { default: 'Today', template: `%s · App · ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: LayoutProps<'/app'>) {
  const user = await getAuthedUser();
  return <AppShell userEmail={user?.email ?? null}>{children}</AppShell>;
}
