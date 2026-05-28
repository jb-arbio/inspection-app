import type { FirstVisitQuestion } from '@/lib/firstVisit/questions';

export function makeQuestion(
  overrides: Partial<FirstVisitQuestion> = {},
): FirstVisitQuestion {
  return {
    slug: 'q',
    label: 'Question',
    description: null,
    scope: 'location',
    mode: 'data',
    type: 'text',
    options: [],
    required: false,
    repeater: false,
    pms_target: null,
    status: 'existing',
    verdict: null,
    notes: null,
    phase_id: '1',
    phase_label: 'Phase 1',
    ...overrides,
  };
}
