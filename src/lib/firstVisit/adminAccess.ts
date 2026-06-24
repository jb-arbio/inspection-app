// Admin gating in this app is by an env allowlist — there is no admin role.
// The server route enforces the real gate via `isAdminEmail` (reads the
// server-only ADMIN_EMAILS). `isAdminEmailClient` reads the client-exposed
// NEXT_PUBLIC_ADMIN_EMAILS and is used ONLY to show/hide the Edit button.

/**
 * Parse a comma-separated allowlist into a normalised Set.
 * Splits on commas, trims, lowercases, and drops empty entries.
 * Exported for testing.
 */
export function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

function isInAllowlist(
  email: string | null | undefined,
  raw: string | undefined,
): boolean {
  if (!email) return false;
  const normalised = email.trim().toLowerCase();
  if (!normalised) return false;
  return parseAllowlist(raw).has(normalised);
}

/**
 * True iff `email` is in the server-side ADMIN_EMAILS allowlist.
 * False for null/undefined/empty email or when the env var is unset/empty.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return isInAllowlist(email, process.env.ADMIN_EMAILS);
}

/**
 * Client-safe variant reading NEXT_PUBLIC_ADMIN_EMAILS. Used only to
 * show/hide UI; the server enforces the real gate via `isAdminEmail`.
 */
export function isAdminEmailClient(email: string | null | undefined): boolean {
  return isInAllowlist(email, process.env.NEXT_PUBLIC_ADMIN_EMAILS);
}
