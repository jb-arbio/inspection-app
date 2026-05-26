import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firstVisit/hubSupabase', () => ({ getHubSupabase: vi.fn() }));
vi.mock('@/lib/firstVisit/activityLog', () => ({ logValueSubmitted: vi.fn() }));

import { POST } from '../route';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { logValueSubmitted } from '@/lib/firstVisit/activityLog';

describe('POST /api/first-visit/submit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes data_point_values for mapped answers and logs activity', async () => {
    const inspectionRow = { id: 'i1', deal_id: 'd1', unit_category_id: 'u1' };
    const answerRows = [
      { question_key: 'beds', value: 2, data_point_slug: 'beds-count' },
      { question_key: 'wifi', value: 'pw', data_point_slug: null },
    ];
    const dpRow = { id: 'dp1', slug: 'beds-count', level: 'unit' };

    const from = vi.fn((table: string) => {
      if (table === 'first_visit_inspections') {
        return {
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
          select: () => ({ eq: () => ({ single: () => ({ data: inspectionRow, error: null }) }) }),
        };
      }
      if (table === 'first_visit_answers') {
        return { select: () => ({ eq: () => ({ data: answerRows, error: null }) }) };
      }
      if (table === 'data_points') {
        return { select: () => ({ in: () => ({ data: [dpRow], error: null }) }) };
      }
      if (table === 'data_point_values') {
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });
    (getHubSupabase as never as ReturnType<typeof vi.fn>).mockReturnValue({
      from,
      auth: { getUser: () => ({ data: { user: { email: 'a@arbio.com' } } }) },
    });

    const req = new Request('http://x/api/first-visit/submit', {
      method: 'POST',
      body: JSON.stringify({ inspection_id: 'i1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(logValueSubmitted).toHaveBeenCalledOnce();
  });
});
