import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/is-configured';

export const runtime = 'nodejs';

/**
 * Both signup confirmation and password-reset emails point here — Supabase's
 * PKCE flow lands a `?code=` on whatever `emailRedirectTo`/`redirectTo` was
 * set to, and this exchanges it for a real session before sending the user
 * on to `next` (defaults to the app; the reset-password flow overrides it
 * to /update-password).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app/today';

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth-callback-failed`);
}
