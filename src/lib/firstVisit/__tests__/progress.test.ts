import { describe, it, expect } from 'vitest';
import { computeProgressFromAnswers } from '../progress';
import { questionsForScope } from '../questions';
import type { LocalAnswer } from '../db';
import type { HubScope } from '../resolveScope';

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

function requiredSlugs(scope: HubScope): string[] {
  return questionsForScope(scope)
    .filter((q) => q.required)
    .map((q) => q.slug);
}

describe('computeProgressFromAnswers', () => {
  it('total reflects required-only count for each scope', () => {
    for (const scope of ['deal', 'location', 'unit_category'] as const) {
      const total = requiredSlugs(scope).length;
      const { done, total: t } = computeProgressFromAnswers(scope, []);
      expect(t).toBe(total);
      expect(done).toBe(0);
    }
  });

  it('returns done=0 with empty answers list', () => {
    const { done } = computeProgressFromAnswers('deal', []);
    expect(done).toBe(0);
  });

  it('ignores answers for unrelated question keys', () => {
    const answers = [
      makeAnswer('not_a_real_question_slug', 'something'),
      makeAnswer('also_fake', 42),
    ];
    const { done } = computeProgressFromAnswers('location', answers);
    expect(done).toBe(0);
  });

  it('counts a single answered required question as done=1', () => {
    const [first] = requiredSlugs('deal');
    const { done } = computeProgressFromAnswers('deal', [
      makeAnswer(first, 'Some Deal'),
    ]);
    expect(done).toBe(1);
  });

  it('counts the skip sentinel as terminal (done increments)', () => {
    const [first] = requiredSlugs('deal');
    const { done } = computeProgressFromAnswers('deal', [
      makeAnswer(first, { __skipped: true, reason: 'Owner absent' }),
    ]);
    expect(done).toBe(1);
  });

  it('does NOT count empty-string answers as done', () => {
    const [first] = requiredSlugs('deal');
    const { done } = computeProgressFromAnswers('deal', [
      makeAnswer(first, ''),
    ]);
    expect(done).toBe(0);
  });

  it('does NOT count optional questions toward progress', () => {
    // Pick an optional question for the location scope and answer it; done must stay 0.
    const optional = questionsForScope('location').find((q) => !q.required);
    expect(optional, 'expected at least one optional location question in config').toBeTruthy();
    const { done } = computeProgressFromAnswers('location', [
      makeAnswer(optional!.slug, 'hello'),
    ]);
    expect(done).toBe(0);
  });

  it('mixes required + optional correctly — only required hits the counter', () => {
    const reqs = requiredSlugs('location');
    const optional = questionsForScope('location').find((q) => !q.required);
    const answers = [
      makeAnswer(reqs[0], 'A'),
      makeAnswer(reqs[1], 'B'),
      makeAnswer(optional!.slug, 'noise'),
    ];
    const { done, total } = computeProgressFromAnswers('location', answers);
    expect(done).toBe(2);
    expect(total).toBe(reqs.length);
  });

  it('treats different scopes independently — location vs unit_category totals differ', () => {
    const loc = computeProgressFromAnswers('location', []);
    const uc = computeProgressFromAnswers('unit_category', []);
    expect(loc.total).toBe(requiredSlugs('location').length);
    expect(uc.total).toBe(requiredSlugs('unit_category').length);
    // From the current config they should not match — guards against a regression
    // that conflates the two scopes.
    expect(loc.total).not.toBe(uc.total);
  });

  it('asking for unit_category scope ignores answers for location-scoped required slugs', () => {
    // location-scoped slug answered, but we ask for unit_category progress
    const locReq = requiredSlugs('location')[0];
    const { done } = computeProgressFromAnswers('unit_category', [
      makeAnswer(locReq, 'ignored'),
    ]);
    expect(done).toBe(0);
  });
});
