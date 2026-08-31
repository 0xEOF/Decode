# AI Student Success Assistant

Monorepo for the full product (see [ROADMAP.md](./ROADMAP.md) for the product
vision, architecture decisions, and development plan). Right now this repo
contains **Decode** — the hidden text / prompt-injection / covert-AI-instruction
scanner — both as a free, public, SEO-optimized tool and as the shared
detection engine the rest of the product will use to protect its own document
pipelines. Everything else in the roadmap (auth, scheduling engine, syllabus
upload, AI assistant) is not built yet.

## Structure

```
apps/
  web/                  Next.js 16 (App Router) — the public site, including
                         Decode's scanner UI at "/" and its API route

packages/
  content-scanner/      Decode's detection engine — pure TypeScript, no
                         framework dependency (unicode/keyword/hidden-content
                         detection, the clean-version generator)
  ai/                   AIProvider abstraction (generate/extract/
                         extractFromImage/classify/toolCall) wrapping the
                         Anthropic SDK — Decode's AI deep scan is built on
                         top of this, not a one-off API call
```

## Development

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill in ANTHROPIC_API_KEY
pnpm dev            # runs apps/web on http://localhost:3000
```

```sh
pnpm test           # unit tests across every package (turbo)
pnpm build          # production build across every package
pnpm typecheck       # typecheck across every package
pnpm lint            # lint apps/web
```

Or run a single package directly, e.g. `pnpm --filter @decode/content-scanner test`.

## SEO

`apps/web/app/layout.tsx` and `app/robots.ts`/`app/sitemap.ts` currently use
a placeholder domain (`REPLACE-WITH-YOUR-DOMAIN.com`) for the absolute URLs
canonical/OG/sitemap require. **Before going live**, replace every
occurrence with the real production domain:

```sh
grep -rl 'REPLACE-WITH-YOUR-DOMAIN' apps/web/app \
  | xargs sed -i 's#https://REPLACE-WITH-YOUR-DOMAIN.com#https://your-real-domain.com#g'
```

Favicons, the Open Graph image, and the web manifest use Next's built-in file
conventions (`app/icon.svg`, `app/apple-icon.png`, `app/opengraph-image.png`,
`app/manifest.ts`) — Next generates the corresponding `<head>` tags and
`/manifest.webmanifest`/`/sitemap.xml`/`/robots.txt` routes automatically; no
static files to keep in sync by hand.

## Deployment

Push this repo and import it in Vercel with **Root Directory set to
`apps/web`** — Vercel auto-detects the Next.js framework preset from there.
Set `ANTHROPIC_API_KEY` (and `ANTHROPIC_WORKSPACE_ID` if your key needs it —
see `apps/web/.env.example`) in the project's Environment Variables, then
deploy.
