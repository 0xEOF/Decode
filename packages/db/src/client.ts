import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * A direct Postgres connection (Supabase's connection string, `DATABASE_URL`)
 * — not the Supabase JS client. Every query in this app filters by the
 * authenticated user's id explicitly (see apps/web/lib/db-scope.ts); Postgres
 * RLS policies (migrations/..._rls.sql) are defense-in-depth, not the only
 * thing standing between users' data, per ROADMAP.md §18.
 *
 * Lazily created so importing this module never throws when DATABASE_URL
 * isn't set yet (e.g. typechecking/building without a Supabase project) —
 * it only throws once something actually tries to query.
 */
let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Create a Supabase project and set DATABASE_URL to its connection string — see README.md "Database & Auth setup".',
    );
  }

  const client = postgres(connectionString, { prepare: false }); // required for Supabase's pooled connection (pgbouncer transaction mode)
  cached = drizzle(client, { schema });
  return cached;
}

export * from './schema';
