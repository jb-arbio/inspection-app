import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS, PHASES } from '../questions';

const bySlug = (slug: string) => ALL_QUESTIONS.filter((q) => q.slug === slug);
const one = (slug: string) => {
  const m = bySlug(slug);
  expect(m.length, `expected exactly one ${slug}`).toBe(1);
  return m[0];
};

describe('Phase E — bucket-2 config fixes', () => {
  // E1 — building amenities multi-select + custom, always shown.
  it('E1: fv_building_amenities_verify is a multi-select with custom options and the German option list', () => {
    const q = one('fv_building_amenities_verify');
    expect(q.multi_select).toBe(true);
    expect(q.allow_custom_options).toBe(true);
    expect(q.options).toEqual([
      'Aufzug',
      'Gemeinschafts Balkon/Terrasse',
      'Gemeinschaftsgarten',
      'Schwimmbad',
      'Sauna',
      'Fitnessraum',
      'Konferenzräume',
      'Reception/Concierge',
    ]);
    // No conditional gating: no follow_up on the question itself, and nothing
    // about it being gated — it renders unconditionally.
    expect(q.follow_up).toBeUndefined();
  });

  // E2 — parking spot number + photo.
  it('E2: fv_parking_spot_number is text/optional in the parking phase at location scope', () => {
    const q = one('fv_parking_spot_number');
    expect(q.type).toBe('text');
    expect(q.required).toBe(false);
    expect(q.label).toBe('Exact parking spot number');
    expect(q.scope).toBe('location');
    expect(q.phase_id).toBe('3');
  });
  it('E2: fv_photo_parking_spot is a file anchored to fv_parking_dedicated_spots', () => {
    const q = one('fv_photo_parking_spot');
    expect(q.type).toBe('file');
    // Injected required:true by E2, then relaxed to optional by the Phase F
    // branching override (it's hidden when there's no parking, so it must not
    // be a hard scope-level requirement). See questions.branching.test.ts.
    expect(q.required).toBe(false);
    expect(q.label).toBe('Photo of the parking spot');
    expect(q.anchor_to).toBe('fv_parking_dedicated_spots');
    expect(q.scope).toBe('location');
    expect(q.phase_id).toBe('3');
  });

  // E3 — underground garage clearance height as a conditional follow-up.
  it('E3: fv_parking_actual_type has a number follow-up triggered by either garage option', () => {
    const q = one('fv_parking_actual_type');
    expect(q.follow_up).toBeDefined();
    expect(q.follow_up!.type).toBe('number');
    expect(q.follow_up!.label).toBe('Underground garage clearance height (cm)');
    // Fires for either garage option; every trigger must be a real parent option.
    const triggers = q.follow_up!.when_value as string[];
    expect(triggers).toEqual(['Garage on-site', 'Garage nearby']);
    for (const t of triggers) expect(q.options).toContain(t);
  });

  // E4 — lock brand once per unit (config only).
  it('E4: fv_step_lock_brand is unit_category scope and out of the checkin_step repeater', () => {
    const q = one('fv_step_lock_brand');
    expect(q.scope).toBe('unit_category');
    expect(q.group_id).toBeNull();
  });

  // E5 — capacity always collected (conditional description gate removed).
  it('E5: capacity fields no longer carry the "Only if" conditional description', () => {
    const setup = one('fv_capacity_actual_setup');
    const comments = one('fv_capacity_comments');
    expect(setup.description).toBeNull();
    expect(comments.description).toBeNull();
    // Required left untouched (was false).
    expect(setup.required).toBe(false);
    expect(comments.required).toBe(false);
  });

  // E6 — fuse box video + location photo.
  it('E6: fuse box media questions are files anchored to fv_fusebox_location at location scope', () => {
    const video = one('fv_video_fusebox');
    const photo = one('fv_photo_fusebox_location');
    for (const q of [video, photo]) {
      expect(q.type).toBe('file');
      expect(q.anchor_to).toBe('fv_fusebox_location');
      expect(q.scope).toBe('location');
      expect(q.phase_id).toBe('5');
    }
    expect(video.label).toBe('Fuse box video (reset/operation)');
    expect(photo.label).toBe('Photo of fuse box location');
    // The location photo is mandatory (proof of where the fuse box is); video optional.
    expect(photo.required).toBe(true);
    expect(video.required).toBe(false);
  });

  // E7 — common areas options appended (existing preserved).
  it('E7: fv_common_area appends Shared kitchen and Shared garden while keeping existing options', () => {
    const q = one('fv_common_area');
    for (const existing of ['Lobby', 'Rooftop', 'Courtyard', 'SmokingArea', 'Storage', 'Other']) {
      expect(q.options).toContain(existing);
    }
    expect(q.options).toContain('Shared kitchen');
    expect(q.options).toContain('Shared garden');
  });

  // E8 — media anchoring.
  it('E8: media questions anchor to their topic questions', () => {
    expect(one('fv_video_trash_location').anchor_to).toBe('fv_trash_container_location');
    expect(one('fv_photo_storage_room').anchor_to).toBe('fv_storage_location');
    expect(one('fv_video_parking_access').anchor_to).toBe('fv_parking_access_instructions');
    expect(one('fv_photo_fusebox').anchor_to).toBe('fv_fusebox_location');
    expect(one('fv_video_checkin_walkthrough').anchor_to).toBe('fv_step_name');
  });

  it('E8: every anchor target slug exists in the config', () => {
    const allSlugs = new Set(ALL_QUESTIONS.map((q) => q.slug));
    const anchored = ALL_QUESTIONS.filter((q) => q.anchor_to);
    for (const q of anchored) {
      expect(allSlugs.has(q.anchor_to!), `${q.slug} anchors to missing ${q.anchor_to}`).toBe(true);
    }
  });

  // Sanity: injected questions appear in their phases exactly once.
  it('injected bucket-2 questions are present exactly once', () => {
    for (const slug of [
      'fv_parking_spot_number',
      'fv_photo_parking_spot',
      'fv_video_fusebox',
      'fv_photo_fusebox_location',
    ]) {
      expect(bySlug(slug).length, slug).toBe(1);
    }
    // PHASES is the source of truth the app renders from.
    const flat = PHASES.flatMap((p) => p.questions.map((q) => q.slug));
    expect(flat).toContain('fv_parking_spot_number');
  });
});
