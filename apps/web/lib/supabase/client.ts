import { createBrowserClient } from '@supabase/ssr';

/** For use in Client Components only. Each call returns a fresh client — cheap, no need to memoize. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
