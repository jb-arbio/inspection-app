import { describe, expect, it } from 'vitest';
import { validateSurveyContent } from '../validateSurveyContent';
import type {
  ContentConfig,
  ContentQuestion,
  StructureOverlay,
} from '../surveyConfig';

// A minimal, fully valid content question. Tests clone + tweak this.
function makeQuestion(overrides: Partial<ContentQuestion> = {}): ContentQuestion {
  return {
    slug: 'fv_test_field',
    label: 'Test field',
    description: null,
    scope: 'unit_category',
    type: 'text',
    options: [],
    required: false,
    phase_id: 'phase_1',
    phase_label: 'Phase 1',
    ...overrides,
  };
}

function makeConfig(questions: ContentQuestion[]): ContentConfig {
  return {
    phases: [
      {
        id: questions[0]?.phase_id ?? 'phase_1',
        label: questions[0]?.phase_label ?? 'Phase 1',
        questions,
      },
    ],
  };
}

describe('validateSurveyContent', () => {
  it('returns ok:true with no errors for a fully valid config', () => {
    const config = makeConfig([
      makeQuestion({ slug: 'fv_a', type: 'text' }),
      makeQuestion({
        slug: 'fv_b',
        type: 'select',
        options: ['yes', 'no'],
      }),
    ]);
    const overlay: StructureOverlay = {
      fv_a: { mode: 'data' },
    };

    expect(validateSurveyContent(config, overlay)).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('flags a duplicate slug across phases', () => {
    const config: ContentConfig = {
      phases: [
        { id: 'p1', label: 'P1', questions: [makeQuestion({ slug: 'dup', phase_id: 'p1', phase_label: 'P1' })] },
        { id: 'p2', label: 'P2', questions: [makeQuestion({ slug: 'dup', phase_id: 'p2', phase_label: 'P2' })] },
      ],
    };
    const res = validateSurveyContent(config, {});
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('duplicate') && e.includes('dup'))).toBe(true);
  });

  it('flags a select question with empty options', () => {
    const config = makeConfig([
      makeQuestion({ slug: 'fv_sel', type: 'select', options: [] }),
    ]);
    const res = validateSurveyContent(config, {});
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('fv_sel') && e.includes('options'))).toBe(true);
  });

  it('flags a multi_select question with empty options', () => {
    const config = makeConfig([
      makeQuestion({ slug: 'fv_multi', type: 'text', multi_select: true, options: [] }),
    ]);
    const res = validateSurveyContent(config, {});
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('fv_multi') && e.includes('options'))).toBe(true);
  });

  it('flags an unknown field type', () => {
    const config = makeConfig([
      makeQuestion({ slug: 'fv_bad_type', type: 'dropdown' as unknown as ContentQuestion['type'] }),
    ]);
    const res = validateSurveyContent(config, {});
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('fv_bad_type'))).toBe(true);
  });

  it('flags an unknown scope', () => {
    const config = makeConfig([
      makeQuestion({ slug: 'fv_bad_scope', scope: 'building' as unknown as ContentQuestion['scope'] }),
    ]);
    const res = validateSurveyContent(config, {});
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('fv_bad_scope'))).toBe(true);
  });

  it('flags a malformed slug', () => {
    const config = makeConfig([
      makeQuestion({ slug: 'Bad Slug!' }),
    ]);
    const res = validateSurveyContent(config, {});
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.toLowerCase().includes('slug'))).toBe(true);
  });

  it('flags an empty label', () => {
    const config = makeConfig([
      makeQuestion({ slug: 'fv_no_label', label: '' }),
    ]);
    const res = validateSurveyContent(config, {});
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('fv_no_label'))).toBe(true);
  });

  it('flags an overlay referencing a missing slug', () => {
    const config = makeConfig([makeQuestion({ slug: 'fv_real' })]);
    const overlay: StructureOverlay = {
      fv_ghost: { mode: 'data' },
    };
    const res = validateSurveyContent(config, overlay);
    expect(res.ok).toBe(false);
    expect(
      res.errors.some((e) => e.includes('unknown slug') && e.includes('fv_ghost')),
    ).toBe(true);
  });

  it('flags a lone repeater member (group_id with no sibling)', () => {
    const config = makeConfig([
      makeQuestion({ slug: 'fv_lonely' }),
      makeQuestion({ slug: 'fv_other' }),
    ]);
    const overlay: StructureOverlay = {
      fv_lonely: { group_id: 'g_alone' },
    };
    const res = validateSurveyContent(config, overlay);
    expect(res.ok).toBe(false);
    expect(
      res.errors.some((e) => e.includes('g_alone') && e.includes('fv_lonely')),
    ).toBe(true);
  });

  it('accepts a repeater group with two or more members', () => {
    const config = makeConfig([
      makeQuestion({ slug: 'fv_g1' }),
      makeQuestion({ slug: 'fv_g2' }),
    ]);
    const overlay: StructureOverlay = {
      fv_g1: { group_id: 'g_pair' },
      fv_g2: { group_id: 'g_pair' },
    };
    expect(validateSurveyContent(config, overlay)).toEqual({
      ok: true,
      errors: [],
    });
  });
});
