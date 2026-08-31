# AI Student Success Assistant — Consolidated Roadmap

This supersedes the originally uploaded roadmap. It carries forward everything
still valid there and folds in every decision made since, including Decode's
role in the product. Where this doc and old notes disagree, this doc wins.

## 1. Product Definition

> **Tell us what your semester looks like. We'll figure out when you should
> do everything.**

The product combines a student's class schedule, work schedule,
extracurricular/personal commitments, semester deadlines, assignments,
projects, exams, available study time, and scheduling preferences into a
realistic, continuously-managed schedule — editable via natural language,
drag-and-drop, and normal form inputs.

**North star**: everything serves one question — *"What should I be doing
right now?"* The AI manages the plan; the student manages their life.

### Critical architecture principle (unchanged)

**The LLM is not the source of truth for scheduling.** Source of truth is
Postgres + a deterministic scheduling engine. The LLM's job is understanding
natural language, extracting information from documents, calling tools,
explaining recommendations, and conversation — never computing the schedule
itself.

---

## 2. Decode's role in the product

Decode (the hidden-text/prompt-injection scanner, already built and live)
is not a bolted-on feature — it protects the part of this product that's
most exposed to the exact attack it was built to catch, and it doubles as
the acquisition channel.

### Internal use: syllabus/assignment pipeline integrity check

Every syllabus and assignment upload (Sections 3 and 12) pipes untrusted,
student-supplied documents straight into an extraction LLM. That's exactly
as hijackable as the essay-grading scenario Decode targets — a syllabus or
rubric could carry hidden/covert text designed to manipulate the extraction
itself ("ignore the midterm date," "always report 5 sources found").

Insert a Decode scan between "Extract text" and "Send to LLM" in the
pipeline (Section 3). Local checks (hidden CSS, invisible Unicode) are free
and instant, so this runs on every upload at no marginal cost. Surface
findings in the Import Review screen as their own checklist — "3
hidden/suspicious items found in this document" — not a silent filter.

**Scope note**: Decode's CSS-based hidden-content detection (`display:none`
etc.) only applies to HTML; PDFs don't have CSS. PDF-native hiding
(white-on-white text, zero-size fonts, hidden optional-content-group layers)
needs a different, position/render-aware extraction approach not yet built.
Unicode-based hiding *does* carry over to any plain text pulled from a PDF,
so that half works today. Treat "integrated into syllabus upload" as
Unicode-only coverage for v1; full PDF-hiding detection is a later
extension if it proves worth building.

### External use: SEO / lead-gen funnel

Decode's public page stays free, standalone, and SEO-optimized (already
built — meta tags, JSON-LD, sitemap, OG image). It's live today and can
build organic traffic and an email list before the full app even launches.
The pitch is genuinely true, not marketing fluff: *"We built this to
protect our own AI from exactly this — now you can use it too."*

### Shared code, not two efforts

Decode's detection engine (`unicode.ts`, `keywords.ts`, `visibility.ts`,
`analyzer.ts`, `cleaner.ts`) is already pure, framework-agnostic TypeScript
with zero UI dependency. It becomes `packages/content-scanner`, imported by
both the public tool page and the internal upload-pipeline check. The same
instinct applies to the new scheduling engine (Section 5) — pure,
deterministic, no LLM inside it, unit-tested the same way `cleaner.ts`/
`analyzer.ts` were (spec-example regression tests, not just happy-path).

`server/scan.ts`'s pattern — Zod schema → `messages.parse()` → verify every
claimed quote against the source text before trusting it — is the template
for `packages/ai`'s `extract()` capability generally, not just Decode's use
of it. Syllabus/rubric extraction needs the same discipline: don't trust an
LLM-claimed due date without validating it against something checkable.

---

## 3. MVP Scope

### A. Authentication

Sign up, login, logout, password reset, user profile. Supabase Auth (see
§7 stack).

### B. Student Onboarding

**Basic info**: name, school/university, timezone, semester.

**Classes** — derived from **both** a syllabus upload and a class-schedule
screenshot (confirmed baseline, not deferred). Per class: course name,
code, professor, meeting days, start/end time, location, optional office
hours.

Screenshot-based extraction is a materially harder problem than syllabus
text (vision-capable extraction, less forgiving reliability bar) — it needs
to be in `packages/ai`'s capability set from day one (`extractFromImage()`
alongside `extract()`), not bolted on later. This makes the onboarding
phase (original Days 3–4) meaningfully more involved than text-only
extraction would have been; budget for it accordingly.

