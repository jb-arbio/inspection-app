import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS } from '../questions';
import { buildRenderPlan } from '@/app/first-visit/[dealId]/[inspectionId]/UnitSurvey';

const FINDING_SLUGS = [
  'finding_item_name','finding_category','finding_location','finding_resolution',
  'finding_quantity','finding_cost_estimate_eur','finding_urgency','finding_notes','finding_media',
];

describe('Phase B — findings repeater', () => {
  it('registers all finding fields under group_id "finding"', () => {
    for (const slug of FINDING_SLUGS) {
      const matches = ALL_QUESTIONS.filter((q) => q.slug === slug);
      expect(matches.length, `${slug} present`).toBeGreaterThan(0);
      for (const m of matches) expect(m.group_id).toBe('finding');
    }
  });
  it('renders findings at both unit_category and location scope', () => {
    const scopes = new Set(ALL_QUESTIONS.filter((q) => q.slug === 'finding_item_name').map((q) => q.scope));
    expect(scopes.has('unit_category')).toBe(true);
    expect(scopes.has('location')).toBe(true);
  });
  it('marks item_name, category, cost, media required and urgency optional', () => {
    const find = (slug: string, scope: string) => ALL_QUESTIONS.find((q) => q.slug === slug && q.scope === scope)!;
    for (const scope of ['unit_category','location']) {
      expect(find('finding_item_name', scope).required).toBe(true);
      expect(find('finding_category', scope).required).toBe(true);
      expect(find('finding_cost_estimate_eur', scope).required).toBe(true);
      expect(find('finding_media', scope).required).toBe(true);
      expect(find('finding_urgency', scope).required).toBe(false);
    }
  });
  it('collapses the 9 finding questions into a single repeater group', () => {
    const unitFindings = ALL_QUESTIONS.filter((q) => q.group_id === 'finding' && q.scope === 'unit_category');
    const plan = buildRenderPlan(unitFindings);
    const groups = plan.filter(
      (n): n is Extract<typeof n, { kind: 'group' }> => n.kind === 'group' && n.groupId === 'finding',
    );
    expect(groups.length).toBe(1);
    expect(groups[0].questions.length).toBe(9);
  });
});
