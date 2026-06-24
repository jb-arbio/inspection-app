import { describe, it, expect } from 'vitest';
import { validateExtraction } from '../validateExtraction';

const TARGET = [
  'fv_location_quality',
  'finding_item_name',
  'finding_category',
  'finding_cost_estimate_eur',
];

describe('validateExtraction', () => {
  it('keeps a valid single value and clamps confidence', () => {
    const r = validateExtraction(
      { singles: { fv_location_quality: { value: 'Good', confidence: 1.5 } }, items: [] },
      TARGET,
    );
    expect(r.singles.fv_location_quality.value).toBe('Good');
    expect(r.singles.fv_location_quality.confidence).toBe(1);
  });

  it('nulls an off-enum value and records a warning', () => {
    const r = validateExtraction(
      { singles: { fv_location_quality: { value: 'Fabulous', confidence: 0.9 } }, items: [] },
      TARGET,
    );
    expect(r.singles.fv_location_quality.value).toBeNull();
    expect(r.warnings.some((w) => w.includes('fv_location_quality'))).toBe(true);
  });

  it('keeps a valid repeater item and coerces a numeric cost', () => {
    const r = validateExtraction(
      {
        singles: {},
        items: [
          {
            group_id: 'finding',
            fields: {
              finding_item_name: { value: 'Broken oven', confidence: 0.9 },
              finding_category: { value: 'Appliance', confidence: 0.8 },
              finding_cost_estimate_eur: { value: '200', confidence: 0.5 },
            },
          },
        ],
      },
      TARGET,
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0].fields.finding_cost_estimate_eur.value).toBe(200);
    expect(r.items[0].fields.finding_category.value).toBe('Appliance');
  });

  it('drops an item missing its required name', () => {
    const r = validateExtraction(
      {
        singles: {},
        items: [
          { group_id: 'finding', fields: { finding_category: { value: 'Appliance', confidence: 0.8 } } },
        ],
      },
      TARGET,
    );
    expect(r.items).toHaveLength(0);
  });

  it('drops an item with an unknown group', () => {
    const r = validateExtraction(
      { singles: {}, items: [{ group_id: 'nope', fields: {} }] },
      TARGET,
    );
    expect(r.items).toHaveLength(0);
    expect(r.warnings.some((w) => w.includes('unknown group'))).toBe(true);
  });
});
