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

  it('WS-C: check-in step questions all share group_id "checkin_step"', () => {
    const checkinStepSlugs = [
      'fv_step_name',
      'fv_step_access_point',
      'fv_step_lock_type',
      'fv_step_smart_lock_provider',
      'fv_step_smart_lock_device_id',
      // fv_step_lock_brand moved to unit scope in the 2026-06-02 review
      'fv_step_lock_classification',
      'fv_step_key_storage_method',
      'fv_step_storage_brand',
      'fv_step_default_access_code',
      // fv_step_lock_notes was dropped in the 2026-06-02 review
    ];
    for (const slug of checkinStepSlugs) {
      const q = ALL_QUESTIONS.find((x) => x.slug === slug);
      expect(q, `missing question ${slug}`).toBeDefined();
      expect(q!.group_id).toBe('checkin_step');
    }
  });

  it('WS-C: fv_checkin_steps_count is removed', () => {
    expect(ALL_QUESTIONS.find((q) => q.slug === 'fv_checkin_steps_count')).toBeUndefined();
  });

  it('WS-C: fv_extra_services_offered is a multi-select with per-option follow-up', () => {
    const q = ALL_QUESTIONS.find((x) => x.slug === 'fv_extra_services_offered');
    expect(q).toBeDefined();
    expect(q!.multi_select).toBe(true);
    expect(q!.per_option_follow_up).toBeDefined();
    expect(q!.per_option_follow_up!.label_template).toContain('{option}');
  });

  it('WS-C: fv_fire_exit_secondary has a conditional follow-up triggered by Yes', () => {
    const q = ALL_QUESTIONS.find((x) => x.slug === 'fv_fire_exit_secondary');
    expect(q).toBeDefined();
    expect(q!.follow_up).toBeDefined();
    expect(q!.follow_up!.when_value).toBe(true);
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
