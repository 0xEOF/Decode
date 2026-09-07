import Link from 'next/link';
import type { Metadata } from 'next';
import '../app/app.css';
import AuthShell from '../components/AuthShell';
import ResetPasswordForm from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to set a new password."
      footer={
        <p>
          <Link href="/signin">Back to sign in</Link>
        </p>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
