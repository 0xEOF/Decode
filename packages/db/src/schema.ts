/**
 * Drizzle schema for the AI Student Success Assistant (ROADMAP.md §17).
 *
 * Deliberately scoped to what the app actually models today — `Course`,
 * `FixedEvent`, `AppTask`, `SchedulingPreferences` (see apps/web/lib/types.ts
 * and packages/scheduling-engine/src/types.ts) — not the full aspirational
 * §17 table list. There's no `documents`/`chat_sessions`/`ai_policies`/
 * `assignments`/`exams`/`projects` tables yet because nothing in the app
 * produces or consumes that shape of data yet; add them when the feature
 * that needs them gets built, not before.
 *
 * `auth.users` is managed by Supabase Auth, not this schema — `profiles.id`
 * is a foreign key into it (see migrations/0000_.../trigger.sql for the
 * signup trigger that creates the matching profiles row).
 *
 * Scheduled blocks are deliberately NOT persisted here — see
 * apps/web/lib/schedule.ts's computeSchedule(): the schedule is recomputed
 * fresh from tasks + fixed_events + preferences on every read, exactly like
 * the current mock-data-backed app already does. Storing a computed,
 * quickly-stale result would just be a second source of truth to keep in
 * sync for no current benefit.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const planEnum = pgEnum('plan', ['free', 'paid']);
export const fixedEventTypeEnum = pgEnum('fixed_event_type', ['class', 'work', 'exam', 'appointment', 'locked']);
export const taskTypeEnum = pgEnum('task_type', ['assignment', 'exam', 'quiz', 'project', 'reading']);
export const taskStatusEnum = pgEnum('task_status', ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE']);

/** One row per Supabase-authenticated user. Created by the handle_new_user() trigger on signup. */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // references auth.users(id) — enforced in the SQL migration, not expressible in Drizzle's pg-core against a schema it doesn't manage
  email: text('email').notNull(),
  studentName: text('student_name').notNull(),
  school: text('school'),
  semesterLabel: text('semester_label'),
  timezone: text('timezone').notNull().default('UTC'),
  onboarded: boolean('onboarded').notNull().default(false),
  // Forward-compatible for monetization (ROADMAP.md §17/§19) — no gating logic
  // reads these yet, but adding them now avoids a migration later.
  plan: planEnum('plan').notNull().default('free'),
  aiCallsThisMonth: integer('ai_calls_this_month').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  professor: text('professor'),
  /** Keys into the `--class-*` CSS custom properties — see apps/web/app/app/app.css. */
  color: text('color').notNull(),
  location: text('location'),
  /** 0 = Monday ... 6 = Sunday, matching mock-data.ts's dayOffset convention. */
  meetingDays: integer('meeting_days').array().notNull().default(sql`'{}'::integer[]`),
  startTime: text('start_time').notNull(), // "HH:MM", matches Course.startTime
  endTime: text('end_time').notNull(),
  officeHours: text('office_hours'),
  aiPolicy: text('ai_policy'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Concrete, per-instance events — not a recurring rule. Recurring
 * commitments (classes, work shifts, personal activities) are materialized
 * into individual rows once, at onboarding time, the same way
 * mock-data.ts's materializeRecurringEvents() already does client-side.
 * A drag-move (moveFixedEvent) just updates one row's start/end.
 *
 * Known limitation, deliberately deferred: nothing re-materializes classes
 * forward once the initially-generated window (HORIZON_DAYS) runs out — a
 * real recurring-events system (RRULE-style, with per-instance overrides)
 * is Phase 2 work, not blocking this pass. The current mock-data-only app
 * has exactly the same limitation today.
 */
export const fixedEvents = pgTable('fixed_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: fixedEventTypeEnum('type').notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  type: taskTypeEnum('type').notNull(),
  status: taskStatusEnum('status').notNull().default('BACKLOG'),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  estimatedMinutes: integer('estimated_minutes').notNull(),
  /** 1 (lowest) to 5 (highest) — matches SchedulableTask.priority. */
  priority: smallint('priority').notNull(),
  /** 0-100: how much this counts toward the course grade. Null if ungraded. */
  gradeWeight: smallint('grade_weight'),
  /** IDs of other tasks (in this same table) that must finish first. */
  dependsOn: uuid('depends_on').array().notNull().default(sql`'{}'::uuid[]`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per user. Stores the abstract preference (earliest/latest study
 * time, session/break sizing) — NOT the materialized `availableWindows`
 * SchedulingPreferences needs at runtime, which is a rolling window derived
 * fresh from these via apps/web/lib/mock-data.ts's buildAvailableWindows().
 */
export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  earliestTime: text('earliest_time').notNull(), // "HH:MM"
  latestTime: text('latest_time').notNull(),
  minSessionMinutes: integer('min_session_minutes').notNull(),
  preferredSessionMinutes: integer('preferred_session_minutes').notNull(),
  breakMinutes: integer('break_minutes').notNull(),
  maxDailyMinutes: integer('max_daily_minutes').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
