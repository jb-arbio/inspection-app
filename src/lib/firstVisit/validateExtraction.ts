// The load-bearing safety net. Nothing downstream (Dexie, the answers API)
// validates answer values against their question's allowed options, so this is
// where we guarantee the model's output is well-formed before it ever becomes a
// suggestion: off-enum values are nulled, numbers coerced, junk dropped.
import { buildExtractionSchema, questionForSlug } from './extractionSchema';
import type { FirstVisitQuestion } from './questions';

export type AiField = { value: unknown; confidence: number | null };
export type AiExtractedItem = { group_id: string; fields: Record<string, AiField> };
export type ValidatedExtraction = {
  singles: Record<string, AiField>;
  items: AiExtractedItem[];
  warnings: string[];
};

function clampConfidence(c: unknown): number | null {
  if (typeof c !== 'number' || !Number.isFinite(c)) return null;
  return Math.max(0, Math.min(1, c));
}

function normalizeValue(
  q: FirstVisitQuestion,
  raw: unknown,
  warnings: string[],
): unknown {
  if (raw === null || raw === undefined) return null;

  if (q.type === 'select' && q.multi_select) {
    if (!Array.isArray(raw)) return null;
    const kept = raw.filter((v) => typeof v === 'string' && q.options.includes(v));
    if (kept.length !== raw.length) warnings.push(`${q.slug}: dropped off-list option(s)`);
    return kept.length ? kept : null;
  }
  if (q.type === 'select') {
    if (typeof raw !== 'string' || !q.options.includes(raw)) {
      if (raw !== '' && raw != null) warnings.push(`${q.slug}: dropped off-list value`);
      return null;
    }
    return raw;
  }
  if (q.type === 'number') {
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (q.type === 'boolean') {
    return typeof raw === 'boolean' ? raw : null;
  }
  // text, date, or option-less select → trimmed string.
  const s = String(raw).trim();
  return s || null;
}

function validateField(
  slug: string,
  entry: unknown,
  warnings: string[],
): AiField | null {
  const q = questionForSlug(slug);
  if (!q || q.type === 'file') return null;
  const obj = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
  return {
    value: normalizeValue(q, obj.value, warnings),
    confidence: clampConfidence(obj.confidence),
  };
}

// Validate the raw model output against the targeted slugs. Returns only valid,
// normalized suggestions; everything off-spec is nulled or dropped, with a
// warning trail for observability.
export function validateExtraction(
  parsed: unknown,
  targetSlugs: string[],
): ValidatedExtraction {
  const { singleSlugs, groupSlugsByGroup } = buildExtractionSchema(targetSlugs);
  const warnings: string[] = [];
  const root = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;

  const singles: Record<string, AiField> = {};
  const rawSingles = (root.singles && typeof root.singles === 'object'
    ? root.singles
    : {}) as Record<string, unknown>;
  for (const slug of singleSlugs) {
    const f = validateField(slug, rawSingles[slug], warnings);
    if (f) singles[slug] = f;
  }

  const items: AiExtractedItem[] = [];
  const rawItems = Array.isArray(root.items) ? root.items : [];
  for (const raw of rawItems) {
    const it = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const group = typeof it.group_id === 'string' ? it.group_id : '';
    const groupSlugs = groupSlugsByGroup[group];
    if (!groupSlugs) {
      warnings.push(`item dropped: unknown group "${group}"`);
      continue;
    }
    const rawFields = (it.fields && typeof it.fields === 'object'
      ? it.fields
      : {}) as Record<string, unknown>;
    const fields: Record<string, AiField> = {};
    for (const slug of groupSlugs) {
      const f = validateField(slug, rawFields[slug], warnings);
      if (f) fields[slug] = f;
    }
    // Drop an item that lost its required identity (e.g. finding_item_name /
    // appliance name) or that carries no usable value at all.
    const nameSlug = groupSlugs.find((s) => {
      const q = questionForSlug(s);
      return q?.required && q.type === 'text';
    });
    const hasName = nameSlug ? fields[nameSlug]?.value != null : true;
    const anyValue = Object.values(fields).some((f) => f.value != null);
    if (!hasName || !anyValue) continue;

    items.push({ group_id: group, fields });
  }

  return { singles, items, warnings };
}
