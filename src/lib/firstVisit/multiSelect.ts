// Helpers for multi-select chip pickers and the synthetic question keys used
// by their associated follow-up answers. Kept tiny + framework-free so the
// components and tests can share the same source of truth.

// An option label is "exclusive" when selecting it should deselect everything
// else (and vice versa). Used for "None" / "N/A" / "None required" chips that
// semantically mean "the inspector confirms no value applies here".
//
// We intentionally match the literal labels rather than a heuristic: a chip
// labeled "None of the above" is also exclusive, but "None left in stock" is
// not. WS-C will keep labels short and conventional ("None", "N/A", …) so the
// prefix rule covers the common case without surprise matches.
export function isExclusiveOption(opt: string): boolean {
  if (typeof opt !== 'string') return false;
  const trimmed = opt.trim();
  if (trimmed === 'None' || trimmed === 'N/A' || trimmed === 'None required') {
    return true;
  }
  // "None of the above", "None required" patterns — match leading "None "
  if (/^None\b/i.test(trimmed)) return true;
  return false;
}

// Toggle an option in a multi-select value array with None-exclusive semantics.
// - Tapping an exclusive option replaces value with [opt].
// - Tapping a non-exclusive option drops any exclusive that was previously set.
// - Otherwise it toggles membership normally.
export function toggleOption(value: string[], opt: string): string[] {
  const isExclusive = isExclusiveOption(opt);
  if (isExclusive) {
    // If already the only selected exclusive, deselect it.
    if (value.length === 1 && value[0] === opt) return [];
    return [opt];
  }
  // Non-exclusive tap: drop any exclusive currently in value.
  const withoutExclusive = value.filter((v) => !isExclusiveOption(v));
  if (withoutExclusive.includes(opt)) {
    return withoutExclusive.filter((v) => v !== opt);
  }
  return [...withoutExclusive, opt];
}

// Slugify an option label for use in a synthetic question_key. Keeps a-z, 0-9
// and underscores; collapses runs of separators. Idempotent.
export function slugifyOption(opt: string): string {
  return opt
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Synthetic question_key for the conditional follow-up of a parent question.
export function followUpKey(parentSlug: string): string {
  return `${parentSlug}__follow_up`;
}

// Synthetic question_key for the per-option follow-up tied to a specific
// selected chip on a multi-select parent.
export function perOptionFollowUpKey(parentSlug: string, option: string): string {
  return `${parentSlug}__per_option__${slugifyOption(option)}`;
}
