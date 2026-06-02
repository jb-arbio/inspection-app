import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UnitSurvey } from '../UnitSurvey';
import { localDb } from '@/lib/firstVisit/db';
import type { FirstVisitPhase, FirstVisitQuestion } from '@/lib/firstVisit/questions';

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

// Two scenarios: (1) all questions have group_id=null → renders flat as before.
// (2) one phase has a group of two questions → renders inside a StepGroup block.
const phasesFlat: FirstVisitPhase[] = [
  {
    id: 'p1',
    label: 'Phase 1',
    questions: [
      { ...baseQ, slug: 'q1', label: 'Plain question 1' },
      { ...baseQ, slug: 'q2', label: 'Plain question 2' },
    ],
  },
];

const phasesGrouped: FirstVisitPhase[] = [
  {
    id: 'p1',
    label: 'Phase 1',
    questions: [
      { ...baseQ, slug: 'g1', label: 'Step description', group_id: 'check_in_step' },
      { ...baseQ, slug: 'g2', label: 'Step duration', group_id: 'check_in_step' },
      { ...baseQ, slug: 'flat', label: 'Flat after group' },
    ],
  },
];

let activePhases: FirstVisitPhase[] = phasesFlat;

vi.mock('@/lib/firstVisit/questions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/firstVisit/questions')>(
    '@/lib/firstVisit/questions',
  );
  return {
    ...actual,
    phasesForScope: () => activePhases,
    areaKeyFor: (q: FirstVisitQuestion) => q.phase_id,
    groupIdFor: (q: FirstVisitQuestion) => q.group_id ?? null,
  };
});

vi.mock('@/lib/firstVisit/sync', () => ({ enqueue: vi.fn(async () => undefined) }));
vi.mock('@/lib/firstVisit/analytics', () => ({ track: vi.fn() }));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.confirm = vi.fn(() => true);
});

afterEach(async () => {
  await localDb.answers.clear();
  vi.clearAllMocks();
});

function renderSurvey() {
  render(
    <UnitSurvey
      inspectionId="i1"
      target={{ id: 'tgt-1', label: 'Property A' }}
      scope="location"
      ctx={{ deal_id: 'd1', location_id: 'loc-1' }}
      snapshot={null}
      onBack={vi.fn()}
    />,
  );
}

describe('UnitSurvey render plan', () => {
  it('renders flat questions identically when all group_id are null', async () => {
    activePhases = phasesFlat;
    renderSurvey();
    await waitFor(() =>
      expect(screen.getByLabelText('Plain question 1')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Plain question 2')).toBeInTheDocument();
    // No "+ Add step" button — no groups in this scenario.
    expect(screen.queryByRole('button', { name: '+ Add step' })).toBeNull();
  });

  it('renders grouped questions inside a Step block with "+ Add step"', async () => {
    activePhases = phasesGrouped;
    renderSurvey();
    await waitFor(() => expect(screen.getByText('Step 1')).toBeInTheDocument());
    // Group's two questions inside the block.
    expect(screen.getByLabelText('Step description')).toBeInTheDocument();
    expect(screen.getByLabelText('Step duration')).toBeInTheDocument();
    // Flat question after group still renders.
    expect(screen.getByLabelText('Flat after group')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add step' })).toBeInTheDocument();
  });
});
