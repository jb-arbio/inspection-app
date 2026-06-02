import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// `any` for the schema generic so the 'onboarding' override compiles —
// SupabaseClient defaults to the 'public' schema otherwise.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any, any, any>;

let _client: AnyClient | null = null;
let _initializedWith: string | null = null;

export function getHubSupabase(): AnyClient | null {
  const url = process.env.NEXT_PUBLIC_HUB_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  const fingerprint = `${url}::${key}`;
  if (_client && _initializedWith === fingerprint) return _client;
  _client = createClient(url, key, {
    db: { schema: 'onboarding' },
    auth: { persistSession: true, autoRefreshToken: true },
  });
  _initializedWith = fingerprint;
  return _client;
}
