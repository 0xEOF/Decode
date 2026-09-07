import Link from 'next/link';
import type { ReactNode } from 'react';
import { SITE_NAME } from '../../lib/site';
import '../auth.css';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          {SITE_NAME}
        </Link>
        <h1>{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}
