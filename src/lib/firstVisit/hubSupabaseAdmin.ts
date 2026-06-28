import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// SERVER-ONLY admin client. Bypasses RLS via the service role key.
// Never expose this key to the browser — keep the env var unprefixed
// (no NEXT_PUBLIC_) and never call this function from client code.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any, any, any>;

let _admin: AnyClient | null = null;
let _initializedWith: string | null = null;

export function getHubAdminSupabase(): AnyClient | null {
  const url = process.env.NEXT_PUBLIC_HUB_SUPABASE_URL ?? '';
  const key = process.env.HUB_SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  const fingerprint = `${url}::${key}`;
  if (_admin && _initializedWith === fingerprint) return _admin;
  _admin = createClient(url, key, {
    db: { schema: 'onboarding' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  _initializedWith = fingerprint;
  return _admin;
}

// Pick the right hub client for a server route:
//  - In dev-skip-auth mode (NEXT_PUBLIC_DEV_SKIP_AUTH=1) with a service
//    role configured, return the admin client so RLS doesn't strip data.
//  - Otherwise fall back to the caller-supplied session client.
export function getHubServerClient(sessionClient: AnyClient | null): AnyClient | null {
  if (process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === '1') {
    const admin = getHubAdminSupabase();
    if (admin) return admin;
  }
  return sessionClient;
}

// Build a COOKIE-AWARE hub client bound to the current request's session, the
// same way auth/callback does. This is what actually authenticates a route: the
// browser holds the hub session in cookies (set at login via @supabase/ssr), so
// the server must read those cookies to know who the inspector is. The plain
// getHubSupabase() client can't — it has no request cookies — which is why every
// write route was returning 401. Imports are dynamic so this shared module stays
// import-safe in unit tests (no Next request scope); on failure it returns null
// and callers fall back to the passed client (tests) or dev-skip auth.
export async function getHubRequestClient(): Promise<AnyClient | null> {
  const url = process.env.NEXT_PUBLIC_HUB_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  try {
    const { cookies } = await import('next/headers');
    const { createServerClient } = await import('@supabase/ssr');
    const cookieStore = await cookies();
    return createServerClient(url, key, {
      db: { schema: 'onboarding' },
      cookies: {
        getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options }),
            );
          } catch {
            // GET handlers can't always set cookies; reading the session is enough.
          }
        },
      },
    });
  } catch {
    return null;
  }
}

// Resolve the request context for a write route:
//  - Authenticates via the request's session cookie (getHubRequestClient).
//  - In dev-skip-auth mode, falls back to the admin client + a dev email.
//  - The `sessionClient` arg is a fallback (used by unit tests, which have no
//    request scope so the cookie client is null).
//  - Returns null if no identity can be established (caller -> 401).
export async function getHubRouteContext(
  sessionClient: AnyClient | null,
): Promise<{ supabase: AnyClient; email: string } | null> {
  const session = (await getHubRequestClient()) ?? sessionClient;
  const supabase = getHubServerClient(session);
  if (!supabase) return null;

  let email: string | undefined;
  if (session) {
    const { data } = await session.auth.getUser();
    email = data.user?.email ?? undefined;
  }
  if (!email && process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === '1') {
    email = process.env.DEV_INSPECTOR_EMAIL ?? 'dev@arbio.com';
  }
  if (!email) return null;
  return { supabase, email };
}
