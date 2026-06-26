import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { UnitSurvey } from '../UnitSurvey';
import { localDb } from '@/lib/firstVisit/db';
import { SurveyConfigProvider } from '@/lib/firstVisit/SurveyConfigContext';
import type { FirstVisitPhase, FirstVisitQuestion } from '@/lib/firstVisit/questions';

// Provide config via the SurveyConfigProvider so the test is independent of the
// real config. We expose two phases, each with a single (non-required)
// question. UnitSurvey reads phases from context and runs the real
// filterPhasesForScope over them, so passing phaseIds still narrows the subset —
// which lets us assert UnitSurvey forwards it.
const baseQ: FirstVisitQuestion = {
  slug: 'q1',
  label: 'Question 1',
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
  phase_id: 'p1',
  phase_label: 'Phase 1',
};
const phases: FirstVisitPhase[] = [
  { id: 'p1', label: 'Phase 1', questions: [{ ...baseQ, slug: 'q1', label: 'Question 1', phase_id: 'p1', phase_label: 'Phase 1' }] },
  { id: 'p2', label: 'Phase 2', questions: [{ ...baseQ, slug: 'q2', label: 'Question 2', phase_id: 'p2', phase_label: 'Phase 2' }] },
];

function renderWithConfig(ui: ReactElement) {
  return render(
    <SurveyConfigProvider value={{ phases, allQuestions: phases.flatMap((p) => p.questions) }}>
      {ui}
    </SurveyConfigProvider>,
  );
}

// areaKeyFor is still imported by UnitSurvey; keep it deterministic for the
// fixture phase ids.
vi.mock('@/lib/firstVisit/questions', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/firstVisit/questions')
  >('@/lib/firstVisit/questions');
  return {
    ...actual,
    areaKeyFor: (q: FirstVisitQuestion) => q.phase_id,
  };
});

vi.mock('@/lib/firstVisit/sync', () => ({
  enqueue: vi.fn(async () => undefined),
}));
vi.mock('@/lib/firstVisit/analytics', () => ({
  track: vi.fn(),
}));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(async () => {
  await localDb.answers.clear();
  vi.clearAllMocks();
});

const baseProps = {
  inspectionId: 'i1',
  target: { id: 'tgt-1', label: 'Property A' },
  scope: 'location' as const,
  ctx: { deal_id: 'd1', location_id: 'loc-1' },
  snapshot: null,
  onBack: vi.fn(),
};

describe('UnitSurvey — optional phase subset', () => {
  it('renders only the filtered phase when phaseIds is set', async () => {
    renderWithConfig(<UnitSurvey {...baseProps} phaseIds={['p2']} />);
    expect(await screen.findByText('Question 2')).toBeInTheDocument();
    expect(screen.queryByText('Question 1')).toBeNull();
  });

  it('renders all phases when phaseIds is absent (regression)', async () => {
    renderWithConfig(<UnitSurvey {...baseProps} />);
    expect(await screen.findByText('Question 1')).toBeInTheDocument();
  });
});
