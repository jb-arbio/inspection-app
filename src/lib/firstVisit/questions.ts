export type FieldType = 'text' | 'number' | 'select' | 'boolean';

export type FirstVisitQuestion = {
  question_key: string;
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

// Dev/sample config — proves all field types render. Real list comes from product.
export const DEV_QUESTIONS: FirstVisitQuestion[] = [
  {
    question_key: 'wifi_password',
    area_key: 'access',
    label: 'WiFi password',
    field_type: 'text',
    data_point_slug: 'wifi_password',
    order: 1,
    evidence: { photo: 'optional' },
  },
  {
    question_key: 'beds_count',
    area_key: 'bedroom',
    label: 'Number of beds',
    field_type: 'number',
    data_point_slug: 'beds_count',
    validation: { min: 0, max: 20 },
    order: 1,
  },
  {
    question_key: 'stovetop_type',
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
