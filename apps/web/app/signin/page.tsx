import Link from 'next/link';
import type { Metadata } from 'next';
import '../app/app.css';
import AuthShell from '../components/AuthShell';
import SignInForm from './SignInForm';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in"
      footer={
        <>
          <p>
            <Link href="/reset-password">Forgot your password?</Link>
          </p>
          <p>
            No account yet? <Link href="/signup">Sign up</Link>
          </p>
        </>
      }
    >
      <SignInForm />
    </AuthShell>
  );
}
