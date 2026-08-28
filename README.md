# Hidden Text & Content Scanner (MVP)

A client-side web app that scans pasted text or rich-text/HTML content for:

- Content hidden via `display:none`, `visibility:hidden`, `opacity:0`, or similar formatting
- Invisible/suspicious Unicode characters (zero-width spaces, bidirectional
  control characters, the Unicode "tag" block used to smuggle hidden text)
- Predefined suspicious phrases/keywords (prompt-injection language,
  credential phishing, social-engineering and financial-scam language)

Findings are highlighted directly in the analyzed output, explained in a
findings panel, and a **Copy Clean Version** button produces a copy with only
the objectively hidden/invisible content removed — visible suspicious phrases
are always preserved, since a keyword being suspicious is not a reason to
delete visible content.

Everything runs entirely in the browser. No content is sent to a server.

## Architecture

```
src/lib/
├── types.ts       # shared types (Segment, Finding, AnalysisResult)
├── unicode.ts      # invisible/suspicious Unicode character detection
├── keywords.ts      # suspicious phrase/keyword detection
├── visibility.ts     # plain text / HTML -> Segment[] (hidden content detection)
├── analyzer.ts      # orchestrates detectors into an AnalysisResult
└── cleaner.ts       # builds the clean version from the analysis findings
```

The cleaner operates on the analyzer's findings, not a regex pass over the
raw input: only segments flagged `hidden` and characters flagged
`unicode-invisible` are removed; `suspicious-keyword` findings are always
preserved.

## Development

```sh
npm install
npm run dev      # start the dev server
npm run test      # run the unit tests (vitest)
npm run build      # typecheck + production build
npm run lint      # oxlint
```
