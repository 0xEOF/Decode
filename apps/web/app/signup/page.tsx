import Link from 'next/link';
import type { Metadata } from 'next';
import '../app/app.css';
import AuthShell from '../components/AuthShell';
import SignUpForm from './SignUpForm';

export const metadata: Metadata = {
  title: 'Sign up',
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Sign up to save your semester — courses, tasks, and schedule persist across visits."
      footer={
        <p>
          Already have an account? <Link href="/signin">Sign in</Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
