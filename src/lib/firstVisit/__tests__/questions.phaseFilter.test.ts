import { describe, it, expect } from 'vitest';
import { phasesForScope } from '../questions';

describe('phasesForScope phase filter', () => {
  it('returns all deal phases when no filter is given (regression)', () => {
    const all = phasesForScope('deal');
    expect(all.map((p) => p.id)).toEqual(['1', '11']);
  });

  it("['1'] returns only visit metadata", () => {
    const filtered = phasesForScope('deal', ['1']);
    expect(filtered.map((p) => p.id)).toEqual(['1']);
    const slugs = filtered.flatMap((p) => p.questions.map((q) => q.slug));
    expect(slugs).toContain('fv_visit_date');
    expect(slugs).not.toContain('fv_readiness_health_score');
  });

  it("['11'] returns only the final assessment", () => {
    const filtered = phasesForScope('deal', ['11']);
    expect(filtered.map((p) => p.id)).toEqual(['11']);
    const slugs = filtered.flatMap((p) => p.questions.map((q) => q.slug));
    expect(slugs).toContain('fv_readiness_health_score');
    expect(slugs).not.toContain('fv_visit_date');
  });

  it('the two filtered sets partition the unfiltered set exactly', () => {
    const all = phasesForScope('deal').flatMap((p) => p.questions.map((q) => q.slug));
    const a = phasesForScope('deal', ['1']).flatMap((p) => p.questions.map((q) => q.slug));
    const b = phasesForScope('deal', ['11']).flatMap((p) => p.questions.map((q) => q.slug));
    expect([...a, ...b].sort()).toEqual([...all].sort());
  });

  it('does not affect other scopes when no filter is given', () => {
    expect(phasesForScope('location').length).toBeGreaterThan(0);
    expect(phasesForScope('unit_category').length).toBeGreaterThan(0);
  });
});
