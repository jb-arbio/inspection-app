import { describe, it, expect } from 'vitest';
import { getHubSupabase } from '../hubSupabase';

describe('getHubSupabase', () => {
  it('returns null when env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_HUB_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY;
    expect(getHubSupabase()).toBeNull();
  });

  it('returns a client when env vars are set', () => {
    process.env.NEXT_PUBLIC_HUB_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY = 'anon-key';
    const client = getHubSupabase();
    expect(client).not.toBeNull();
    expect(typeof client?.from).toBe('function');
  });
});
