import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  parseAllowlist,
  isAdminEmail,
  isAdminEmailClient,
} from '../adminAccess';

describe('adminAccess', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // Fresh copy so mutations don't leak between tests.
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ADMIN_EMAILS;
    delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('parseAllowlist', () => {
    it('splits, trims, lowercases and drops empties', () => {
      const set = parseAllowlist(' Joshua@Arbio-Group.com , , Foo@Bar.com ,');
      expect(set.has('joshua@arbio-group.com')).toBe(true);
      expect(set.has('foo@bar.com')).toBe(true);
      expect(set.size).toBe(2);
    });

    it('returns an empty set for undefined or empty input', () => {
      expect(parseAllowlist(undefined).size).toBe(0);
      expect(parseAllowlist('').size).toBe(0);
      expect(parseAllowlist('   ').size).toBe(0);
    });
  });

  describe('isAdminEmail', () => {
    it('matches an allowlisted email case-insensitively and trimmed', () => {
      process.env.ADMIN_EMAILS = 'joshua@arbio-group.com';
      expect(isAdminEmail(' Joshua@Arbio-Group.com ')).toBe(true);
    });

    it('returns false for a non-listed email', () => {
      process.env.ADMIN_EMAILS = 'joshua@arbio-group.com';
      expect(isAdminEmail('intruder@example.com')).toBe(false);
    });

    it('returns false for null/undefined/empty email', () => {
      process.env.ADMIN_EMAILS = 'joshua@arbio-group.com';
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
      expect(isAdminEmail('')).toBe(false);
      expect(isAdminEmail('   ')).toBe(false);
    });

    it('returns false (no throw) when the env var is unset', () => {
      expect(() => isAdminEmail('joshua@arbio-group.com')).not.toThrow();
      expect(isAdminEmail('joshua@arbio-group.com')).toBe(false);
    });

    it('returns false when the env var is empty', () => {
      process.env.ADMIN_EMAILS = '';
      expect(isAdminEmail('joshua@arbio-group.com')).toBe(false);
    });

    it('parses multiple comma-separated emails with stray spaces', () => {
      process.env.ADMIN_EMAILS = ' a@x.com ,  b@y.com,c@z.com ';
      expect(isAdminEmail('a@x.com')).toBe(true);
      expect(isAdminEmail('B@Y.com')).toBe(true);
      expect(isAdminEmail('c@z.com')).toBe(true);
    });
  });

  describe('isAdminEmailClient', () => {
    it('reads NEXT_PUBLIC_ADMIN_EMAILS independently of ADMIN_EMAILS', () => {
      process.env.NEXT_PUBLIC_ADMIN_EMAILS = 'client@arbio-group.com';
      // ADMIN_EMAILS deliberately unset.
      expect(isAdminEmailClient('Client@Arbio-Group.com')).toBe(true);
      // The server allowlist must not be consulted here.
      expect(isAdminEmail('client@arbio-group.com')).toBe(false);
    });

    it('returns false when NEXT_PUBLIC_ADMIN_EMAILS is unset', () => {
      process.env.ADMIN_EMAILS = 'server@arbio-group.com';
      expect(isAdminEmailClient('server@arbio-group.com')).toBe(false);
    });
  });
});
