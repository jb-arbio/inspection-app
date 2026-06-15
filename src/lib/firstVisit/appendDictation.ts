// Merge a freshly transcribed snippet onto the existing field text. Dictations
// stack at the end with a single separating space; blanks are no-ops. Never
// overwrites — the inspector's prior text (typed or dictated) is preserved.
export function appendDictation(existing: string, addition: string): string {
  const add = addition.trim();
  if (!add) return existing;
  const base = existing.trimEnd();
  if (!base) return add;
  return `${base} ${add}`;
}
