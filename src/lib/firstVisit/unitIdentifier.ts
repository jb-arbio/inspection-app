export type IdentifierResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' | 'duplicate' };

export function validateUnitIdentifier(raw: string, existingSiblings: string[]): IdentifierResult {
  const value = raw.trim();
  if (!value) return { ok: false, reason: 'empty' };
  const norm = value.toLowerCase();
  if (existingSiblings.some((s) => s.trim().toLowerCase() === norm)) return { ok: false, reason: 'duplicate' };
  return { ok: true, value };
}
