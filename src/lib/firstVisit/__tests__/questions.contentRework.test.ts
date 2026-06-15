import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS } from '../questions';

const bySlug = (slug: string) => ALL_QUESTIONS.filter((q) => q.slug === slug);
const one = (slug: string) => {
  const m = bySlug(slug);
  expect(m.length, `expected exactly one ${slug}`).toBe(1);
  return m[0];
};

describe('Content rework — Tasks 17 & 18', () => {
  // Task 18.1 — consumables block dropped entirely.
  it('drops every consumable.* slug', () => {
    const consumables = ALL_QUESTIONS.filter((q) => q.slug.startsWith('consumable.'));
    expect(consumables).toEqual([]);
  });

  // Task 17 — fuse-box media consolidated into one video.
  it('drops the redundant fuse-box photos', () => {
    expect(bySlug('fv_photo_fusebox')).toEqual([]);
    expect(bySlug('fv_photo_fusebox_location')).toEqual([]);
  });

  it('keeps fv_video_fusebox as the single required fuse-box capture covering location + reset', () => {
    const q = one('fv_video_fusebox');
    expect(q.type).toBe('file');
    expect(q.required).toBe(true);
    expect(q.label.toLowerCase()).toContain('location');
    expect(q.label.toLowerCase()).toContain('reset');
  });

  // Task 18.2 — trash dropdown loses the "Inside apartment" option.
  it('removes "Inside apartment" from the trash container location options', () => {
    const q = one('fv_trash_container_location');
    expect(q.options).not.toContain('Inside apartment');
    for (const opt of ['Backyard', 'Courtyard', 'Basement', 'Ground floor room', 'Street']) {
      expect(q.options).toContain(opt);
    }
  });

  // Task 18.3 — furnishing-scope controller gating the measurement photos.
  it('injects the fv_furnishing_by_arbio boolean controller at unit_category scope', () => {
    const q = one('fv_furnishing_by_arbio');
    expect(q.type).toBe('boolean');
    expect(q.required).toBe(true);
    expect(q.scope).toBe('unit_category');
  });

  it('gates fv_photo_window_ceiling and fv_ceiling_height_m on the furnishing controller', () => {
    const expected = { question: 'fv_furnishing_by_arbio', equals: true };
    expect(one('fv_photo_window_ceiling').visible_when).toEqual(expected);
    expect(one('fv_ceiling_height_m').visible_when).toEqual(expected);
  });
});

describe('Task 19 — reframe mismatch/owner/new-property paths', () => {
  // Change 1 — direct capacity fields replace the "if mismatched" framing.
  it('injects fv_capacity_base and fv_capacity_max as required numbers at unit_category scope', () => {
    for (const slug of ['fv_capacity_base', 'fv_capacity_max']) {
      const q = one(slug);
      expect(q.type, slug).toBe('number');
      expect(q.required, slug).toBe(true);
      expect(q.scope, slug).toBe('unit_category');
      expect(q.phase_id, slug).toBe('9b');
    }
  });

  it('keeps fv_capacity_actual_setup / fv_capacity_comments as optional free-text', () => {
    expect(one('fv_capacity_actual_setup').required).toBe(false);
    expect(one('fv_capacity_comments').required).toBe(false);
  });

  // Change 2 — Wi-Fi presence gate.
  it('injects fv_wifi_present as a required boolean at location scope', () => {
    const q = one('fv_wifi_present');
    expect(q.type).toBe('boolean');
    expect(q.required).toBe(true);
    expect(q.scope).toBe('location');
    expect(q.phase_id).toBe('7');
  });

  it('gates both wifi speed questions on fv_wifi_present === true', () => {
    const expected = { question: 'fv_wifi_present', equals: true };
    expect(one('fv_wifi_download_speed_mbps').visible_when).toEqual(expected);
    expect(one('fv_wifi_upload_speed_mbps').visible_when).toEqual(expected);
  });

  // Change 3 — cleaning/laundry "brand new" path.
  it('gates cleaning detail questions on fv_cleaning_setup !== "Not yet set up"', () => {
    const expected = { question: 'fv_cleaning_setup', not_equals: 'Not yet set up' };
    expect(one('fv_cleaning_provider_name').visible_when).toEqual(expected);
    expect(one('fv_cleaning_takeover_possible').visible_when).toEqual(expected);
  });

  it('gates laundry detail questions on fv_laundry_setup !== "Not yet set up"', () => {
    const expected = { question: 'fv_laundry_setup', not_equals: 'Not yet set up' };
    expect(one('fv_laundry_provider_name').visible_when).toEqual(expected);
    expect(one('fv_laundry_delivery_frequency').visible_when).toEqual(expected);
  });

  // Change 4 — maintenance detail gate is N/A: fv_maintenance_details and
  // fv_maintenance_cost_estimate_eur are both in DROPPED_SLUGS (replaced by the
  // Findings repeater), so no maintenance-detail question remains to gate.
  it('has no remaining maintenance-detail question to gate (dropped → Findings)', () => {
    expect(bySlug('fv_maintenance_details')).toEqual([]);
    expect(bySlug('fv_maintenance_cost_estimate_eur')).toEqual([]);
  });

  // Change 5 — owner-comparison framing removed.
  it('neutralizes owner-claim framing on fv_view_comments', () => {
    const q = one('fv_view_comments');
    const text = `${q.label} ${q.description ?? ''}`.toLowerCase();
    expect(text).not.toContain('owner');
    expect(text).not.toContain('claim');
    expect(text).not.toContain('meaningfully different');
  });

  it('neutralizes mismatch framing on fv_capacity_actual_setup label', () => {
    const q = one('fv_capacity_actual_setup');
    const text = `${q.label} ${q.description ?? ''}`.toLowerCase();
    expect(text).not.toContain('mismatch');
  });
});
