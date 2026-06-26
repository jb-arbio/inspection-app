import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadActiveSurveyConfig } from '../loadSurveyConfig';
import { localDb } from '../db';
import { PHASES } from '../questions';
import type {
  ContentConfig,
  ContentQuestion,
  StructureOverlay,
} from '../surveyConfig';

function makeQuestion(
  overrides: Partial<ContentQuestion> = {},
): ContentQuestion {
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

// A small, self-contained overlay we inject into the loader so the test does not
// depend on the production QUESTION_STRUCTURE (which contains an overlay key with
// an uppercase slug that validateSurveyContent's slug regex rejects — see report).
// Empty overlay = no structural patches, which validateSurveyContent accepts.
const TEST_OVERLAY: StructureOverlay = {};

// A small, fully valid content config carrying a recognisable marker slug.
function validContent(marker = 'fv_marker_field'): ContentConfig {
  return {
    phases: [
      {
        id: 'phase_1',
        label: 'Phase 1',
        questions: [
          makeQuestion({ slug: 'fv_a' }),
          makeQuestion({ slug: marker }),
        ],
      },
    ],
  };
}

// Invalid: duplicate slug across phases (rejected by validateSurveyContent).
function invalidContent(): ContentConfig {
  // Genuinely invalid: the SAME slug twice WITHIN one phase (cross-phase repeats
  // are legal — that's the Findings repeater — so the dup must be same-phase).
  return {
    phases: [
      {
        id: 'p1',
        label: 'P1',
        questions: [
          makeQuestion({ slug: 'dup', phase_id: 'p1', phase_label: 'P1' }),
          makeQuestion({ slug: 'dup', phase_id: 'p1', phase_label: 'P1' }),
        ],
      },
    ],
  };
}

// A fetch stub returning the given {version, content} body as an ok JSON response.
function fetchReturning(version: number | null, content: ContentConfig | null) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ version, content }),
  })) as unknown as typeof fetch;
}

function allSlugs(config: { allQuestions: { slug: string }[] }): string[] {
  return config.allQuestions.map((q) => q.slug);
}

describe('loadActiveSurveyConfig', () => {
  beforeEach(async () => {
    await localDb.surveyConfig.clear();
  });

  it('online: composes valid fetched content and caches it', async () => {
    const fetchImpl = fetchReturning(2, validContent());

    const result = await loadActiveSurveyConfig({
      online: true,
      fetchImpl,
      overlay: TEST_OVERLAY,
    });

    expect(result.version).toBe(2);
    expect(allSlugs(result)).toContain('fv_marker_field');
    expect(await localDb.surveyConfig.count()).toBe(1);

    const row = await localDb.surveyConfig.get(['first_visit', 2]);
    expect(row?.version).toBe(2);
  });

  it('online: invalid fetched content falls back to SEED', async () => {
    const fetchImpl = fetchReturning(3, invalidContent());

    const result = await loadActiveSurveyConfig({
      online: true,
      fetchImpl,
      overlay: TEST_OVERLAY,
    });

    expect(result.version).toBeUndefined();
    expect(result.phases.length).toBe(PHASES.length);
  });

  it('offline: returns cached config without calling fetch', async () => {
    await localDb.surveyConfig.put({
      template_key: 'first_visit',
      version: 5,
      content_json: validContent(),
      cached_at: new Date().toISOString(),
    });
    const fetchImpl = vi.fn(() => {
      throw new Error('fetch must not be called when offline');
    }) as unknown as typeof fetch;

    const result = await loadActiveSurveyConfig({
      online: false,
      fetchImpl,
      overlay: TEST_OVERLAY,
    });

    expect(result.version).toBe(5);
    expect(allSlugs(result)).toContain('fv_marker_field');
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('offline: no cache returns SEED', async () => {
    const result = await loadActiveSurveyConfig({ online: false });

    expect(result.version).toBeUndefined();
    expect(result.phases.length).toBe(PHASES.length);
  });

  it('offline: pinned version returns that specific cached config', async () => {
    await localDb.surveyConfig.put({
      template_key: 'first_visit',
      version: 1,
      content_json: validContent('fv_v1_only'),
      cached_at: new Date().toISOString(),
    });
    await localDb.surveyConfig.put({
      template_key: 'first_visit',
      version: 2,
      content_json: validContent(),
      cached_at: new Date().toISOString(),
    });

    const result = await loadActiveSurveyConfig({
      online: false,
      version: 1,
      overlay: TEST_OVERLAY,
    });

    expect(result.version).toBe(1);
    expect(allSlugs(result)).toContain('fv_v1_only');
    expect(allSlugs(result)).not.toContain('fv_marker_field');
  });
});
