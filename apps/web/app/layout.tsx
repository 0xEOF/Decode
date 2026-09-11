import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AppDataProvider } from './AppDataProvider';
import { SITE_NAME } from '../lib/site';

// Self-hosted by next/font — no request to Google at runtime, so this stays
// consistent with the "no third-party trackers" line in the Privacy Policy.
// Scoped via the --font-hero CSS variable (see decode.css .app-header h1)
// rather than applied globally, so the rest of the site keeps --sans.
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-hero', display: 'swap' });

// Canonical/OG/sitemap absolute-URL base. See README.md "SEO" if this ever
// needs to change again — one command updates every occurrence at once.
const SITE_URL = 'https://reveala.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Hidden Text & Prompt Injection Scanner`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    'Paste any text, essay prompt, or document and instantly reveal hidden content, invisible Unicode characters, and covert AI-directed instructions — the kind of prompt injection tricks that slip past students, teachers, and AI grading tools. Free, runs in your browser.',
  keywords: [
    'hidden text detector',
    'prompt injection scanner',
    'invisible unicode checker',
    'zero width space detector',
    'AI prompt injection',
    'hidden instructions in essay',
    'detect hidden text in document',
    'covert AI instructions',
    'academic integrity tool',
    'chatgpt prompt injection checker',
    'ignore previous instructions detector',
    'ATS resume hidden text',
    'resume prompt injection',
    'hidden text in job application',
    'AI grading manipulation',
    'unicode steganography detector',
    'white text hidden instructions',
    'AI hiring screener manipulation',
  ],
  authors: [{ name: SITE_NAME }],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Hidden Text & Prompt Injection Scanner`,
    description:
      'Reveal hidden content, invisible Unicode characters, and covert AI-directed instructions in any pasted text. Free, runs entirely in your browser.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Hidden Text & Prompt Injection Scanner`,
    description:
      'Reveal hidden content, invisible Unicode characters, and covert AI-directed instructions in any pasted text. Free, runs entirely in your browser.',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#aa3bff' },
    { media: '(prefers-color-scheme: dark)', color: '#c084fc' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body>
        <AppDataProvider>{children}</AppDataProvider>
      </body>
    </html>
  );
}
