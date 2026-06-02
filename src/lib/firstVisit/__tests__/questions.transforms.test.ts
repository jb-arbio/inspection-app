import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS, PHASES } from '../questions';

describe('first-visit question transforms', () => {
  describe('hideDealStampingQuestions', () => {
    it('drops fv_visit_deal_name entirely (deal name lives on deals table, not data_points)', () => {
      const dealName = ALL_QUESTIONS.find((q) => q.slug === 'fv_visit_deal_name');
      expect(dealName).toBeUndefined();
    });
  });

  describe('stripVerifyWord', () => {
    it('strips trailing " verify" from question labels (slug preserved)', () => {
      const q = ALL_QUESTIONS.find((qq) => qq.slug === 'fv_building_amenities_verify');
      expect(q).toBeDefined();
      // slug is the DB key — must NOT change
      expect(q!.slug).toBe('fv_building_amenities_verify');
      expect(q!.label).toBe('Building amenities');
      expect(q!.label.toLowerCase()).not.toContain('verify');
    });

    it('replaces " & verify" in phase labels (e.g. "Unit identity & verify" → "Unit identity")', () => {
      const unitIdentity = PHASES.find((p) => p.label === 'Unit identity');
      expect(unitIdentity).toBeDefined();
      // no phase label should still contain the word "verify"
      for (const p of PHASES) {
        expect(p.label.toLowerCase()).not.toContain('verify');
      }
      // question.phase_label is also cleaned
      for (const q of ALL_QUESTIONS) {
        expect(q.phase_label.toLowerCase()).not.toContain('verify');
      }
    });

    it('replaces standalone "verify" in descriptions with "confirm"', () => {
      const descs = ALL_QUESTIONS.map((q) => q.description).filter(
        (d): d is string => typeof d === 'string',
      );
      for (const d of descs) {
        expect(d.toLowerCase()).not.toMatch(/\bverify\b/);
      }
      // and at least one description was previously a "verify" phrase, now "confirm"
      const hasConfirm = descs.some((d) => /\bconfirm\b/i.test(d) && /=\s*Different/i.test(d));
      expect(hasConfirm).toBe(true);
    });
  });
});
