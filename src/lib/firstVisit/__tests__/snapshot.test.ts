import { describe, it, expect } from 'vitest';
import { lookupHubValue } from '../snapshot';

const snapshot = {
  deal: { id: 'd' },
  locations: [{ id: 'l' }],
  units: [{ id: 'u' }],
  values: [
    { data_point_id: 'dp1', scope_id: 'd', source: 'owner', value: 'X', submitted_at: '2026-01-01' },
    { data_point_id: 'dp1', scope_id: 'd', source: 'prefill_hubspot', value: 'Y', submitted_at: '2026-01-02' },
    { data_point_id: 'dp2', scope_id: 'u', source: 'staff_first_visit', value: 'Z', submitted_at: '2026-01-03' },
  ],
  points: [
    { id: 'dp1', slug: 'wifi', level: 'deal' },
    { id: 'dp2', slug: 'beds', level: 'unit' },
  ],
};

const ctx = { deal_id: 'd', location_id: 'l', unit_category_id: 'u' };

describe('lookupHubValue', () => {
  it('returns highest-priority non-self value at the right scope', () => {
    expect(lookupHubValue(snapshot as never, ctx, 'wifi')).toBe('X');
  });

  it('excludes staff_first_visit so pre-fill never shows our own prior write', () => {
    expect(lookupHubValue(snapshot as never, ctx, 'beds')).toBeUndefined();
  });

  it('returns undefined when no data point matches', () => {
    expect(lookupHubValue(snapshot as never, ctx, 'unknown')).toBeUndefined();
  });
});
