// Build the OpenAI structured-output JSON schema (and a human-readable field
// catalogue) for a SCOPED set of question slugs — the fields one section-voice
// prompt is allowed to fill. The schema is derived live from ALL_QUESTIONS so it
// can never drift from the survey config.
//
// Shape returned to the model:
//   { singles: { <slug>: { value, confidence } },
//     items:   [ { group_id, fields: { <slug>: { value, confidence } } } ] }
//
// - "singles"  = single-instance fields (no group_id).
// - "items"    = repeater rows; one item per distinct object/issue. `fields`
//                carries the union of all targeted repeater slugs (all nullable);
//                validateExtraction keeps only those belonging to the chosen
//                group_id.
//
// `type: 'file'` fields and unknown slugs are skipped (media is captured, not
// dictated).
import { ALL_QUESTIONS, groupIdFor } from './questions';
import type { FirstVisitQuestion } from './questions';

// First question wins per slug. Field shape (type/options) is identical across
// scope duplicates (e.g. finding_* exists at unit_category and location), so the
// schema is scope-agnostic; the client resolves scope at write time.
export function buildBySlug(questions: FirstVisitQuestion[]): Map<string, FirstVisitQuestion> {
  const m = new Map<string, FirstVisitQuestion>();
  for (const q of questions) if (!m.has(q.slug)) m.set(q.slug, q);
  return m;
}

// Default map over the bundled config. Injecting a different question set (e.g.
// a survey loaded from the hub) builds a fresh map; existing zero-arg callers
// keep using this one — zero behavior change.
const DEFAULT_BY_SLUG = buildBySlug(ALL_QUESTIONS);

export function questionForSlug(
  slug: string,
  bySlug: Map<string, FirstVisitQuestion> = DEFAULT_BY_SLUG,
): FirstVisitQuestion | undefined {
  return bySlug.get(slug);
}

// A field is voice-fillable when it exists and is not a media (file) capture.
export function isFillableSlug(
  slug: string,
  bySlug: Map<string, FirstVisitQuestion> = DEFAULT_BY_SLUG,
): boolean {
  const q = bySlug.get(slug);
  return !!q && q.type !== 'file';
}

type JsonSchema = Record<string, unknown>;

// JSON-schema fragment for a single field's `value`, constrained to its type and
// (for selects) its allowed options. Always nullable so the model can decline.
function valueSchema(q: FirstVisitQuestion): JsonSchema {
  if (q.type === 'select' && q.multi_select && q.options.length > 0) {
    // Fields that allow custom options must NOT be enum-locked — the inspector
    // (and voice) can add new chips, so accept any string array.
    if (q.allow_custom_options) return { type: ['array', 'null'], items: { type: 'string' } };
    return { type: ['array', 'null'], items: { type: 'string', enum: q.options } };
  }
  if (q.type === 'select' && q.options.length > 0) {
    return { type: ['string', 'null'], enum: [...q.options, null] };
  }
  if (q.type === 'number') return { type: ['number', 'null'] };
  if (q.type === 'boolean') return { type: ['boolean', 'null'] };
  // text, date, or an option-less select → free string.
  return { type: ['string', 'null'] };
}

// { value, confidence } wrapper, strict-mode compliant (all keys required,
// additionalProperties false).
function fieldEntrySchema(q: FirstVisitQuestion): JsonSchema {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['value', 'confidence'],
    properties: {
      value: valueSchema(q),
      confidence: { type: ['number', 'null'] },
    },
  };
}

function objectOf(slugs: string[], bySlug: Map<string, FirstVisitQuestion>): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  for (const slug of slugs) {
    const q = bySlug.get(slug);
    if (q) properties[slug] = fieldEntrySchema(q);
  }
  return {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}

export type ExtractionSchema = {
  schema: JsonSchema;
  singleSlugs: string[];
  groupSlugsByGroup: Record<string, string[]>;
  catalogue: string;
};

