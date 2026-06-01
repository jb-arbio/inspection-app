import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnitSurvey } from '../UnitSurvey';
import { localDb } from '@/lib/firstVisit/db';
import type { FirstVisitPhase, FirstVisitQuestion } from '@/lib/firstVisit/questions';

// Mock questions module so the test is independent of the real config and
// the parallel-agent edits in src/lib/firstVisit/questions.ts. We expose two
// phases each with a single (non-required) question so isFirst / isLast are
// deterministic and no required-question gating is hit.
vi.mock('@/lib/firstVisit/questions', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/firstVisit/questions')
  >('@/lib/firstVisit/questions');
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
  return {
    ...actual,
    phasesForScope: () => phases,
    areaKeyFor: (q: FirstVisitQuestion) => q.phase_id,
  };
});

// Avoid touching the real sync queue / analytics in the test.
vi.mock('@/lib/firstVisit/sync', () => ({
  enqueue: vi.fn(async () => undefined),
}));
vi.mock('@/lib/firstVisit/analytics', () => ({
  track: vi.fn(),
}));

// scrollIntoView is not implemented in jsdom.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(async () => {
  await localDb.answers.clear();
  vi.clearAllMocks();
});

function renderSurvey(onBack = vi.fn()) {
  render(
    <UnitSurvey
      inspectionId="i1"
      target={{ id: 'tgt-1', label: 'Property A' }}
      scope="location"
      ctx={{ deal_id: 'd1', location_id: 'loc-1' }}
      snapshot={null}
      onBack={onBack}
    />,
  );
  return { onBack };
}

describe('UnitSurvey — last-phase Done button', () => {
  it('shows "Next →" on the first phase and does not call onBack', async () => {
    const { onBack } = renderSurvey();
    await waitFor(() => expect(screen.getAllByText('Phase 1').length).toBeGreaterThan(0));

    const nextBtn = screen.getByRole('button', { name: /Next/ });
    expect(nextBtn).toBeInTheDocument();
    expect(nextBtn).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: /Done/ })).toBeNull();

    await userEvent.click(nextBtn);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('shows "Done" button on the last phase and clicking it calls onBack', async () => {
    const { onBack } = renderSurvey();
    await waitFor(() => expect(screen.getAllByText('Phase 1').length).toBeGreaterThan(0));

    // Advance to phase 2 (the last phase).
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(screen.getAllByText('Phase 2').length).toBeGreaterThan(0));

    const doneBtn = screen.getByRole('button', { name: /Done/ });
    expect(doneBtn).toBeInTheDocument();
    expect(doneBtn).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: /^Next/ })).toBeNull();

    await userEvent.click(doneBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
