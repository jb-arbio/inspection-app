import { z } from 'zod';

// Per-row form validation for the survey content editor. This mirrors the
// shape rules in `validateSurveyContent.ts` (which validates the WHOLE config at
// publish time) but scoped to ONE editable question, so react-hook-form can give
// instant per-row feedback as the editor types.
//
// FIELD_TYPES / HUB_SCOPES / SLUG_RE are NOT exported by validateSurveyContent
// (they're module-private there), so they are redefined here and MUST be kept in
// sync with that file.

// Mirrors `FIELD_TYPES` in validateSurveyContent.ts (and `FieldType` in questions.ts).
export const FIELD_TYPES = [
  'text',
  'select',
  'boolean',
  'number',
  'date',
  'file',
  'repeater',
] as const;

// Mirrors `HUB_SCOPES` in validateSurveyContent.ts (and `HubScope` in resolveScope.ts).
export const HUB_SCOPES = ['deal', 'location', 'unit_category'] as const;

// Mirrors `SLUG_RE` in validateSurveyContent.ts: starts with a letter, then
// letters (either case), digits, underscores or dots — covering both snake_case
// `fv_*` slugs and camelCase dotted slugs like `appliance.availabilityType`.
export const SLUG_RE = /^[A-Za-z][A-Za-z0-9_.]*$/;

export const questionEditorSchema = z
  .object({
    slug: z
      .string()
      .regex(
        SLUG_RE,
        'lowercase/camelCase letters, digits, _ or . ; must start with a letter',
      ),
    label: z.string().min(1, 'label required'),
    description: z.string().nullable(),
    type: z.enum(FIELD_TYPES),
    scope: z.enum(HUB_SCOPES),
    options: z.array(z.string()),
    required: z.boolean(),
    multi_select: z.boolean().optional(),
    allow_custom_options: z.boolean().optional(),
    phase_id: z.string().min(1),
    phase_label: z.string().min(1),
  })
  .superRefine((q, ctx) => {
    // A `select` question — or any question flagged multi_select — must offer at
    // least one option (mirrors the select/multi_select rule in
    // validateSurveyContent.ts).
    if (
      (q.type === 'select' || q.multi_select === true) &&
      q.options.length === 0
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'select / multi-select needs at least one option',
      });
    }
  });

export type QuestionEditorValues = z.infer<typeof questionEditorSchema>;
