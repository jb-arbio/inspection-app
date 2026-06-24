import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS } from '../questions';

// Phase A used to filter slugs out of the raw config via the DROPPED_SLUGS set
// + a status-aware fuse-box dedup. Those transforms are gone; the dropped slugs
// are simply absent from first-visit-content.json now. Retargeted to assert the
// composed RESULT: the slugs are not present. The "DROPPED_SLUGS.size === 42"
// test was deleted — it only checked an internal constant that no longer exists.
const DROPPED_SLUGS = [
  // Phase 2 — location & arrival (Hub auto-generates from Geoapify/Places)
  'fv_location_distance_to_center_min', 'fv_location_nearest_transport',
  'fv_location_directions_from_airport', 'fv_location_directions_from_central_station',
  'fv_tips_grocery', 'fv_tips_restaurants', 'fv_tips_attractions', 'fv_tips_nightlife',
  'fv_tips_markets', 'fv_route_closest_transit_station', 'fv_route_from_airport',
  'fv_route_from_central_station',
  // Phase 3 — building exterior
  'fv_building_elevator_instructions', 'fv_accessibility_elevator_dimensions',
  // Phase 4 — check-in
  'fv_checkin_guide_2_needed', 'fv_step_lock_notes',
  // Phase 5 — infrastructure / utilities (meter block + dup proposed)
  'fv_trash_onsite_check', 'fv_waste_separation_streams', 'fv_utility_provider',
  'fv_electricity_meter_location', 'fv_electric_meter_location', 'fv_electric_meter_number',
  'fv_gas_meter_location', 'fv_gas_meter_number', 'fv_water_meter_location',
  'fv_water_meter_number',
  // Phase 6 — services
  'fv_service_restrictions_observed', 'fv_house_rule',
  // Phase 8 — documentation
  'fv_floorplan_uploaded', 'fv_floorplan_onsite_attach',
  // Phase 10 — check-out
  'fv_checkout_standard_items', 'fv_checkout_key_return_method',
  'fv_checkout_key_return_location', 'fv_checkout_trash_disposal', 'fv_checkout_time',
  // Phase 9d cost fields — replaced by Findings €
  'fv_furniture_cost_estimate_eur', 'fv_equipment_cost_estimate_eur',
  'fv_bathroom_improvement_cost_eur', 'fv_maintenance_cost_estimate_eur',
  'fv_maintenance_details',
  // Phase 9e appliance condition — repeater becomes pure inventory
  'appliance.status', 'appliance.statusNote',
];

describe('Phase A — dropped questions', () => {
  it('removes every dropped slug from the loaded set', () => {
    const present = new Set(ALL_QUESTIONS.map((q) => q.slug));
    for (const slug of DROPPED_SLUGS) {
      expect(present.has(slug), `${slug} should be dropped`).toBe(false);
    }
  });

  it('keeps a representative non-dropped question', () => {
    const present = new Set(ALL_QUESTIONS.map((q) => q.slug));
    expect(present.has('fv_wifi_download_speed_mbps')).toBe(true);
  });

  it('keeps exactly one fuse box location (the existing one) and one reset instructions', () => {
    const fb = ALL_QUESTIONS.filter((q) => q.slug === 'fv_fusebox_location');
    expect(fb.length).toBe(1);
    expect(fb[0].status).toBe('existing');
    const reset = ALL_QUESTIONS.filter((q) => q.slug === 'fv_fusebox_reset_instructions');
    expect(reset.length).toBe(1);
    expect(reset[0].status).toBe('existing');
  });

  // Phase C: per-area condition ratings stay as pure observations (they feed the
  // health score). Only the cost fields were removed — the € total is now derived
  // from the Findings repeater. This guard prevents an accidental future drop.
  it('keeps the per-area condition ratings (no longer cost-bearing)', () => {
    const present = new Set(ALL_QUESTIONS.map((q) => q.slug));
    for (const slug of [
      'fv_furniture_status', 'fv_equipment_status', 'fv_bathroom_condition',
      'fv_bathroom_issues', 'fv_maintenance_level',
    ]) {
      expect(present.has(slug), `${slug} kept`).toBe(true);
    }
  });
});
