import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../hubSupabase', () => ({ getHubSupabase: vi.fn() }));
vi.mock('../hubSupabaseAdmin', () => ({ getHubServerClient: vi.fn() }));

import { listFirstVisitDeals } from '../deals';
import { getHubServerClient } from '../hubSupabaseAdmin';

const asMock = (fn: unknown) => fn as never as ReturnType<typeof vi.fn>;

// Minimal stub for the supabase query chain the helper uses:
// .from('deals').select(...).order(...).limit(...) -> { data, error }
function clientReturning(result: { data: unknown; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve(result),
        }),
      }),
    }),
  };
}

beforeEach(() => vi.clearAllMocks());

describe('listFirstVisitDeals', () => {
  it('returns [] when the hub client is null (not configured)', async () => {
    asMock(getHubServerClient).mockReturnValue(null);
    expect(await listFirstVisitDeals()).toEqual([]);
  });

  it('maps rows to {id, name}, dropping extra columns', async () => {
    asMock(getHubServerClient).mockReturnValue(
      clientReturning({
        data: [
          { id: 'd1', name: 'Berlin Mitte', created_at: '2026-01-01' },
          { id: 'd2', name: 'Hamburg', created_at: '2026-01-02' },
        ],
        error: null,
      }),
    );
    expect(await listFirstVisitDeals()).toEqual([
      { id: 'd1', name: 'Berlin Mitte' },
      { id: 'd2', name: 'Hamburg' },
    ]);
  });

  it('returns [] on a query error (never throws)', async () => {
    asMock(getHubServerClient).mockReturnValue(
      clientReturning({ data: null, error: { message: 'boom' } }),
    );
    expect(await listFirstVisitDeals()).toEqual([]);
  });

  it('returns [] if the query itself throws (never propagates)', async () => {
    asMock(getHubServerClient).mockReturnValue({
      from: () => {
        throw new Error('kaboom');
      },
    });
    expect(await listFirstVisitDeals()).toEqual([]);
  });
});
