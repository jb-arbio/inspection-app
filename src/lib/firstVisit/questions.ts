import type { HubScope } from './resolveScope';
import contentJson from '@/data/first-visit-content.json';
import { QUESTION_STRUCTURE } from './questionStructure';
import { buildSurveyConfig, type ContentConfig } from './surveyConfig';

// The survey is composed from two editor/engineer sources of truth:
//   src/data/first-visit-content.json   — editor-safe content (labels, options…)
//   src/lib/firstVisit/questionStructure.ts — engineer-owned structural overlay.
// The legacy XLSX → Python → first-visit-questions.json sync pipeline is retired.

export type FieldType =
  | 'text'
  | 'select'
  | 'boolean'
  | 'number'
  | 'date'
  | 'file'
  | 'repeater';

export type Mode = 'data' | 'observe' | 'measure';
export type Status = 'existing' | 'proposed';

export type FirstVisitQuestion = {
  slug: string;
  label: string;
  description: string | null;
  scope: HubScope;
  mode: Mode;
  type: FieldType;
  options: string[];
  required: boolean;
  repeater: boolean;
  pms_target: string | null;
  status: Status;
  verdict: 'keep' | 'reword' | 'merge' | 'move' | null;
  notes: string | null;
  phase_id: string;
  phase_label: string;
  // Optional block-repeater group identifier. Questions that share a
  // group_id render together inside a repeating block on the survey (e.g.
  // "check-in step", "finding"). Set at load time: injectFindings() stamps
  // group_id:'finding' on the findings fields, and check-in-step questions
  // carry it from the generated config. When undefined the question is a
  // single-instance field and groupIdFor() returns null.
  group_id?: string | null;
  // Renders the question as a chip-style multi-select picker. Combined with
  // `options`, each option becomes a toggleable chip. WS-C will set this on
  // the JSON. Backwards-compatible: when undefined the legacy renderer is used.
  multi_select?: boolean;
  // When `multi_select` is true and this is true, an inline "+ Add custom"
  // input is rendered so the inspector can append free-text options to the
  // picker. The custom strings are stored in `value` exactly like standard
  // options — no separate field. Optional, WS-C populates this.
  allow_custom_options?: boolean;
  // Conditional follow-up field that appears below this question when its
  // value matches `when_value`. Used for boolean Yes/No follow-ups
  // ("Secondary fire exit available?" → "Where?") and select-value follow-ups.
  // Storage: the follow-up text lives as a sibling answer with synthetic
  // question_key `${parent.slug}__follow_up`, same target/area, same
  // step_index as the parent.
  follow_up?: {
    when_value: unknown;
    label: string;
    type: 'text' | 'number';
    required?: boolean;
  };
  // Per-option follow-up renderer for multi-select pickers. For each chip
  // the inspector selects, an inline labeled input appears below the picker
  // using `label_template` with `{option}` substituted. Storage: each
  // option's follow-up lives as a sibling answer with synthetic question_key
  // `${parent.slug}__per_option__${slugify(option)}` (no step_index).
  per_option_follow_up?: {
    label_template: string;
    type: 'text';
    required?: boolean;
  };
  // Slug of another question this one should render under (used by WS-F for
  // media anchoring). Renderer in WS-B does not act on this; it is here so
  // the type is ready for WS-F.
  anchor_to?: string;
  // Conditional visibility gate. When set, this question only renders (and only
  // counts toward required / keeps its value) while `isVisible` is satisfied
  // against the controlling question's current answer. Engineer-owned: lives in
  // the structural overlay (questionStructure.ts), not in editor content.
  visible_when?: VisibleWhen;
};

export type FirstVisitPhase = {
  id: string;
  label: string;
  questions: FirstVisitQuestion[];
};

// PHASES/ALL_QUESTIONS are composed from the editor-safe content JSON and the
// per-slug structural overlay. buildSurveyConfig() applies the structural
// defaults, then content, then the overlay for each question. To change wording
// or options, edit src/data/first-visit-content.json; to change wiring
// (mode/repeater/pms_target/group_id/follow-ups/anchoring), edit
// src/lib/firstVisit/questionStructure.ts.
export const PHASES: FirstVisitPhase[] = buildSurveyConfig(
  contentJson as unknown as ContentConfig,
  QUESTION_STRUCTURE,
);
export const ALL_QUESTIONS: FirstVisitQuestion[] = PHASES.flatMap((p) => p.questions);

// Metadata for the survey config. version/generated_at are declared by the
// content file (the source of truth); counts are recomputed from the composed
// PHASES so they always match what the app renders.
const CONTENT_META = contentJson as unknown as { version?: string; generated_at?: string };
export const CONFIG_META = {
  version: CONTENT_META.version ?? '0000-00-00',
  generated_at: CONTENT_META.generated_at ?? null,
  counts: {
    phases: PHASES.length,
    questions: ALL_QUESTIONS.length,
    existing: ALL_QUESTIONS.filter((q) => q.status === 'existing').length,
    proposed: ALL_QUESTIONS.filter((q) => q.status === 'proposed').length,
    with_verdict: ALL_QUESTIONS.filter((q) => q.verdict).length,
  },
};

