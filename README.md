# AI Student Success Assistant

Monorepo for the full product (see [ROADMAP.md](./ROADMAP.md) for the product
vision, architecture decisions, and development plan). This repo contains
**Reveala** — the hidden text / prompt-injection / covert-AI-instruction
scanner, live and free at "/" — and, under `/app/*`, an early preview of the
AI Student Success Assistant scheduler: onboarding, Today/Calendar/Tasks/
Courses/Projects, and a deterministic scheduling engine. Both are reachable
anonymously with mock data (the scanner needs no account at all; the
scheduler preview seeds itself from sample data so there's something to see).
Real accounts and persistence exist for the scheduler — sign up and your
semester is saved in Postgres instead of resetting on reload — but need a
Supabase project to actually run; see "Database & Auth setup" below.
Syllabus upload and the AI assistant chat are still mocked end-to-end.

## Structure

```
apps/
  web/                  Next.js 16 (App Router) — the public site (Reveala's
                         scanner UI at "/"), the scheduler preview/app under
                         /app/*, onboarding, and auth pages (/signup, /signin, ...)

packages/
  content-scanner/      Reveala's detection engine — pure TypeScript, no
                         framework dependency (unicode/keyword/hidden-content
                         detection, the clean-version generator)
  ai/                   AIProvider abstraction (generate/extract/
                         extractFromImage/classify/toolCall) wrapping the
                         Anthropic SDK — Reveala's AI deep scan is built on
                         top of this, not a one-off API call
  scheduling-engine/    Deterministic scheduler (pure TS, no LLM calls) —
                         hard/soft constraints, priority scoring, workload
                         balancing (ROADMAP.md §5)
  db/                   Drizzle schema + Postgres client for the real
                         (signed-in) persistence layer (ROADMAP.md §17)
```

## Development

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill in ANTHROPIC_API_KEY
pnpm dev            # runs apps/web on http://localhost:3000
```

The scanner and the scheduler preview both work with nothing else configured.
Real sign-up/sign-in and persistence need a Supabase project — see "Database
& Auth setup" below; skip it if you're only working on Reveala or the preview UI.

```sh
pnpm test           # unit tests across every package (turbo)
pnpm build          # production build across every package
pnpm typecheck       # typecheck across every package
pnpm lint            # lint apps/web
```

Or run a single package directly, e.g. `pnpm --filter @decode/content-scanner test`.

## SEO

`apps/web/app/layout.tsx`, `app/robots.ts`/`app/sitemap.ts`, and
`apps/web/lib/site.ts` (the Terms/Privacy contact email) hold the production
domain (`reveala.app`) used for the absolute URLs canonical/OG/sitemap
require, and for the legal pages' contact address. If that domain ever
changes, update every occurrence in one pass:

```sh
grep -rl 'reveala\.app' apps/web/app apps/web/lib \
  | xargs sed -i 's/reveala\.app/your-new-domain.com/g'
```

Favicons, the Open Graph image, and the web manifest use Next's built-in file
conventions (`app/icon.svg`, `app/apple-icon.png`, `app/opengraph-image.png`,
`app/manifest.ts`) — Next generates the corresponding `<head>` tags and
`/manifest.webmanifest`/`/sitemap.xml`/`/robots.txt` routes automatically; no
static files to keep in sync by hand.

## Database & Auth setup

Optional — everything works anonymously without this (mock data, resets on
reload). Do this once you want real sign-up/sign-in and a semester that
actually persists.

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine).
2. **Run the schema.** In the Supabase dashboard's SQL Editor, run, in order:
   - `packages/db/migrations/0000_worried_fixer.sql` (the tables — generated
     from `packages/db/src/schema.ts` via `drizzle-kit generate`; re-run
     `pnpm --filter @decode/db db:generate` after changing the schema to get
     a fresh migration file instead of hand-editing this one)
   - `packages/db/migrations/0001_auth_rls.sql` (Row-Level Security policies
     + the trigger that creates a `profiles` row on signup — hand-written,
     since it touches Supabase's `auth` schema, which drizzle-kit doesn't
     manage)
3. **Set environment variables** in `apps/web/.env.local` (see
   `apps/web/.env.example` for exactly which three, and where to find each
   in the Supabase dashboard): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` (the **pooled**
   connection string — port 6543 — since the app talks to Postgres directly
   via Drizzle, not through Supabase's client library).
4. **Email confirmation.** Supabase requires email confirmation on signup by
   default. For local testing, either confirm via the email Supabase sends,
   or turn off "Confirm email" under Authentication → Providers → Email in
   the dashboard.

That's it — no code changes. `apps/web/proxy.ts` and every auth-aware code
path check whether Supabase is configured before touching it, so leaving
these unset just means the app stays fully anonymous (see
`apps/web/lib/supabase/is-configured.ts`).

## Deployment

Push this repo and import it in Vercel with **Root Directory set to
`apps/web`** — Vercel auto-detects the Next.js framework preset from there.
Set `ANTHROPIC_API_KEY` (and `ANTHROPIC_WORKSPACE_ID` if your key needs it —
see `apps/web/.env.example`) in the project's Environment Variables, then
deploy. Add the three Supabase variables too (see "Database & Auth setup"
above) once you want real accounts live in production.
