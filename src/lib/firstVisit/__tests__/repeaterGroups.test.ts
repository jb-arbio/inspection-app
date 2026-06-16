import { describe, it, expect } from 'vitest';
import { repeaterGroupMeta } from '../repeaterGroups';
import config from '../../../data/first-visit-questions.json';

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

  it.each([
    ['appliance_amenity', 'Appliances & amenities', 'Appliance'],
    ['utility_provider', 'Utilities & providers', 'Utility'],
    ['maintenance_procedure', 'Maintenance procedures', 'Procedure'],
    ['equipment_issue', 'Equipment issues', 'Issue'],
    ['furniture_issue', 'Furniture issues', 'Issue'],
    ['maintenance_issue', 'Maintenance issues', 'Issue'],
    ['checkout_step', 'Check-out steps', 'Step'],
  ])('returns a non-default title and itemNoun for %s', (gid, title, itemNoun) => {
    const meta = repeaterGroupMeta(gid);
    expect(meta.title).toBe(title);
    expect(meta.itemNoun).toBe(itemNoun);
  });

  // Guard: every group_id present in the config (except injected `finding`)
  // must have a map entry, so future config groups can't silently regress to
  // the bare "Step N" fallback.
  it('has a titled map entry for every group_id in the config', () => {
    const groupIds = new Set<string>();
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
      } else if (node && typeof node === 'object') {
        const obj = node as Record<string, unknown>;
        if (typeof obj.group_id === 'string') groupIds.add(obj.group_id);
        Object.values(obj).forEach(walk);
      }
    };
    walk(config);
    groupIds.delete('finding'); // injected at runtime, not in config

    expect(groupIds.size).toBeGreaterThan(0);
    for (const gid of groupIds) {
      expect(repeaterGroupMeta(gid).title, `missing title for group_id "${gid}"`).toBeDefined();
    }
  });
});
