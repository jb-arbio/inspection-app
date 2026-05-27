import type { HubScope } from './resolveScope';

export type FieldType = 'text' | 'number' | 'select' | 'boolean';

export type FirstVisitQuestion = {
  question_key: string;
  // Which hub scope this question is collected at. Drives where in the
  // visit tree it appears and which scope_id its value writes back to.
  scope: HubScope; // 'deal' | 'location' | 'unit_category'
  area_key: string;
  label: string;
  field_type: FieldType;
  choices?: { value: string; label: string }[];
  validation?: { min?: number; max?: number; pattern?: string; required?: boolean };
  data_point_slug?: string;
  evidence?: {
    photo?: 'required' | 'optional';
    video?: 'required' | 'optional';
    audio?: 'optional';
  };
  order: number;
  group?: string;
};

// Dev/sample config — proves all field types + all three scopes render.
// Real list comes from product (mirrors Onboarding_tool src/lib/questions/config.ts).
export const DEV_QUESTIONS: FirstVisitQuestion[] = [
  // deal-scoped — answered once per visit
  {
    question_key: 'owner_present',
    scope: 'deal',
    area_key: 'general',
    label: 'Was the owner present at the visit?',
    field_type: 'boolean',
    order: 1,
  },
  // location-scoped (property) — answered once per property
  {
    question_key: 'wifi_password',
    scope: 'location',
    area_key: 'access',
    label: 'WiFi password',
    field_type: 'text',
    data_point_slug: 'wifi_password',
    order: 1,
    evidence: { photo: 'optional' },
  },
  {
    question_key: 'building_entry',
    scope: 'location',
    area_key: 'access',
    label: 'Building entry type',
    field_type: 'select',
    choices: [
      { value: 'keybox', label: 'Key box' },
      { value: 'smartlock', label: 'Smart lock' },
      { value: 'concierge', label: 'Concierge' },
    ],
    order: 2,
    evidence: { photo: 'required' },
  },
  // unit_category-scoped (unit) — answered once per unit
  {
    question_key: 'beds_count',
    scope: 'unit_category',
    area_key: 'bedroom',
    label: 'Number of beds',
    field_type: 'number',
    data_point_slug: 'beds_count',
    validation: { min: 0, max: 20 },
    order: 1,
  },
  {
    question_key: 'stovetop_type',
    scope: 'unit_category',
    area_key: 'kitchen',
    label: 'Stovetop type',
    field_type: 'select',
    choices: [
      { value: 'induction', label: 'Induction' },
      { value: 'gas', label: 'Gas' },
      { value: 'electric', label: 'Electric (coil/ceramic)' },
    ],
    order: 1,
    evidence: { photo: 'required' },
  },
  {
    question_key: 'smoke_detector_present',
    scope: 'unit_category',
    area_key: 'safety',
    label: 'Smoke detector present and working',
    field_type: 'boolean',
    order: 1,
    evidence: { photo: 'required', video: 'optional' },
  },
];

export function byArea(qs: FirstVisitQuestion[]): Record<string, FirstVisitQuestion[]> {
  const out: Record<string, FirstVisitQuestion[]> = {};
  for (const q of qs) (out[q.area_key] ||= []).push(q);
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.order - b.order);
  return out;
}

export function questionsForScope(
  qs: FirstVisitQuestion[],
  scope: HubScope,
): FirstVisitQuestion[] {
  return qs.filter((q) => q.scope === scope);
}
