import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firstVisit/hubSupabase', () => ({ getHubSupabase: vi.fn() }));

import { POST } from '../route';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';

describe('POST /api/first-visit/answers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts answer keyed by (inspection_id, question_key, area_key)', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    (getHubSupabase as never as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert }),
      auth: { getUser: () => ({ data: { user: { email: 'a@arbio.com' } } }) },
    });

    const req = new Request('http://x/api/first-visit/answers', {
      method: 'POST',
      body: JSON.stringify({
        id: 'ans1', inspection_id: 'i1', question_key: 'wifi',
        area_key: 'access', value: 'pw',
        was_prefilled: false, was_accepted_as_is: false,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalled();
  });
});
