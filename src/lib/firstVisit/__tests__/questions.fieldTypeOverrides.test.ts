import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS } from '../questions';

const bySlug = (slug: string) => ALL_QUESTIONS.filter((q) => q.slug === slug);
const one = (slug: string) => {
  const m = bySlug(slug);
  expect(m.length, `expected exactly one ${slug}`).toBe(1);
  return m[0];
};

// Task 8 — field-type overrides driven by field feedback.
describe('Field-type overrides — hallways scale + guest-type multi-select', () => {
  // The hallways-clean question becomes a scale, reusing fv_building_state's
  // exact option list for consistency across the two building-condition fields.
  it('fv_building_hallways_clean is a scale matching fv_building_state options', () => {
    const hallways = one('fv_building_hallways_clean');
    const buildingState = one('fv_building_state');
    expect(hallways.type).toBe('scale');
    expect(hallways.options).toEqual(buildingState.options);
    expect(hallways.options).toEqual(['Excellent', 'Good', 'Acceptable', 'Needs attention', 'Poor']);
  });

  it('fv_best_for_guest_type is multi-select with its original options unchanged', () => {
    const q = one('fv_best_for_guest_type');
    expect(q.multi_select).toBe(true);
    expect(q.options).toEqual(['Business', 'Families', 'Couples', 'Groups', 'Solo', 'Long-stay']);
  });
});
