import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from './lib/supabase/is-configured';

/**
 * Refreshes the Supabase session cookie on every request — required for
 * @supabase/ssr's server client to see an up-to-date session at all (without
 * this, a session can expire silently and Server Components/Route Handlers
 * keep reading a stale/invalid cookie).
 *
 * Deliberately does NOT redirect unauthenticated visitors away from
 * /app/* or /onboarding — those stay reachable anonymously with mock data,
 * exactly as before (the landing page's "Preview the scheduler" funnel).
 * The only redirect here is the inverse: an already-signed-in visitor
 * doesn't need to see /signup or /signin again.
 */
export async function proxy(request: NextRequest) {
  // Runs on every request, including the free scanner landing page — never
  // let a missing Supabase project take the whole site down.
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = ['/signup', '/signin'].includes(request.nextUrl.pathname);
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/app/today', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and Next's own internals —
     * cheap to run broadly since it's just a cookie refresh + one cheap
     * redirect check, and skipping API/static paths avoids pointless work.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|opengraph-image.png|manifest.webmanifest|api/).*)',
  ],
};