**Work schedule**: recurring blocks (day, start, end).

**Personal commitments**: gym, swimming, clubs, religious activities,
family, commute, other recurring activities. Each: name, days, time,
duration, recurrence, optional priority.

**Preferences**: earliest/latest time to schedule work, preferred study
times, minimum sleep, preferred session length, max daily study hours,
break preferences.

### C. Syllabus Upload

PDF first, DOCX next.

```
Upload → Extract text → Send relevant text to LLM → Structured JSON
extraction → Validate JSON → [Decode scan pass] → Store in Postgres →
Create calendar/tasks
```

LLM extracts: course info, assignments, projects, exams, quizzes, due
dates, important dates, assignment weights, AI policy, other deadlines.

Never blindly trust extraction — show an **Import Review** screen before
committing:

```
We found 14 academic events.

[✓] Midterm — Oct 15
[✓] Research Paper — Oct 20
[✓] Quiz 3 — Oct 23
[ ] Office Hours — Oct 24

⚠ 1 hidden/suspicious item found in this document — review before import

[Import Selected]
```

Students can edit dates/details, and review what Decode flagged before
anything is committed.

---

## 4. Personalized Schedule Generation

**Hard constraints** (fixed): classes, work, exams, fixed appointments,
manually locked events.

**Soft constraints** (movable): study sessions, gym, swimming, personal
activities, flexible extracurriculars.

**Task variables**: deadline, estimated duration, course, priority, grade
weight, dependencies, completion status.

**User preferences**: preferred study time, sleep schedule, max daily
workload, preferred session length, break requirements.

---

## 5. Scheduling Engine

A dedicated, deterministic module. The LLM never calculates a schedule.

```
For each unscheduled task:
1. Determine deadline.
2. Determine estimated effort.
3. Determine priority.
4. Determine available time before deadline.
5. Find compatible time slots.
6. Rank available slots.
7. Schedule task.
8. Repeat until all tasks are scheduled.
```

```
priority = deadline_urgency + grade_weight + task_priority
         + dependency_weight + overdue_penalty
```

Formula is tunable later. Do not over-engineer optimization for MVP — a
simple greedy heuristic, not a CP-SAT/OR-tools solver. That's a defensible
Phase 3+ upgrade if workload-balancing needs get more sophisticated, not an
MVP concern.

`packages/scheduling-engine`: pure TypeScript, zero LLM calls inside it,
property/golden-file tested in isolation — same testing philosophy as
`packages/content-scanner`.

---

## 6. Workload Balancing

Detect overloaded days; redistribute flexible study tasks into available
time. Priority order when redistributing:

1. Fixed commitments
2. Near deadlines
3. High-impact academic work
4. Long projects
5. Lower-priority tasks
6. Optional activities

---

## 7. Main Dashboard — "Today"

Default landing page after login. Answers: **what should I do right now?**

```
Good morning, George

Today
────────────────────────────
8:00 AM   BIO 201 — Class
10:30 AM  ECON Study — 45 min
12:00 PM  Lunch
1:00 PM   CS 310 — Class
3:00 PM   CS Project — 1h 30m
5:00 PM   Work

AI Recommendation
Your highest priority today is ECON Exam 2. It's in 3 days and you still
have ~3 hours of prep remaining.
[Start Study Session]
```

---

## 8. Calendar

Day / Week / Month views. MVP priority: Week → Day → Month.

Visually distinguish classes, work, academic tasks, exams, personal
activities. Support drag/drop, resize, edit, delete, lock, mark complete.

---

## 9. Task System

```
id, user_id, course_id, title, description, type, status, priority,
due_date, estimated_minutes, grade_weight, scheduled_start, scheduled_end,
is_locked, created_at, updated_at
```

Statuses: `BACKLOG` → `TODO` → `IN_PROGRESS` → `DONE`.

---

## 10. Kanban

Backlog / To Do / In Progress / Done columns, drag/drop between them.
Moving a task updates its status. Completing a task triggers a scheduling
engine recalculation when necessary — this is an internal recalc trigger,
**not** a user-facing notification (see §11 for the actual notification
gap).

---

## 11. Assignment → Task Breakdown, Notifications (new)

"Break this assignment into tasks" generates an editable task list (choose
topic, find sources, thesis, outline, draft, lit review, citations, revise,
proofread, submit) stored as real tasks the student can edit/delete.

