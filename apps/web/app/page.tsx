import Link from 'next/link';
import './decode.css';
import ScannerTool from './components/ScannerTool';

const FAQ = [
  {
    q: 'What is a hidden or covert prompt injection attack?',
    a: "It's text embedded in a document that isn't meant to be read by a human — hidden via CSS, invisible Unicode characters, or a covert instruction addressed directly to an AI — designed to manipulate whichever AI system later reads, grades, or summarizes that document.",
  },
  {
    q: 'How do I check if my essay or assignment has hidden text?',
    a: 'Paste the text into the box above and click Analyze. Decode checks for CSS-hidden content, invisible Unicode characters, and covert AI-directed instructions, then highlights anything it finds directly in your text.',
  },
  {
    q: 'Does my text get sent anywhere?',
    a: 'Hidden-content and invisible-Unicode detection run entirely in your browser. Only the visible text is sent to our server for an AI deep scan that catches paraphrased covert instructions a fixed pattern list would miss — hidden content itself is never sent.',
  },
  {
    q: 'Can teachers use this to check assignments or AI grading prompts?',
    a: 'Yes — paste a student submission, an AI grading rubric, or any shared document to check for hidden instructions aimed at manipulating an AI grader before it processes the document.',
  },
  {
    q: 'Is Decode free to use?',
    a: 'Yes, the scanner is free with no signup required.',
  },
];

const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Decode',
  alternateName: 'Hidden Text & Content Scanner',
  description:
    'Client-side tool that scans pasted text or rich-text/HTML for hidden content, invisible Unicode characters, suspicious phrases, and covert AI-directed instructions, then produces a clean copy with only the hidden/covert content removed.',
  applicationCategory: 'SecurityApplication',
  operatingSystem: 'Any (web browser)',
  browserRequirements: 'Requires JavaScript',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'Detects content hidden via CSS (display:none, visibility:hidden, opacity:0)',
    'Detects invisible and suspicious Unicode characters (zero-width spaces, bidirectional overrides, Unicode tag steganography)',
    'Detects covert instructions aimed at manipulating AI systems, including an AI-powered deep scan',
    'Produces a clean copy with hidden/covert content removed while preserving visible text',
    'Runs client-side; no data required to leave the browser for local checks',
  ],
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function HomePage() {
  return (
    <div id="page-shell" className="app">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="app-header">
        <p className="eyebrow">Free &middot; Client-side &middot; No signup</p>
        <h1>Decode</h1>
        <p className="tagline">
          Hidden Text &amp; Prompt Injection Scanner — paste any text, essay prompt, or document and reveal what
          isn&apos;t meant to be seen: hidden content, invisible Unicode, and covert instructions aimed at AI
          readers.
        </p>
        <p className="tagline" style={{ marginTop: 12 }}>
          Decode is also the integrity check inside a bigger project we&apos;re building —{' '}
          <Link href="/app/today" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            preview the AI Student Success Assistant →
          </Link>
        </p>
      </header>

      <main>
        <ScannerTool />

        <section className="content-section" aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading">How Decode works</h2>
          <ol className="steps">
            <li>
              <strong>Paste</strong> — drop in an essay prompt, assignment, shared doc, or any pasted text or
              rich-text/HTML content.
            </li>
            <li>
              <strong>Analyze</strong> — Decode checks locally for CSS-hidden content and invisible Unicode
              characters, then runs an AI deep scan for covert instructions a fixed pattern list would miss.
            </li>
            <li>
              <strong>Review &amp; copy clean</strong> — see exactly what was hidden, right inside your text, then
              copy a clean version with only the hidden/covert content removed.
            </li>
          </ol>
        </section>

        <section className="content-section" aria-labelledby="faq-heading">
          <h2 id="faq-heading">Frequently asked questions</h2>
          <dl className="faq-list">
            {FAQ.map((item) => (
              <div className="faq-item" key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="footnote">
        Hidden/invisible-content detection runs entirely in your browser. Visible text is also sent to our server
        for an AI deep scan for covert instructions — this tool exposes hidden content, it does not censor visible
        content.
      </footer>
    </div>
  );
}
