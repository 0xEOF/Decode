import type { Metadata } from 'next';
import LegalPage from '../components/LegalPage';
import { CONTACT_EMAIL, SITE_NAME } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms for using ${SITE_NAME}'s free scanner and the in-development Student Success Assistant preview.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" effectiveDate="[fill in on publish]">
      <p>
        These terms govern your use of {SITE_NAME} — the free hidden-text and prompt-injection scanner, and the
        in-development Student Success Assistant preview. By using the site, you agree to these terms.
      </p>

      <h2>The service</h2>
      <p>
        {SITE_NAME}&apos;s scanner checks pasted text locally in your browser for hidden content and invisible
        Unicode characters, and automatically runs an AI deep scan (plus an optional safe-prompt generator) that
        send data to a third-party AI provider. The Student Success Assistant is a preview with no accounts or
        data persistence
        — it may change substantially, reset, or be temporarily unavailable without notice while in development.
      </p>

      <h2>No guarantee of detection</h2>
      <p>
        {SITE_NAME}&apos;s checks are automated and best-effort. They cannot guarantee detection of every instance
        of hidden content, invisible characters, or covert instructions, and may occasionally flag something
        incorrectly. Do not rely on {SITE_NAME} as your sole safeguard for academic integrity, hiring decisions,
        security, or any other consequential decision — use your own judgment alongside it.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the service to develop or test prompt-injection attacks against systems you don&apos;t have permission to test.</li>
        <li>Attempt to circumvent rate limits or otherwise abuse the service&apos;s availability.</li>
        <li>Submit content you don&apos;t have the right to share, or that violates applicable law.</li>
        <li>Use the service to build a competing product by systematically extracting its detection logic through automated queries.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain all rights to text you paste into {SITE_NAME}. We claim no ownership over it, and its only use
        is to provide the specific check or feature you requested, as described in our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Third-party AI</h2>
      <p>
        The AI deep scan (which runs automatically when you analyze text) and the optional safe-prompt feature
        send data to a third-party AI provider to generate their results. By using the scanner, you agree to that
        transmission as described in our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any
        kind, express or implied, including fitness for a particular purpose or non-infringement.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {SITE_NAME} is not liable for indirect, incidental, or
        consequential damages, or for outcomes resulting from reliance on scan results or the preview scheduler.
      </p>

      <h2>Pricing and changes</h2>
      <p>
        The scanner is currently free to use. We may introduce paid tiers for additional features in the future;
        if we do, we&apos;ll give notice before any change affects features you&apos;re already using for free.
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or restrict access for anyone who abuses the service, including repeated attempts to
        circumvent rate limits or other security measures.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of [fill in your jurisdiction], without regard to conflict-of-law principles.</p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms as the product changes. Continuing to use {SITE_NAME} after an update means you
        accept the revised terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
