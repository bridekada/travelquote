import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware: Session Refresh
 * 
 * Refreshes the Supabase auth session on every request to protected routes.
 * The actual route protection is handled client-side via the useAuth hook,
 * because the app uses createClient (localStorage-based tokens).
 * 
 * This middleware ensures cookies stay in sync when the user has an active
 * cookie-based session (e.g. via SSR auth callback).
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if cookies exist — keeps tokens alive
  // This does NOT block access; client-side useAuth handles that
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/builder/:path*',
    '/admin/:path*',
    '/m/:path*',
  ],
};
