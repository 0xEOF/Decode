import type { Metadata } from 'next';
import '../app/app.css';
import AuthShell from '../components/AuthShell';
import UpdatePasswordForm from './UpdatePasswordForm';

export const metadata: Metadata = {
  title: 'Set a new password',
  robots: { index: false, follow: false },
};

export default function UpdatePasswordPage() {
  return (
    <AuthShell title="Set a new password">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
