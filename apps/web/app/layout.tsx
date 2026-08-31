import type { Metadata, Viewport } from 'next';
import './globals.css';

// TODO: replace with the real production domain before/at launch — canonical,
// Open Graph, and the sitemap all need an absolute URL to be valid. See
// README.md "SEO" section for the one-line command that updates every
// occurrence at once.
const SITE_URL = 'https://REPLACE-WITH-YOUR-DOMAIN.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Decode — Hidden Text & Prompt Injection Scanner',
    template: '%s · Decode',
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
  ],
  authors: [{ name: 'Decode' }],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Decode',
    title: 'Decode — Hidden Text & Prompt Injection Scanner',
    description:
      'Reveal hidden content, invisible Unicode characters, and covert AI-directed instructions in any pasted text. Free, runs entirely in your browser.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Decode — Hidden Text & Prompt Injection Scanner',
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
