import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnitSurvey } from '../UnitSurvey';
import { localDb } from '@/lib/firstVisit/db';
import type { FirstVisitPhase, FirstVisitQuestion } from '@/lib/firstVisit/questions';

// Mock questions module so the test is independent of the real config. We expose
// two phases, each with a single (non-required) question. Unlike the lastPhase
// harness, the fake `phasesForScope` RESPECTS the optional phaseIds filter so we
// can assert UnitSurvey forwards it.
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
  const fakePhasesForScope = (_scope: unknown, phaseIds?: string[]) =>
    phaseIds ? phases.filter((p) => phaseIds.includes(p.id)) : phases;
  return {
    ...actual,
    phasesForScope: fakePhasesForScope,
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
    render(<UnitSurvey {...baseProps} phaseIds={['p2']} />);
    expect(await screen.findByText('Question 2')).toBeInTheDocument();
    expect(screen.queryByText('Question 1')).toBeNull();
  });

  it('renders all phases when phaseIds is absent (regression)', async () => {
    render(<UnitSurvey {...baseProps} />);
    expect(await screen.findByText('Question 1')).toBeInTheDocument();
  });
});
