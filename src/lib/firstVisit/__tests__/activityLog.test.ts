import { describe, it, expect, vi } from 'vitest';
import { logValueSubmitted } from '../activityLog';

describe('logValueSubmitted', () => {
  it('inserts a value_submitted activity row', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) };
    await logValueSubmitted(supabase as never, {
      data_point_id: 'dp-1',
      scope_id: 'sc-1',
      source: 'staff_first_visit',
      value: 'King',
      actor_name: 'a@arbio.com',
    });
    expect(supabase.from).toHaveBeenCalledWith('activity_log');
    expect(insert).toHaveBeenCalledWith({
      data_point_id: 'dp-1',
      scope_id: 'sc-1',
      event_type: 'value_submitted',
      actor_name: 'a@arbio.com',
      detail: { source: 'staff_first_visit', value: 'King' },
    });
  });

  it('never throws on error', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) };
    await expect(
      logValueSubmitted(supabase as never, {
        data_point_id: 'dp-1',
        scope_id: 'sc-1',
        source: 'staff_first_visit',
        value: 'King',
        actor_name: 'a@arbio.com',
      }),
    ).resolves.toBeUndefined();
  });
});
