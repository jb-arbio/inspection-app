import { describe, it, expect } from 'vitest';
import {
  PHASES,
  ALL_QUESTIONS,
  phasesForScope,
  questionsForScope,
  CONFIG_META,
  groupIdFor,
  type FirstVisitQuestion,
} from '../questions';

describe('first-visit question config', () => {
  it('loads the generated JSON with metadata', () => {
    expect(CONFIG_META.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(CONFIG_META.counts.questions).toBe(ALL_QUESTIONS.length);
    expect(CONFIG_META.counts.phases).toBe(PHASES.length);
  });

  it('every question has a known scope', () => {
    const scopes = new Set(ALL_QUESTIONS.map((q) => q.scope));
    for (const s of scopes) expect(['deal', 'location', 'unit_category']).toContain(s);
  });

  it('phasesForScope returns only phases with at least one question in that scope', () => {
    for (const scope of ['deal', 'location', 'unit_category'] as const) {
      const phases = phasesForScope(scope);
      for (const p of phases) {
        expect(p.questions.length).toBeGreaterThan(0);
        for (const q of p.questions) expect(q.scope).toBe(scope);
      }
    }
  });

  it('questionsForScope matches the flat filter', () => {
    for (const scope of ['deal', 'location', 'unit_category'] as const) {
      const flat = questionsForScope(scope);
      const fromPhases = phasesForScope(scope).flatMap((p) => p.questions);
      expect(flat.length).toBe(fromPhases.length);
    }
  });

  it('groupIdFor returns the question group_id, or null when absent', () => {
    const base: FirstVisitQuestion = {
      slug: 'x',
      label: 'X',
      description: null,
      scope: 'deal',
      mode: 'data',
      type: 'text',
      options: [],
      required: false,
      repeater: false,
      pms_target: null,
      status: 'existing',
      verdict: null,
      notes: null,
      phase_id: 'p1',
      phase_label: 'P1',
    };
    expect(groupIdFor(base)).toBeNull();
    expect(groupIdFor({ ...base, group_id: 'checkin_step' })).toBe(
      'checkin_step',
    );
    expect(groupIdFor({ ...base, group_id: null })).toBeNull();
  });
});
