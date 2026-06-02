import { describe, it, expect } from 'vitest';
import { resolveScopeId } from '../resolveScope';

const ctx = { deal_id: 'd', location_id: 'l', unit_category_id: 'u' };

describe('resolveScopeId', () => {
  it('maps deal scope to deal_id', () => {
    expect(resolveScopeId('deal', ctx)).toBe('d');
  });
  it('maps location scope to location_id', () => {
    expect(resolveScopeId('location', ctx)).toBe('l');
  });
  it('maps unit_category scope to unit_category_id', () => {
    expect(resolveScopeId('unit_category', ctx)).toBe('u');
  });
  it('returns null when the scope id is absent', () => {
    expect(resolveScopeId('location', { deal_id: 'd' })).toBeNull();
    expect(resolveScopeId('unit_category', { deal_id: 'd' })).toBeNull();
  });
});
