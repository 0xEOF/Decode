import { createClient } from './supabase/server';
import { isSupabaseConfigured } from './supabase/is-configured';

/**
 * Every authenticated Route Handler (and app/app/layout.tsx, for the app
 * shell's sign-in/out control) calls this first. Returns the session user,
 * or null — callers respond 401 (or render as anonymous) themselves, so
 * each caller controls its own behavior rather than this throwing.
 *
 * Returns null without touching Supabase at all when it isn't configured
 * (no project set up yet) — constructing a client with an empty URL/key
 * throws, and this runs on every /app/* page load, so a misconfigured (or
 * not-yet-configured) Supabase project must never break the app.
 *
 * This is the app-layer half of ROADMAP.md §18's "enforces isolation at the
 * database layer, not just in application code": every Drizzle query below
 * also filters `where user_id = ...` explicitly using this id, with Postgres
 * RLS (migrations/0001_auth_rls.sql) as defense-in-depth, never the only check.
 */
export async function getAuthedUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
