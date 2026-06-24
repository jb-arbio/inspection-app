import { z } from 'zod';
import type { ContentConfig, ContentQuestion, StructureOverlay } from './surveyConfig';

// The set of valid field types, mirroring `FieldType` in questions.ts. Kept as a
// literal tuple so zod can enforce it and we can reuse it in error messages.
const FIELD_TYPES = [
  'text',
  'select',
  'boolean',
  'number',
  'date',
  'file',
  'repeater',
] as const;

// The set of valid hub scopes, mirroring `HubScope` in resolveScope.ts.
const HUB_SCOPES = ['deal', 'location', 'unit_category'] as const;

// Slugs are lowercase, start with a letter, and may contain letters, digits,
// underscores and dots (matching the dotted slugs used across the config).
const SLUG_RE = /^[a-z][a-z0-9_.]*$/;

// zod shape for a single content question. Validation here is purely about the
// SHAPE of one row; cross-row and structural rules are handled imperatively
// below so we can produce slug-aware, human-readable messages.
const questionShape = z.object({
  slug: z.string().regex(SLUG_RE),
  label: z.string().min(1),
  // description may be null or any string — not part of the shape rules.
  type: z.enum(FIELD_TYPES),
  scope: z.enum(HUB_SCOPES),
  options: z.array(z.string()),
  required: z.boolean(),
  phase_id: z.string().min(1),
  phase_label: z.string().min(1),
});

/**
 * Validate the editable survey content together with its structural overlay.
 *
 * Returns a flat list of human-readable error strings (each naming the offending
 * slug/phase) plus an `ok` convenience flag. An empty `errors` array means the
 * config is valid.
 *
 * Rules enforced:
 *  - each question matches the zod shape above (slug pattern, non-empty label,
 *    valid type/scope, options is string[], required boolean, non-empty phase
 *    id/label);
 *  - no duplicate slug appears anywhere across all phases;
 *  - a `select` question — or any question with `multi_select: true` — must have
 *    a non-empty `options` array;
 *  - every overlay key must correspond to a slug that exists in the content;
 *  - repeater groups: a question whose overlay entry carries a `group_id` is a
 *    repeater member. We require AT LEAST 2 questions to share any given
 *    `group_id` — a lone member is treated as a likely authoring mistake, since
 *    a repeater group with a single field provides no grouping value.
 */
export function validateSurveyContent(
  content: ContentConfig,
  overlay: StructureOverlay,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  const allQuestions: ContentQuestion[] = content.phases.flatMap(
    (phase) => phase.questions,
  );

  // 1. Per-row shape validation + select/multi_select options checks.
  const seenSlugs = new Set<string>();
  for (const q of allQuestions) {
    const result = questionShape.safeParse(q);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || '(root)';
        errors.push(
          `question "${q.slug ?? '(missing slug)'}" in phase "${
            q.phase_id ?? '?'
          }" failed validation: ${field} — ${issue.message}`,
        );
      }
    }

    // Duplicate slug detection.
    if (typeof q.slug === 'string') {
      if (seenSlugs.has(q.slug)) {
        errors.push(`duplicate slug "${q.slug}"`);
      } else {
        seenSlugs.add(q.slug);
      }
    }

    // select / multi_select must have options.
    const needsOptions = q.type === 'select' || q.multi_select === true;
    const hasOptions = Array.isArray(q.options) && q.options.length > 0;
    if (needsOptions && !hasOptions) {
      const reason = q.multi_select === true ? 'multi_select' : 'select';
      errors.push(
        `question "${q.slug}" is ${reason} but has empty options`,
      );
    }
  }

  // 2. Overlay keys must reference known slugs.
  for (const slug of Object.keys(overlay)) {
    if (!seenSlugs.has(slug)) {
      errors.push(`overlay references unknown slug "${slug}"`);
    }
  }

  // 3. Repeater group membership: count members per group_id, flag lone members.
  const groupMembers = new Map<string, string[]>();
  for (const [slug, entry] of Object.entries(overlay)) {
    const groupId = entry?.group_id;
    if (typeof groupId === 'string' && groupId.length > 0) {
      const members = groupMembers.get(groupId) ?? [];
      members.push(slug);
      groupMembers.set(groupId, members);
    }
  }
  for (const [groupId, members] of groupMembers) {
    if (members.length < 2) {
      errors.push(
        `repeater group "${groupId}" has only one member (slug "${members[0]}")`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
