import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isAllowedEmail } from '@/lib/firstVisit/auth';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Dev-only bypass for local UI preview without OAuth wiring.
  if (process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === '1') {
    return NextResponse.next();
  }

  // Allow auth callback and public assets through.
  if (
    url.pathname.startsWith('/auth/callback') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Bail if hub Supabase env isn't configured (e.g. local preview without secrets).
  if (
    !process.env.NEXT_PUBLIC_HUB_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY
  ) {
    if (url.pathname === '/login') return NextResponse.next();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_HUB_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set({ name, value, ...options }),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/((?!login|auth/callback|_next/static|_next/image|favicon.ico).*)'],
};
