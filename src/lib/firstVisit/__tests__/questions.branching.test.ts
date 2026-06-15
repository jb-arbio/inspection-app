import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS } from '../questions';
import type { VisibleWhen } from '../questions';

const bySlug = (slug: string) => ALL_QUESTIONS.filter((q) => q.slug === slug);
const one = (slug: string) => {
  const m = bySlug(slug);
  expect(m.length, `expected exactly one ${slug}`).toBe(1);
  return m[0];
};

describe('Conditional branching — parking / storage / safety / accessibility', () => {
  // Task 5 — the one genuinely-missing negative option. Every other controller
  // already had a "No"/"None"/boolean-false path; the elevator select did not.
  it("adds a 'No elevator' option to fv_building_elevator_working", () => {
    const q = one('fv_building_elevator_working');
    expect(q.options).toEqual(['Yes', 'No', 'Partially', 'No elevator']);
  });

  // Task 6 — each dependent's visible_when rule deep-equals the expected
  // predicate (corrected against the real controller types from Task 0).
  const cases: Array<[string, VisibleWhen]> = [
    // Parking — controller fv_parking_actual_type is a select with a 'None' option.
    ['fv_parking_dedicated_spots', { question: 'fv_parking_actual_type', not_equals: 'None' }],
    ['fv_parking_access_instructions', { question: 'fv_parking_actual_type', not_equals: 'None' }],
    ['fv_parking_spot_number', { question: 'fv_parking_actual_type', not_equals: 'None' }],
    ['fv_photo_parking_spot', { question: 'fv_parking_actual_type', not_equals: 'None' }],
    // Storage — controller fv_storage_onsite_check is a boolean.
    ['fv_storage_access_instructions', { question: 'fv_storage_onsite_check', equals: true }],
    ['fv_storage_location', { question: 'fv_storage_onsite_check', equals: true }],
    // Safety — extinguisher / smoke controllers are selects with a 'No' option.
    ['fv_fire_extinguisher_location', { question: 'fv_fire_extinguisher_present', not_equals: 'No' }],
    ['fv_fire_extinguisher_service_date', { question: 'fv_fire_extinguisher_present', not_equals: 'No' }],
    ['fv_smoke_detector_working', { question: 'fv_smoke_detector_present', not_equals: 'No' }],
    // First aid controller is a boolean.
    ['fv_first_aid_location', { question: 'fv_first_aid_present', equals: true }],
    // Accessibility — only when the building has an elevator.
    ['fv_accessibility_unit_door_widths', { question: 'fv_building_elevator_working', not_equals: 'No elevator' }],
  ];

  it.each(cases)('%s has the expected visible_when rule', (slug, rule) => {
    const q = one(slug);
    expect(q.visible_when).toEqual(rule);
  });

  // E2's required photo is relaxed: when there's no parking the photo question
  // is hidden, so it must no longer be a hard scope-level requirement.
  it('fv_photo_parking_spot is no longer required after the branching override', () => {
    expect(one('fv_photo_parking_spot').required).toBe(false);
  });
});
