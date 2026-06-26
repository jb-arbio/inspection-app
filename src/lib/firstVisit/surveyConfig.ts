import type { HubScope } from './resolveScope';
import type {
  FieldType,
  FirstVisitQuestion,
  FirstVisitPhase,
} from './questions';

// The "content" half of a survey question: the SAFE fields a non-technical
// editor may freely change without affecting how the survey is wired or where
// its answers map. Structural fields (mode, repeater, pms_target, group_id,
// follow-ups, …) live in the StructureOverlay instead, keyed by slug.
export type ContentQuestion = {
  slug: string;
  label: string;
  description: string | null;
  scope: HubScope;
  type: FieldType;
  options: string[];
  required: boolean;
  multi_select?: boolean;
  allow_custom_options?: boolean;
  phase_id: string;
  phase_label: string;
};

export type ContentPhase = {
  id: string;
  label: string;
  questions: ContentQuestion[];
};

export type ContentConfig = {
  phases: ContentPhase[];
};

// The structural overlay: per-slug patch of the wiring-sensitive fields that
// are NOT editable as content. Composed onto the content question last.
export type OverlayEntry = Partial<
  Pick<
    FirstVisitQuestion,
    | 'mode'
    | 'repeater'
    | 'pms_target'
    | 'status'
    | 'verdict'
    | 'notes'
    | 'group_id'
    | 'follow_up'
    | 'per_option_follow_up'
    | 'anchor_to'
    | 'visible_when'
  >
>;

export type StructureOverlay = Record<string, OverlayEntry>;

// Structural defaults applied before content + overlay, so every question has
// a complete, valid FirstVisitQuestion shape even when the overlay omits a slug.
const STRUCTURAL_DEFAULTS = {
  mode: 'data',
  repeater: false,
  pms_target: null,
  status: 'existing',
  verdict: null,
  notes: null,
} satisfies Pick<
  FirstVisitQuestion,
  'mode' | 'repeater' | 'pms_target' | 'status' | 'verdict' | 'notes'
>;

// Pure composer: combine editable content with the structural overlay into the
// full FirstVisitPhase[] the renderer/progress pipeline consumes. No JSON or
// config-data imports — only types — so callers control all inputs.
export function buildSurveyConfig(
  content: ContentConfig,
  overlay: StructureOverlay,
): FirstVisitPhase[] {
  return content.phases.map((phase) => ({
    id: phase.id,
    label: phase.label,
    questions: phase.questions.map(
      (q): FirstVisitQuestion => ({
        ...STRUCTURAL_DEFAULTS,
        ...q,
        ...(overlay[q.slug] ?? {}),
      }),
    ),
  }));
}
