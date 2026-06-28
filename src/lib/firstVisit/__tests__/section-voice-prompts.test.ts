import { describe, it, expect } from 'vitest';
import { SECTION_VOICE_PROMPTS, voiceSummarySlug } from '@/data/section-voice-prompts';
import { ALL_QUESTIONS } from '../questions';

// Fillable (non-media) slugs that actually live in a given phase. finding_*
// exists at multiple scopes/phases, so we match on phase_id directly rather than
// a flat slug map.
function fillableSlugsInPhase(phaseId: string): Set<string> {
  return new Set(
    ALL_QUESTIONS.filter((q) => q.phase_id === phaseId && q.type !== 'file').map((q) => q.slug),
  );
}

describe('section-voice-prompts config guard', () => {
  for (const [phaseId, prompts] of Object.entries(SECTION_VOICE_PROMPTS)) {
    describe(`phase ${phaseId}`, () => {
      const fillable = fillableSlugsInPhase(phaseId);

      it('references a real, non-empty phase', () => {
        expect(fillable.size).toBeGreaterThan(0);
        expect(prompts.length).toBeGreaterThan(0);
      });

      it('has unique prompt ids', () => {
        const ids = prompts.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it('every target_slug exists in this phase and is fillable (not media)', () => {
        for (const p of prompts) {
          expect(p.target_slugs.length).toBeGreaterThan(0);
          for (const slug of p.target_slugs) {
            expect(fillable.has(slug), `${slug} not a fillable field in phase ${phaseId}`).toBe(true);
          }
        }
      });

      it('maps each slug to at most one prompt (no overlap)', () => {
        const seen = new Set<string>();
        for (const p of prompts) {
          for (const slug of p.target_slugs) {
            expect(seen.has(slug), `${slug} mapped to more than one prompt`).toBe(false);
            seen.add(slug);
          }
        }
      });
    });
  }

  it('voiceSummarySlug is unique across every prompt (per phase = area_key)', () => {
    // The summary answer key is (area_key=phaseId, question_key=voiceSummarySlug).
    // Prompt ids are unique within a phase, so summary slugs are too — guard it,
    // and also assert no summary slug collides with a real fillable field slug.
    for (const [phaseId, prompts] of Object.entries(SECTION_VOICE_PROMPTS)) {
      const fillable = fillableSlugsInPhase(phaseId);
      const seen = new Set<string>();
      for (const p of prompts) {
        const slug = voiceSummarySlug(p.id);
        expect(seen.has(slug), `${slug} duplicated in phase ${phaseId}`).toBe(false);
        expect(fillable.has(slug), `${slug} collides with a real field`).toBe(false);
        seen.add(slug);
      }
    }
  });
});
