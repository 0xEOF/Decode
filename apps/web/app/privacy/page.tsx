import type { Metadata } from 'next';
import LegalPage from '../components/LegalPage';
import { CONTACT_EMAIL, SITE_NAME } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE_NAME} handles the text you scan, the AI deep scan and safe-prompt features, waitlist emails, and rate-limiting data.`,
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate="[fill in on publish]">
      <p>
        This policy explains what {SITE_NAME} does and does not do with the content you paste, the email you give
        us for the waitlist, and other data connected to using the site. {SITE_NAME} does not require an account
        to use the free scanner.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>Text you paste to scan.</strong> The hidden-content and invisible-Unicode checks run entirely in
        your browser — that text is never sent anywhere for those checks. If you click{' '}
        <strong>&ldquo;Run AI deep scan,&rdquo;</strong> the visible text is sent to our server and forwarded to
        our AI provider (see &ldquo;Third parties&rdquo; below) solely to detect covert AI-directed instructions.
        We do not save that text to a database afterward.
      </p>
      <p>
        <strong>Safe Prompt feature.</strong> If you use &ldquo;Generate Safe Prompt,&rdquo; the task description,
        any optional requirements you enter, a summary of scan findings, and the cleaned text are sent to our
        server and to our AI provider to produce the prompt. This is not saved afterward either.
      </p>
      <p>
        <strong>Waitlist email.</strong> If you join the waitlist, we keep the email address you submit so we can
        contact you about early access. We do not sell this list or use it for anything else.
      </p>
      <p>
        <strong>Rate-limiting data.</strong> We track your IP address in memory, temporarily, to apply a limit on
        how many scan/prompt requests can come from one address per hour. This is purely to prevent abuse — it is
        not linked to any identity, not written to a database, and clears automatically after the hour window.
      </p>
      <p>
        <strong>The Student Success Assistant preview.</strong> The scheduler preview runs entirely in your
        browser&apos;s memory for demonstration purposes. Courses, tasks, and calendar events you add there are
        never sent to or stored on our servers, and reset when you reload the page.
      </p>
      <p>
        <strong>Cookies and tracking.</strong> {SITE_NAME} does not use tracking cookies, analytics, or
        advertising trackers at this time. If that changes, we&apos;ll update this policy first.
      </p>

      <h2>Third parties</h2>
      <ul>
        <li>
          <strong>Anthropic (Claude API):</strong> processes the visible text you submit when you opt into the AI
          deep scan or safe-prompt features, solely to return the result to you.
        </li>
        <li>
          <strong>Hosting provider:</strong> our infrastructure provider processes requests to operate the site,
          under its own standard operational logging.
        </li>
        <li>
          <strong>Waitlist notifications:</strong> if we&apos;ve configured an internal notification integration
          (e.g. Slack), a new waitlist signup&apos;s email is forwarded there so we can follow up — it is not
          shared outside our own team.
        </li>
      </ul>

      <h2>Data retention</h2>
      <p>
        We don&apos;t have a database of scans, prompts, or documents — that content simply isn&apos;t stored past
        the request that generates your result. Waitlist emails are kept until you ask us to delete them or we
        launch the product they signed up for and the list is no longer needed. Rate-limit counters expire within
        an hour.
      </p>

      <h2>Your choices</h2>
      <p>
        You can use every local check with zero data leaving your browser by never clicking &ldquo;Run AI deep
        scan&rdquo; or &ldquo;Generate Safe Prompt.&rdquo; To remove your email from the waitlist, contact us at
        the address below.
      </p>

      <h2>Children&apos;s privacy</h2>
      <p>
        {SITE_NAME} is not directed at children under 13, and we do not knowingly collect personal information
        from them.
      </p>

      <h2>International users</h2>
      <p>
        Your data may be processed in the United States or other countries where our hosting and AI providers
        operate.
      </p>

      <h2>Security</h2>
      <p>
        We take reasonable measures to protect data in transit and while it&apos;s briefly processed, but no
        method of transmission or storage is completely secure.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as the product changes. Material changes will be reflected by updating the
        effective date above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests about this policy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