// Partition target slugs into single fields vs repeater groups and build the
// strict JSON schema + a human-readable catalogue for the user prompt.
export function buildExtractionSchema(
  targetSlugs: string[],
  questions: FirstVisitQuestion[] = ALL_QUESTIONS,
): ExtractionSchema {
  // Reuse the prebuilt default map for the common (bundled-config) path; only
  // build a fresh one when an injected question set is supplied.
  const bySlug = questions === ALL_QUESTIONS ? DEFAULT_BY_SLUG : buildBySlug(questions);
  const singleSlugs: string[] = [];
  const groupSlugsByGroup: Record<string, string[]> = {};

  for (const slug of targetSlugs) {
    const q = bySlug.get(slug);
    if (!q || q.type === 'file') continue; // skip unknown + media
    const group = groupIdFor(q);
    if (group) (groupSlugsByGroup[group] ??= []).push(slug);
    else singleSlugs.push(slug);
  }

  const groupIds = Object.keys(groupSlugsByGroup);
  const allGroupSlugs = groupIds.flatMap((g) => groupSlugsByGroup[g]);

  // Repeater item schema. When no groups are targeted, items is an array of
  // empty objects (the model returns []); strict mode needs a valid item shape.
  const itemSchema: JsonSchema = groupIds.length
    ? {
        type: 'object',
        additionalProperties: false,
        required: ['group_id', 'fields'],
        properties: {
          group_id: { type: 'string', enum: groupIds },
          fields: objectOf(allGroupSlugs, bySlug),
        },
      }
    : { type: 'object', additionalProperties: false, properties: {}, required: [] };

  const schema: JsonSchema = {
    type: 'object',
    additionalProperties: false,
    // strict mode requires every declared property to be listed in `required`;
    // `summary` is nullable so the model may return null for an empty clip.
    required: ['singles', 'items', 'summary'],
    properties: {
      singles: objectOf(singleSlugs, bySlug),
      items: { type: 'array', items: itemSchema },
      // A concise qualitative recap of the clip, stored ALONGSIDE the structured
      // fields (see validateExtraction / writeAiSuggestions). Rides this same
      // gpt call — no extra request.
      summary: { type: ['string', 'null'] },
    },
  };

  return {
    schema,
    singleSlugs,
    groupSlugsByGroup,
    catalogue: buildCatalogue(singleSlugs, groupSlugsByGroup, bySlug),
  };
}

function describe(q: FirstVisitQuestion): string {
  // The question's own description defines its terms (e.g. what an enum value
  // means) — feeding it to the model is the systematic accuracy lever, applied
  // to every field that has one rather than hand-tuned per section.
  const desc = q.description?.trim() ? ` (${q.description.trim()})` : '';
  const allowed =
    q.type === 'select' && q.options.length
      ? ` — allowed: ${q.options.join(' | ')}${q.multi_select ? ' (one or more)' : ''}`
      : q.type === 'number'
        ? ' — a number'
        : q.type === 'boolean'
          ? ' — true/false'
          : '';
  return `  - ${q.slug}: "${q.label}"${desc}${allowed}`;
}

function buildCatalogue(
  singleSlugs: string[],
  groupSlugsByGroup: Record<string, string[]>,
  bySlug: Map<string, FirstVisitQuestion>,
): string {
  const lines: string[] = [];
  if (singleSlugs.length) {
    lines.push('Single fields (fill at most once):');
    for (const s of singleSlugs) {
      const q = bySlug.get(s);
      if (q) lines.push(describe(q));
    }
  }
  for (const [group, slugs] of Object.entries(groupSlugsByGroup)) {
    lines.push(`Repeating item group "${group}" (one item per distinct object/issue):`);
    for (const s of slugs) {
      const q = bySlug.get(s);
      if (q) lines.push(describe(q));
    }
  }
  return lines.join('\n');
}
