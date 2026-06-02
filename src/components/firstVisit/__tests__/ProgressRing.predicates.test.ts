import { describe, it, expect } from 'vitest';
import { isAnswered, isSkipped } from '../ProgressRing';

describe('isSkipped', () => {
  it('returns true for the skipped sentinel with reason', () => {
    expect(isSkipped({ __skipped: true, reason: 'Locked door' })).toBe(true);
  });

  it('returns true for the skipped sentinel without reason', () => {
    expect(isSkipped({ __skipped: true })).toBe(true);
  });

  it('returns false when __skipped is explicitly false', () => {
    expect(isSkipped({ __skipped: false })).toBe(false);
  });

  it('returns false for null, undefined, primitives, and arrays', () => {
    expect(isSkipped(null)).toBe(false);
    expect(isSkipped(undefined)).toBe(false);
    expect(isSkipped('')).toBe(false);
    expect(isSkipped('x')).toBe(false);
    expect(isSkipped(0)).toBe(false);
    expect(isSkipped(false)).toBe(false);
    expect(isSkipped([])).toBe(false);
    expect(isSkipped([{ __skipped: true }])).toBe(false);
  });

  it('returns false for unrelated objects', () => {
    expect(isSkipped({ foo: 'bar' })).toBe(false);
    expect(isSkipped({})).toBe(false);
  });
});

describe('isAnswered', () => {
  it('returns false for undefined and null', () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered(null)).toBe(false);
  });

  it('returns false for empty string and whitespace-only string', () => {
    expect(isAnswered('')).toBe(false);
    expect(isAnswered('   ')).toBe(false);
  });

  it('returns true for non-empty string', () => {
    expect(isAnswered('hello')).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(isAnswered([])).toBe(false);
  });

  it('returns true for array with at least one answered element', () => {
    expect(isAnswered(['a'])).toBe(true);
    expect(isAnswered(['', 'b'])).toBe(true);
  });

  it('returns false for an array of only empty elements', () => {
    expect(isAnswered(['', null, undefined])).toBe(false);
  });

  it('recurses into nested arrays', () => {
    expect(isAnswered([[''], [null]])).toBe(false);
    expect(isAnswered([[''], ['deep']])).toBe(true);
  });

  it('treats zero and false as answered', () => {
    expect(isAnswered(0)).toBe(true);
    expect(isAnswered(false)).toBe(true);
  });

  it('treats the skip sentinel as answered (terminal)', () => {
    expect(isAnswered({ __skipped: true })).toBe(true);
    expect(isAnswered({ __skipped: true, reason: 'Owner not present' })).toBe(true);
  });

  it('does NOT treat { __skipped: false } as answered via the skip path', () => {
    // An object that has __skipped:false still falls into the generic-object
    // branch (objects-with-keys count as answered once set). Documenting the
    // current behaviour so a future change is intentional.
    expect(isAnswered({ __skipped: false })).toBe(true);
  });

  it('counts generic objects as answered', () => {
    expect(isAnswered({ foo: 'bar' })).toBe(true);
  });
});