**Gap identified during planning, now in scope**: the original roadmap has
no user-facing notification spec at all — only an internal recalc trigger
in Kanban. Given the north-star question is "what should I do right now,"
a morning push notification with today's plan is likely more valuable than
the in-app dashboard alone. This is a small addition once PWA push (§14)
is wired up — not a separate subsystem.

---

## 12. Assignment Intelligence

Upload an assignment prompt/rubric; extract requirements, deliverables,
word/page count, source count, citation format, rubric criteria, deadline,
restrictions.

```
ASSIGNMENT REQUIREMENTS
✓ 5 pages
✓ APA format
✓ Minimum 5 sources
✓ Counterargument required
✓ Conclusion required

Potential issue:
⚠ You currently have 3 sources attached.
```

Never claim to predict grades. Use "requirement coverage," "potential
missing requirement," "rubric coverage" — not "grade estimate."

---

## 13. AI Student Assistant

Persistent, natural-language interface. **Design decision**: a persistent
side panel reachable from every screen, not a separate nav destination
(§25 Product Philosophy already argues against "another productivity app"
— a chat tab you have to navigate to undercuts that; "what should I work on
right now" needs to be answerable from wherever the student already is).

Example commands: "Schedule a gym session tomorrow." / "Move my ECON study
session to Thursday." / "What do I need to finish this week?" / "What's my
busiest day?" / "I can't study Friday. Fix my schedule."

---

## 14. Tool Calling Architecture

```
get_today_schedule() · get_week_schedule() · get_course() · get_task()
create_task() · update_task() · delete_task() · complete_task()
find_available_slots() · create_calendar_event() · update_calendar_event()
delete_calendar_event() · reschedule_task() · get_workload()
get_upcoming_deadlines() · get_course_deadlines() · generate_schedule()
rebalance_schedule()
```

Example flow: user asks for a 1-hour gym session tomorrow → LLM calls
`find_available_slots()` → backend returns ranked options → LLM recommends
one → user confirms → LLM calls `create_calendar_event()` → backend saves.

---

## 15. Context Management

Never send the whole database to the LLM.

```
User message → Intent detection → Relevant tool call →
Backend retrieves only required data → LLM receives small structured
context → Response/action
```

For "what's due this week?": retrieve current date, courses, upcoming
tasks/events only — not completed assignments, full semester history, full
syllabus PDFs, or prior conversations.

---

## 16. AI Cost Optimization

**No LLM for deterministic operations**: adding/moving/deleting tasks,
calendar ops, finding available time, workload calculation, GPA math,
sorting deadlines, basic schedule generation.

**Cheap models** (Haiku-tier): simple intent interpretation, natural-language
commands, basic assistant responses. A chat-driven assistant gets hit far
more often per session than Decode's one-shot paste-and-analyze flow, so
this tiering matters more here than it did there.

**Stronger models** (Sonnet/Opus-tier): syllabus extraction, complex
rubric analysis, non-trivial scheduling explanations. Decode's deep scan
already uses Opus deliberately for a similar reason — same logic applies.

**Cache document processing**: hash uploaded documents; reuse existing
extraction on an exact-hash match instead of reprocessing.

---

## 17. Database Architecture

Postgres via Supabase.

```
users · semesters · courses · course_meetings · work_schedules
personal_commitments · calendar_events · tasks · task_dependencies
assignments · exams · projects · documents · document_extractions
ai_policies · user_preferences · chat_sessions · chat_messages
```

```
User
 └── Semester
      ├── Courses
      │    ├── Assignments
      │    ├── Exams
      │    └── Projects
      ├── Calendar Events
      ├── Tasks
      └── Work/Personal Commitments
```

`user_id` on every user-owned record; Row-Level Security enforces
isolation at the database layer, not just in application code.

**Forward-compatible for monetization (decided free-for-now, §19)**: model
a `plan` field on `users` and basic usage counters (e.g. AI calls this
month) now, even though no gating logic runs yet — costs nothing today,
avoids a schema migration later when gates do get added.

---

## 18. Security / Privacy

Row-level authorization, private file storage, signed URLs (never public
document URLs), input validation, rate limiting, secure auth,
delete-account, delete-document. Never expose one student's data to
another. Don't send unnecessary personal information to the LLM.

The stakes here are categorically higher than Decode's current
stateless/no-accounts model — this is now a multi-tenant SaaS with stored
PII (professor emails, schedules, uploaded documents). Decode's own
posture (no logging/retention beyond the single request) is a reasonable
default to carry forward for AI calls specifically, even though the
product overall now stores plenty of data by necessity.

---

## 19. Decisions Made During Planning

These override anything in the original doc that conflicted.

| Question | Decision | Why |
|---|---|---|
| Native mobile app in MVP? | **No — PWA instead.** Native (React Native/Expo) is a second codebase: separate UI/nav layer, native calendar/notification integration, app store accounts and review cycles (Apple: 1–7+ days per submission). Doesn't fit a 2-week MVP without gutting the scheduling engine. | PWA on the same Next.js codebase gets home-screen install, full-screen UI, and push notifications (iOS Safari since 16.4, Android for years) for near-zero incremental cost. Native moves to **Phase 2, first thing after MVP validates** — not indefinitely deferred, just sequenced after product-market fit is real. |
| Decode migrate into Next.js? | **Yes.** | A client-only SPA can't be crawled as well as an SSR/SSG Next.js route. Meta-tag SEO is a workaround, not the real fix — and it's the same app being built anyway. |
| Monetization | **Free for now; gates later.** | Data model stays forward-compatible (see §17) but no billing/metering work in MVP scope. |
| Go-to-market | **Campus-first private beta for the full app; public SEO funnel for Decode, starting immediately.** | Decode is already live and already optimized — no reason to wait on it. But launching an unproven scheduling engine broadly with zero users risks a bad first impression at scale with no room to iterate quietly. Student products (Fizz, StudySoup, early Facebook) win via dense campus word-of-mouth, not cold broad launches. Beta one campus → expand campus-by-campus → go wide once the engine holds up. |
| ORM | **Drizzle** over Prisma. | Lighter, better edge/serverless cold-start, TS-first — fits a Vercel + Next.js + Postgres stack well. (Prisma's tooling is more turnkey if that ever outweighs the performance case.) |
| Background jobs | **Inngest** over Trigger.dev. | Cleanest native integration with Vercel; either is defensible. |
| Syllabus + screenshot upload priority | **Both baseline MVP, not deferred.** | Confirmed — "baseline for all schedules." Directly implies vision-capable extraction is in `packages/ai` from day one. |

---

## 20. Recommended Stack (updated)

### Monorepo

Turborepo + pnpm workspaces.

```
apps/
  web/                  Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui
                         — marketing site + full app + Decode's public page,
                         PWA-enabled (manifest + service worker)
packages/
  content-scanner/      Decode's detection engine (pure TS, no framework)
  ai/                   AIProvider abstraction: generate() / extract() /
                         extractFromImage() / classify() / toolCall()
  scheduling-engine/    Deterministic scheduler (pure TS, no LLM calls)
  db/                   Drizzle schema + client, shared types
  ui/                   Shared shadcn/ui component wrappers, design tokens
                         (built from Decode's existing color system)
```

### Backend

Next.js Route Handlers initially. Scheduling logic stays isolated in its
own package regardless of transport.

### Database / Auth / Storage

Postgres + Supabase Auth + Supabase Storage.

### AI

`AIProvider` abstraction (`generate` / `extract` / `extractFromImage` /
`classify` / `toolCall`), seeded from Decode's existing
`createAnthropicClient()` + verbatim-quote-verification pattern. Not
hard-coded to one model provider.

### Background jobs

Inngest.

### Mobile

PWA (installable, push-capable) in the MVP. Native (Expo/React Native) as
a Phase 2 fast-follow once the core product validates.

---

## 21. MVP UI Structure

```
/
├── Landing Page (Decode lives here too — public, SEO-optimized)
├── Login / Signup
├── Onboarding
└── App
    ├── Today                 ← default landing page post-login
    ├── Calendar
    ├── Tasks
    ├── Courses
    │   └── Course Detail → Overview / Assignments / Exams / Documents / AI Policy
    └── Projects

AI Assistant: persistent side panel available everywhere, not a nav item.
```

---

## 22. Two-Week Development Plan (updated)

**Days 1–2 — Foundation.** Turborepo/pnpm skeleton, Next.js app,
TypeScript, Tailwind, shadcn/ui, Supabase (DB + Auth), user model, app
shell/nav, PWA manifest + service worker. *Also: migrate Decode into
`packages/content-scanner` + `apps/web` here, since it's foundational
infrastructure, not a separate phase.*
Deliverable: user can sign up, reach the dashboard, and Decode's scanner
works inside the new app.

**Days 3–4 — Student Setup.** Onboarding: semester, classes (syllabus
*and* screenshot upload — both baseline), work schedule, personal
commitments, preferences. `extractFromImage()` capability built here.
Deliverable: student can enter their real-world schedule via text or
screenshot.

**Days 5–6 — Tasks + Calendar.** Tasks, statuses, calendar events,
week/day calendar, Kanban, CRUD, drag/drop.
Deliverable: student can manually manage their semester.

**Days 7–8 — Syllabus AI.** PDF upload, text extraction, LLM extraction,
structured validation, **Decode integrity scan pass**, Import Review
(now showing both extracted events and flagged hidden content), assignment/
exam/date creation.
Deliverable: upload syllabus → review (including integrity findings) →
populate deadlines.

**Days 9–10 — Scheduling Engine.** Availability calculation, hard/soft
constraints, task priority, deadline urgency, effort, grade weight,
schedule generation, basic workload balancing.
Deliverable: system generates a realistic study/work schedule.

**Days 11–12 — AI Assistant.** Persistent side-panel chat, tool calling
(get/create/move/reschedule, find slots, deadlines, workload, rebalance).
Deliverable: student manages their schedule conversationally from
anywhere in the app.

**Day 13 — Assignment Intelligence.** Upload, rubric parsing, requirement
extraction/checklist, assignment → task breakdown.
Deliverable: a complex assignment becomes an actionable project.

**Day 14 — Polish + Testing.** Auth, scheduling conflicts, timezones,
recurring events, deadlines, AI tool calls, document parsing, mobile/PWA
UI, error handling, rate limiting, authorization. Empty/loading/error
states, onboarding polish, basic analytics, **push-notification wiring**
(§11 gap).

---

## 23. MVP Success Criteria

A new student can: create an account · enter classes (text or screenshot)
· enter work/personal commitments · set preferences · upload a syllabus ·
review extracted deadlines (and any Decode-flagged hidden content) ·
import them · see them on the calendar · see generated tasks · receive a
personalized schedule · view today's plan · add/move activities via AI
chat from anywhere in the app · ask what to work on · see workload changes
when tasks move · break an assignment into subtasks · manage tasks via
Kanban · install the app to their home screen and get a morning push with
today's plan.

---

## 24. Explicitly Out of Scope for MVP

Google/Apple/Outlook calendar integration · **native mobile apps (moved to
Phase 2, see §19 — not indefinite)** · university LMS integrations
(Canvas/Blackboard) · professor accounts · social network/messaging/group
collaboration · advanced grade prediction · AI writing/humanization · AI
detection/bypassing · citation verification beyond Decode's existing
scope · writing evidence vault · flashcards · AI tutoring · full
study-material generation · complex optimization algorithms (CP-SAT/OR-tools
— greedy heuristic is enough for MVP) · billing/subscription gating (free
for now, data model stays forward-compatible).

---

## 25. Post-MVP Roadmap

### Phase 2

- **Native mobile app (Expo/React Native)** — promoted here from "someday"
  once MVP validates, per §19.
- Calendar integrations (Google, Outlook, Apple where feasible)
- Better scheduling: automatic rescheduling, adaptive workload balancing,
  study streaks, more sophisticated prioritization
- Academic intelligence: grade tracking, grade-weight-aware
  prioritization, exam readiness, weak-topic detection
- PDF-native hidden-content detection for Decode (white-on-white text,
  zero-size fonts, hidden layers — see §2 scope note)

### Phase 3

- Collaboration: group projects, shared Kanban, contribution tracking,
  team scheduling
- Advanced rubric analysis, requirement coverage, course-specific AI
  policies
- Decode as a shared-document trust check for group work (paste two
  versions of a shared doc, flag suspicious additions) — reuses the
  visibility/segment engine largely as-is

### Phase 4

- University integrations: Canvas, Blackboard, Moodle, university calendar
  systems. "Connect your university account → automatically import
  courses, assignments, deadlines."

---

## 26. Product Philosophy

The product should feel like an **assistant**, not another productivity
application.

| Bad | Good |
|---|---|
| "You have 37 tasks." | "You have 3 important things today. I've already scheduled time for all of them." |
| "Create a task." | "I'll add that to your schedule." |
| "You are overbooked." | "Thursday is overloaded. I moved your 90-minute CS session to Friday afternoon so you can still finish before the deadline." |
| "Calendar." | "Here's how your semester fits together." |

---

## 27. North Star

> **"What should I be doing right now?"**

Answered from deadlines, work, classes, available time, task effort,
academic importance, user preferences, and progress. The long-term goal:
the student stops manually managing their schedule. **The AI manages the
plan. The student manages their life.**
