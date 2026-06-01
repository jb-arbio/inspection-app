import { describe, it, expect } from 'vitest';
import { isAllowedEmail } from '../auth';

describe('isAllowedEmail', () => {
  it('allows both Arbio domains', () => {
    expect(isAllowedEmail('joshua@arbio.com')).toBe(true);
    expect(isAllowedEmail('joshua@arbio-group.com')).toBe(true);
  });
  it('is case-insensitive on the domain', () => {
    expect(isAllowedEmail('joshua@Arbio.com')).toBe(true);
    expect(isAllowedEmail('joshua@ARBIO-GROUP.COM')).toBe(true);
  });
  it('rejects other domains', () => {
    expect(isAllowedEmail('foo@gmail.com')).toBe(false);
    expect(isAllowedEmail('foo@arbio.io')).toBe(false);
    expect(isAllowedEmail('foo@notarbio.com')).toBe(false);
  });
  it('rejects empty / malformed', () => {
    expect(isAllowedEmail('')).toBe(false);
    expect(isAllowedEmail(undefined as unknown as string)).toBe(false);
    expect(isAllowedEmail('joshua-no-at-sign')).toBe(false);
  });
});
