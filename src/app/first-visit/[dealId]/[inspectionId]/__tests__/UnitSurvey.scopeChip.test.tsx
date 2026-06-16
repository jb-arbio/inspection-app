import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnitSurvey } from '../UnitSurvey';
import { localDb } from '@/lib/firstVisit/db';
import type { FirstVisitPhase, FirstVisitQuestion } from '@/lib/firstVisit/questions';

// Single phase with one question; phasesForScope ignores scope so we can drive
// the chip purely off the `scope` prop passed to UnitSurvey.
vi.mock('@/lib/firstVisit/questions', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/firstVisit/questions')
  >('@/lib/firstVisit/questions');
  const q: FirstVisitQuestion = {
    slug: 'q1',
    label: 'Maintenance work needed (€)',
    description: null,
    scope: 'unit_category',
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
    { id: 'p1', label: 'Unit walkthrough', questions: [q] },
  ];
  return {
    ...actual,
    phasesForScope: () => phases,
    areaKeyFor: (qq: FirstVisitQuestion) => qq.phase_id,
  };
});

vi.mock('@/lib/firstVisit/sync', () => ({ enqueue: vi.fn(async () => undefined) }));
vi.mock('@/lib/firstVisit/analytics', () => ({ track: vi.fn() }));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(async () => {
  await localDb.answers.clear();
  vi.clearAllMocks();
});

const baseProps = {
  inspectionId: 'i1',
  target: { id: 'tgt-1', label: 'Unit A' },
  ctx: { deal_id: 'd1', location_id: 'loc-1', unit_category_id: 'uc-1' },
  snapshot: null,
  onBack: vi.fn(),
};

describe('UnitSurvey — scope chip on section header', () => {
  it('shows "Unit" for unit_category scope', async () => {
    render(<UnitSurvey {...baseProps} scope="unit_category" />);
    expect(await screen.findByText('Maintenance work needed (€)')).toBeInTheDocument();
    expect(screen.getByText('Unit')).toBeInTheDocument();
  });

  it('shows "Building/Property" for location scope', async () => {
    render(<UnitSurvey {...baseProps} scope="location" />);
    expect(await screen.findByText('Maintenance work needed (€)')).toBeInTheDocument();
    expect(screen.getByText('Building/Property')).toBeInTheDocument();
  });
});
