import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * For use in Server Components, Route Handlers, and Server Actions only.
 * Reads/writes the session cookie via next/headers — a Server Component
 * can't itself write a cookie (Next.js will throw if this tries), which is
 * fine there since proxy.ts already refreshes the session on every
 * request; only Route Handlers/Server Actions actually need the write path.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — safe to ignore, see doc comment above.
          }
        },
      },
    },
  );
}
