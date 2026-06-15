import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS, DROPPED_SLUGS } from '../questions';

describe('Phase A — dropped questions', () => {
  it('removes every slug in DROPPED_SLUGS from the loaded set', () => {
    const present = new Set(ALL_QUESTIONS.map((q) => q.slug));
    for (const slug of DROPPED_SLUGS) {
      expect(present.has(slug), `${slug} should be dropped`).toBe(false);
    }
  });

  it('drops the expected count', () => {
    // 35 Bucket-1 (existing in JSON) + 5 (9d cost) + 2 (9e appliance) = 42;
    // + Task 17 fv_photo_fusebox (1) + Task 18 consumables (4) = 47.
    // fuse-box dups handled status-aware (not in DROPPED_SLUGS).
    expect(DROPPED_SLUGS.size).toBe(47);
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
