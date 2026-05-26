import { describe, it, expect } from 'vitest';
import { isAllowedEmail } from '../auth';

describe('isAllowedEmail', () => {
  it('allows arbio.com', () => {
    expect(isAllowedEmail('joshua@arbio.com')).toBe(true);
  });
  it('rejects other domains', () => {
    expect(isAllowedEmail('foo@gmail.com')).toBe(false);
    expect(isAllowedEmail('joshua@arbio-group.com')).toBe(false);  // intentional per memory
  });
  it('rejects empty', () => {
    expect(isAllowedEmail('')).toBe(false);
    expect(isAllowedEmail(undefined as unknown as string)).toBe(false);
  });
});
