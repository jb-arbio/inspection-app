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

// Resolve the request context for a write route:
//  - Returns the right client (admin in dev-skip-auth, session otherwise)
//  - Returns the inspector email from the session, or a dev fallback
//    when dev-skip-auth is on.
//  - Returns null if neither auth path is satisfied (caller -> 401).
export async function getHubRouteContext(
  sessionClient: AnyClient | null,
): Promise<{ supabase: AnyClient; email: string } | null> {
  const supabase = getHubServerClient(sessionClient);
  if (!supabase) return null;

  let email: string | undefined;
  if (sessionClient) {
    const { data } = await sessionClient.auth.getUser();
    email = data.user?.email ?? undefined;
  }
  if (!email && process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === '1') {
    email = process.env.DEV_INSPECTOR_EMAIL ?? 'dev@arbio.com';
  }
  if (!email) return null;
  return { supabase, email };
}
