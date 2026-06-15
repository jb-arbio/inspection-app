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
