import { describe, it, expect } from 'vitest';
import { repeaterGroupMeta } from '../repeaterGroups';

describe('repeaterGroupMeta', () => {
  it('returns title, intro, and itemNoun for the findings group', () => {
    const meta = repeaterGroupMeta('finding');
    expect(meta.title).toBe('Findings');
    expect(meta.intro).toMatch(/repair, replacement/i);
    expect(meta.itemNoun).toBe('Finding');
  });

  it('returns title, intro, and itemNoun for the check-in step group', () => {
    const meta = repeaterGroupMeta('checkin_step');
    expect(meta.title).toBe('Check-in steps');
    expect(meta.intro).toMatch(/access point/i);
    expect(meta.itemNoun).toBe('Step');
  });

  it('returns title and itemNoun (no intro) for the consumables group', () => {
    const meta = repeaterGroupMeta('consumable');
    expect(meta.title).toBe('Consumables');
    expect(meta.intro).toBeUndefined();
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
});
