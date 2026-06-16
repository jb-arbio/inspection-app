import { describe, it, expect } from 'vitest';
import { computeProgressFromAnswers, requiredVisible } from '../progress';
import { questionsForScope, isScopeLevelRequired, isVisible } from '../questions';
import type { FirstVisitQuestion } from '../questions';
import type { LocalAnswer } from '../db';
import type { HubScope } from '../resolveScope';

// Sane FirstVisitQuestion defaults; spread a partial to override only the
// fields a given test cares about.
function mkQ(overrides: Partial<FirstVisitQuestion> = {}): FirstVisitQuestion {
  return {
    slug: 'fv_q',
    label: 'Q',
    description: null,
    scope: 'location',
    mode: 'data',
    type: 'text',
    options: [],
    required: false,
    repeater: false,
    pms_target: null,
    status: 'existing',
    verdict: null,
    notes: null,
    phase_id: '1',
    phase_label: 'Phase 1',
    ...overrides,
  };
}

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
  // Scope-level required = required AND not a repeater member AND currently
  // visible (mirrors the production denominator in computeProgressFromAnswers,
  // which runs questions through requiredVisible). With no answers supplied,
  // questions gated by an `equals`-style visible_when rule (e.g. luggage-storage
  // details, gated on the boolean fv_storage_onsite_check) are hidden and so do
  // not count — same as the real ring. We pass an empty answer map to match the
  // empty-answers callers below.
  const noAnswers = new Map<string, unknown>();
  return questionsForScope(scope)
    .filter((q) => isScopeLevelRequired(q) && isVisible(q.visible_when, noAnswers))
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

  it('does NOT count repeater-group (group_id) members toward scope-level required', () => {
    // Findings are a block-repeater: 5 of their fields are required:true but
    // carry group_id:'finding'. A scope with zero findings blocks is valid, so
    // these must NOT inflate the scope-level required denominator. The
    // unit_category scope includes the findings repeater; none of its required
    // slugs should be a group_id question.
    const uc = questionsForScope('unit_category');
    const repeaterRequired = uc.filter((q) => q.required && q.group_id);
    // Sanity: the config actually contains required repeater members, otherwise
    // this test proves nothing.
    expect(repeaterRequired.length).toBeGreaterThan(0);

    const scopeRequired = requiredSlugs('unit_category');
    for (const q of repeaterRequired) {
      expect(
        scopeRequired.includes(q.slug),
        `${q.slug} is a repeater member and must not be a scope-level required question`,
      ).toBe(false);
    }

    // And the total denominator must exclude every repeater member. With empty
    // answers it must also exclude questions hidden by an unsatisfied
    // visible_when (e.g. the furnishing-gated measurements gate on
    // fv_furnishing_by_arbio:equals true, which is unsatisfied when unanswered).
    const { total } = computeProgressFromAnswers('unit_category', []);
    const nonRepeaterRequiredVisible = uc.filter(
      (q) => q.required && !q.group_id && isVisible(q.visible_when, new Map()),
    ).length;
    expect(total).toBe(nonRepeaterRequiredVisible);
  });

  it('hidden (visible_when unsatisfied) required questions drop out of total', () => {
    const qs = [
      mkQ({ slug: 'fv_parking_available', type: 'select', required: true }),
      mkQ({ slug: 'fv_parking_spots', type: 'number', required: true,
            visible_when: { question: 'fv_parking_available', equals: 'Yes' } }),
    ];
    expect(requiredVisible(qs, new Map([['fv_parking_available', 'No']])).map((q) => q.slug))
      .toEqual(['fv_parking_available']);
    expect(requiredVisible(qs, new Map([['fv_parking_available', 'Yes']])).length).toBe(2);
  });
});

describe('computeProgressFromAnswers phase filter', () => {
  it('filtered deal progress for phases 1 and 11 sums to the unfiltered total', () => {
    const whole = computeProgressFromAnswers('deal', []);
    const meta = computeProgressFromAnswers('deal', [], ['1']);
    const evaluation = computeProgressFromAnswers('deal', [], ['11']);
    expect(meta.total + evaluation.total).toBe(whole.total);
    expect(meta.total).toBeGreaterThan(0);
    expect(evaluation.total).toBeGreaterThan(0);
  });

  it('an answer only counts toward the card that contains its question', () => {
    const meta = computeProgressFromAnswers(
      'deal',
      [makeAnswer('fv_readiness_health_score', '7')],
      ['1'],
    );
    const evaluation = computeProgressFromAnswers(
      'deal',
      [makeAnswer('fv_readiness_health_score', '7')],
      ['11'],
    );
    expect(meta.done).toBe(0);
    expect(evaluation.done).toBe(1);
  });
});
