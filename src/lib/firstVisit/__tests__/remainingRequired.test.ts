import { describe, it, expect } from 'vitest';
import {
  remainingRequiredForTarget,
  type RemainingTargetInput,
} from '../progress';
import { questionsForScope } from '../questions';
import type { LocalAnswer } from '../db';

function makeAnswer(
  question_key: string,
  value: unknown,
  overrides: Partial<LocalAnswer> = {},
): LocalAnswer {
  return {
    id: `a-${question_key}`,
    inspection_id: 'i1',
    target_id: 't1',
    scope: 'location',
    question_key,
    area_key: 'default',
    value,
    was_prefilled: false,
    was_accepted_as_is: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Visible required slugs for a scope with no answers — mirrors the production
// denominator (hidden/visible_when-gated questions excluded).
function visibleRequiredSlugs(scope: 'deal' | 'location' | 'unit_category'): string[] {
  const target: RemainingTargetInput = {
    label: 'x',
    scope,
    answers: [],
  };
  return remainingRequiredForTarget(target).map((q) => q.slug);
}

describe('remainingRequiredForTarget', () => {
  it('with no answers, lists every visible scope-level required question', () => {
    const reqs = questionsForScope('location').filter(
      (q) => q.required && !q.group_id && !q.visible_when,
    );
    const remaining = remainingRequiredForTarget({
      label: 'Property A',
      scope: 'location',
      answers: [],
    });
    // Every unconditionally-required question is in the remaining list.
    for (const q of reqs) {
      expect(remaining.map((r) => r.slug)).toContain(q.slug);
    }
  });

  it('drops a required question once it is answered', () => {
    const slugs = visibleRequiredSlugs('location');
    const target = slugs[0];
    const before = remainingRequiredForTarget({
      label: 'Property A',
      scope: 'location',
      answers: [],
    });
    const after = remainingRequiredForTarget({
      label: 'Property A',
      scope: 'location',
      answers: [makeAnswer(target, 'Answered')],
    });
    expect(before.map((q) => q.slug)).toContain(target);
    expect(after.map((q) => q.slug)).not.toContain(target);
    expect(after.length).toBe(before.length - 1);
  });

  it('empty-string answers do NOT clear a required question', () => {
    const target = visibleRequiredSlugs('deal')[0];
    const remaining = remainingRequiredForTarget({
      label: 'Visit',
      scope: 'deal',
      answers: [makeAnswer(target, '')],
    });
    expect(remaining.map((q) => q.slug)).toContain(target);
  });

  it('returns an empty list when every visible required question is answered', () => {
    const slugs = visibleRequiredSlugs('deal');
    const answers = slugs.map((s) => makeAnswer(s, 'done'));
    const remaining = remainingRequiredForTarget({
      label: 'Visit',
      scope: 'deal',
      answers,
    });
    expect(remaining).toEqual([]);
  });

  it('respects a phaseIds filter', () => {
    const all = remainingRequiredForTarget({
      label: 'Visit',
      scope: 'deal',
      answers: [],
    });
    const phase1 = remainingRequiredForTarget({
      label: 'Visit',
      scope: 'deal',
      answers: [],
      phaseIds: ['1'],
    });
    expect(phase1.length).toBeGreaterThan(0);
    expect(phase1.length).toBeLessThan(all.length);
  });
});
