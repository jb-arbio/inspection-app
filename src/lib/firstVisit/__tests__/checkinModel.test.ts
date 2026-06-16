import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS } from '../questions';
import { repeaterGroupMeta } from '../repeaterGroups';

// Guard for the unified property/unit check-in access model (feedback §3.2,
// priority #4). The model the field test asked for — one structure with
// primary/backup access per door, steps in sequence, no property/unit
// duplication — is satisfied by the existing checkin_step repeater plus the
// E4 override that lifts lock brand out of the per-step block to unit scope.
// These assertions lock that shape so it can't silently regress.

const bySlug = (slug: string) => ALL_QUESTIONS.find((q) => q.slug === slug);

describe('check-in access model', () => {
  it('check-in steps are a titled, sequential repeater group', () => {
    const meta = repeaterGroupMeta('checkin_step');
    expect(meta.title).toBe('Check-in steps');
    expect(meta.intro).toMatch(/sequence/i);
  });

  it('each step records the access point (building entrance through unit door)', () => {
    const accessPoint = bySlug('fv_step_access_point');
    expect(accessPoint).toBeDefined();
    expect(accessPoint?.options).toEqual(
      expect.arrayContaining(['Building Door', 'Apartment Door']),
    );
  });

  it('each step is classified primary or backup (per-door access model)', () => {
    const classification = bySlug('fv_step_lock_classification');
    expect(classification?.options).toEqual(
      expect.arrayContaining(['Primary', 'Backup']),
    );
  });

  it('lock brand is collected once per unit, not duplicated per step', () => {
    const lockBrand = bySlug('fv_step_lock_brand');
    expect(lockBrand).toBeDefined();
    // E4: promoted out of the checkin_step repeater to unit scope so it is no
    // longer a free-text field repeated per access step.
    expect(lockBrand?.scope).toBe('unit_category');
    expect(lockBrand?.group_id ?? null).toBeNull();
  });
});
