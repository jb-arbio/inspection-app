import { describe, it, expect } from 'vitest';
import { resolveScopeId } from '../resolveScope';

const ctx = { deal_id: 'd', location_id: 'l', unit_category_id: 'u' };

describe('resolveScopeId', () => {
  it('returns deal_id for deal level', () => {
    expect(resolveScopeId('deal', ctx)).toBe('d');
  });
  it('returns unit_category_id for unit/property/listing levels', () => {
    expect(resolveScopeId('unit', ctx)).toBe('u');
    expect(resolveScopeId('property', ctx)).toBe('u');
    expect(resolveScopeId('listing', ctx)).toBe('u');
  });
  it('returns null for unsupported level', () => {
    expect(resolveScopeId('owner', ctx)).toBeNull();
    expect(resolveScopeId('reservation', ctx)).toBeNull();
  });
});
