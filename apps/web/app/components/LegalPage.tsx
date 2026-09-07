import Link from 'next/link';
import type { ReactNode } from 'react';
import '../legal.css';

interface Props {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}

export default function LegalPage({ title, effectiveDate, children }: Props) {
  return (
    <>
      <nav className="legal-nav" aria-label="Site">
        <div className="legal-nav-inner">
          <Link href="/">← Back to home</Link>
        </div>
      </nav>
      <div className="legal-shell">
        <div className="legal-draft-notice">
          <strong>Draft document.</strong> This page was generated as a starting point and is not legal advice.
          Have it reviewed by a qualified lawyer for your jurisdiction before relying on it, and fill in the
          placeholders below (contact email, effective date, governing law) once finalized.
        </div>
        <h1>{title}</h1>
        <p className="legal-effective-date">Effective date: {effectiveDate}</p>
        {children}
      </div>
    </>
  );
}
