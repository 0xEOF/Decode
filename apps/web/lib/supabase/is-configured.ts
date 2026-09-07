/**
 * Whether real Supabase credentials are set. Auth/DB features degrade to
 * "everyone is anonymous" when they aren't, rather than crashing — this
 * matters not just for local dev before a Supabase project exists, but
 * because proxy.ts runs on every request: a hard throw here would 500 the
 * entire site, including the free scanner landing page that has nothing to
 * do with auth. See README.md "Database & Auth setup".
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