// Return phases (in original order) with their questions filtered to a single
// scope. Drops phases that end up empty for the scope. Pure over the supplied
// `phases` so the same logic runs against the bundled PHASES or a config loaded
// at runtime (via SurveyConfigContext / progress.ts).
//
// Optional phase filter: lets the UI render a subset of a scope's phases as its
// own card (e.g. deal phase '1' at the top of the navigator, phase '11' "Deal
// evaluation" at the bottom). Absent = all phases, unchanged behavior.
export function filterPhasesForScope(
  phases: FirstVisitPhase[],
  scope: HubScope,
  phaseIds?: string[],
): FirstVisitPhase[] {
  const out = phases
    .map((p) => ({ ...p, questions: p.questions.filter((q) => q.scope === scope) }))
    .filter((p) => p.questions.length > 0);
  if (!phaseIds) return out;
  const wanted = new Set(phaseIds);
  return out.filter((p) => wanted.has(p.id));
}

// Convenience wrapper over the bundled PHASES config.
export function phasesForScope(scope: HubScope, phaseIds?: string[]): FirstVisitPhase[] {
  return filterPhasesForScope(PHASES, scope, phaseIds);
}

export function questionsForScope(scope: HubScope): FirstVisitQuestion[] {
  return ALL_QUESTIONS.filter((q) => q.scope === scope);
}

// The DB column for this answer's grouping is `area_key`; we use the phase_id
// as that grouping. Centralised so write paths stay in sync with the config.
export function areaKeyFor(q: FirstVisitQuestion): string {
  return q.phase_id;
}

// Returns the block-repeater group this question belongs to, or null when the
// question is not part of a repeater. `group_id` is set by injectFindings
// (group_id:'finding') and on check-in-step questions; questions outside any
// repeater leave it null. Callers can treat null as "single instance, no
// step_index needed".
export function groupIdFor(q: FirstVisitQuestion): string | null {
  return q.group_id ?? null;
}

// Whether a question counts toward the SCOPE-level required denominator (the
// progress ring, the submit-dialog "unanswered required" list, section-complete
// dots, skip-to-incomplete). Repeater-group members (any `group_id`) are
// `required:true` only WITHIN a populated block — that rule is enforced in the
// block UI, not here. A unit/building with zero findings blocks is perfectly
// valid, so a required findings field must never make the scope ring
// uncompletable. Single source of truth for the rule across progress.ts and
// UnitSurvey.tsx.
export function isScopeLevelRequired(q: FirstVisitQuestion): boolean {
  return q.required && !q.group_id;
}

// WS-F media anchoring: photo/video file questions opt into rendering inline
// underneath their related data question by setting `anchor_to: <slug>` in
// the JSON config. The two helpers below let UnitSurvey pull anchored
// questions out of their original phase and inline them under the anchor.
//
// `buildAnchorMap` collects file questions keyed by their anchor's slug.
// `filterOutAnchored` removes anchored questions from their original phase
// (only when the anchor target also exists in the same scope — orphans stay
// put so they aren't silently dropped). Phases that empty out are removed,
// matching `phasesForScope`'s behaviour.
export function buildAnchorMap(
  questions: FirstVisitQuestion[],
): Map<string, FirstVisitQuestion[]> {
  const all = new Set(questions.map((q) => q.slug));
  const map = new Map<string, FirstVisitQuestion[]>();
  for (const q of questions) {
    const target = q.anchor_to;
    if (!target) continue;
    if (!all.has(target)) continue; // orphan — leave in place
    const bucket = map.get(target);
    if (bucket) bucket.push(q);
    else map.set(target, [q]);
  }
  return map;
}

export function filterOutAnchored(
  phases: FirstVisitPhase[],
  anchoredSlugs: Set<string>,
): FirstVisitPhase[] {
  return phases
    .map((p) => ({
      ...p,
      questions: p.questions.filter((q) => !anchoredSlugs.has(q.slug)),
    }))
    .filter((p) => p.questions.length > 0);
}

// Declarative conditional-branching predicate. A question's `visible_when` rule
// names a controlling question (by slug) and a condition over that question's
// answer; `isVisible` decides whether the dependent question should render,
// count toward required, and keep its value. Pure predicate.
//
// `answersByKey` maps controlling question slug → its current answer value
// (string, boolean, or string[] for multi-selects). Unanswered controllers:
// equals/in are NOT satisfied (hidden); not_equals/not_in are NOT excluded
// (visible). Comparisons are strict (`===`), so booleans compare by identity.
export type VisibleWhen = {
  question: string;
  equals?: unknown;
  not_equals?: unknown;
  in?: unknown[];
  not_in?: unknown[];
};

// A single answer matches `candidate` if it equals it, or — for multi-select
// answers (arrays) — if any selected option equals it.
function matchesValue(answer: unknown, candidate: unknown): boolean {
  if (Array.isArray(answer)) return answer.some((v) => v === candidate);
  return answer === candidate;
}
// As above but against a list: true if the answer (or any selected option) is
// in `list`.
function inList(answer: unknown, list: unknown[]): boolean {
  if (Array.isArray(answer)) return answer.some((v) => list.includes(v));
  return list.includes(answer);
}

export function isVisible(
  rule: VisibleWhen | undefined,
  answersByKey: Map<string, unknown>,
): boolean {
  if (!rule) return true;
  const answered = answersByKey.has(rule.question);
  const a = answersByKey.get(rule.question);
  if ('equals' in rule && rule.equals !== undefined) {
    return answered && matchesValue(a, rule.equals);
  }
  if ('in' in rule && rule.in) {
    return answered && inList(a, rule.in);
  }
  if ('not_equals' in rule && rule.not_equals !== undefined) {
    return !answered || !matchesValue(a, rule.not_equals);
  }
  if ('not_in' in rule && rule.not_in) {
    return !answered || !inList(a, rule.not_in);
  }
  return true;
}
