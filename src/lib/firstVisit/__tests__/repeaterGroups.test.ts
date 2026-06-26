import { describe, it, expect } from 'vitest';
import { repeaterGroupMeta } from '../repeaterGroups';
import { ALL_QUESTIONS } from '../questions';

describe('repeaterGroupMeta', () => {
  it('returns title, intro, and itemNoun for the issue log group', () => {
    const meta = repeaterGroupMeta('issue');
    expect(meta.title).toBe('Issue log');
    expect(meta.intro).toMatch(/broken|damaged|dirty|missing/i);
    expect(meta.itemNoun).toBe('Issue');
  });

  it('returns title, intro, and itemNoun for the check-in step group', () => {
    const meta = repeaterGroupMeta('checkin_step');
    expect(meta.title).toBe('Check-in steps');
    expect(meta.intro).toMatch(/access point/i);
    expect(meta.itemNoun).toBe('Step');
  });

  it('returns title, intro, and itemNoun for the item log group', () => {
    const meta = repeaterGroupMeta('item');
    expect(meta.title).toBe('Appliances & amenities');
    expect(meta.itemNoun).toBe('Item');
  });

  it('defaults to itemNoun "Step" and no title/intro for unknown groups', () => {
    const meta = repeaterGroupMeta('something_else');
    expect(meta.title).toBeUndefined();
    expect(meta.intro).toBeUndefined();
    expect(meta.itemNoun).toBe('Step');
  });

  it('defaults the same way for null/undefined', () => {
    expect(repeaterGroupMeta(null).itemNoun).toBe('Step');
    expect(repeaterGroupMeta(undefined).itemNoun).toBe('Step');
    expect(repeaterGroupMeta(null).title).toBeUndefined();
  });

  // Guard: every repeater group_id present in the composed config must have a
  // titled map entry, so a future config group can't silently regress to the
  // bare "Step N" fallback.
  it('has a titled map entry for every group_id in the composed config', () => {
    const groupIds = new Set<string>();
    for (const q of ALL_QUESTIONS) {
      if (q.group_id) groupIds.add(q.group_id);
    }
    expect(groupIds.size).toBeGreaterThan(0);
    for (const gid of groupIds) {
      expect(
        repeaterGroupMeta(gid).title,
        `missing title for group_id "${gid}"`,
      ).toBeDefined();
    }
  });
});
