import { describe, it, expect } from 'vitest';
import { DEV_QUESTIONS, byArea } from '../questions';

describe('DEV_QUESTIONS', () => {
  it('contains all four field types', () => {
    const types = new Set(DEV_QUESTIONS.map((q) => q.field_type));
    expect(types).toEqual(new Set(['text', 'number', 'select', 'boolean']));
  });

  it('byArea groups questions and preserves order', () => {
    const grouped = byArea(DEV_QUESTIONS);
    const areaKeys = Object.keys(grouped);
    expect(areaKeys.length).toBeGreaterThan(0);
    for (const key of areaKeys) {
      const orders = grouped[key].map((q) => q.order);
      const sorted = [...orders].sort((a, b) => a - b);
      expect(orders).toEqual(sorted);
    }
  });
});
