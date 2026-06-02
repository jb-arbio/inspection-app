import { describe, it, expect } from 'vitest';
import { validateUnitIdentifier } from '../unitIdentifier';

describe('validateUnitIdentifier', () => {
  const siblings = ['Apt 1A', 'Apt 2B'];
  it('rejects empty / whitespace', () => {
    expect(validateUnitIdentifier('', siblings).ok).toBe(false);
    expect(validateUnitIdentifier('   ', siblings).ok).toBe(false);
  });
  it('rejects a case-insensitive duplicate within the property', () => {
    expect(validateUnitIdentifier('apt 1a', siblings).ok).toBe(false);
  });
  it('accepts a unique trimmed identifier', () => {
    const r = validateUnitIdentifier('  Apt 3C ', siblings);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('Apt 3C');
  });
  it('reports empty vs duplicate via the reason field', () => {
    const empty = validateUnitIdentifier('   ', siblings);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe('empty');
    const dup = validateUnitIdentifier('APT 2B', siblings);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.reason).toBe('duplicate');
  });
  it('treats a confirmed hub label as a duplicate of an existing sibling (hub-confirm path)', () => {
    // Hub add pre-fills the input with the hub name; confirming a name that
    // already exists in the property must be rejected, same as on-site.
    const existing = ['Studio', 'Deluxe King'];
    expect(validateUnitIdentifier('deluxe king', existing).ok).toBe(false);
    expect(validateUnitIdentifier('Deluxe Twin', existing).ok).toBe(true);
  });
});
