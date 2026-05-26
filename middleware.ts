import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isAllowedEmail } from '@/lib/firstVisit/auth';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Allow auth callback and public assets through.
  if (
    url.pathname.startsWith('/auth/callback') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_HUB_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => req.cookies.get(n)?.value,
        set: (n, v, o) => res.cookies.set({ name: n, value: v, ...o }),
        remove: (n, o) => res.cookies.set({ name: n, value: '', ...o }),
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
