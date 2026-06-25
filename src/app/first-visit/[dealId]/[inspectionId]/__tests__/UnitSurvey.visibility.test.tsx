import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { UnitSurvey } from '../UnitSurvey';
import { localDb } from '@/lib/firstVisit/db';
import { SurveyConfigProvider } from '@/lib/firstVisit/SurveyConfigContext';
import type { FirstVisitPhase, FirstVisitQuestion } from '@/lib/firstVisit/questions';

const baseQ: FirstVisitQuestion = {
  slug: 'q',
  label: 'Q',
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

// Gate (boolean) controls whether the dependent text field renders.
const phases: FirstVisitPhase[] = [
  {
    id: 'p1',
    label: 'Phase 1',
    questions: [
      { ...baseQ, slug: 'has_balcony', label: 'Is there a balcony?', type: 'boolean' },
      {
        ...baseQ,
        slug: 'balcony_count',
        label: 'Number of balconies',
        visible_when: { question: 'has_balcony', equals: true },
      },
    ],
  },
];

vi.mock('@/lib/firstVisit/questions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/firstVisit/questions')>(
    '@/lib/firstVisit/questions',
  );
  return {
    ...actual,
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

function renderSurvey(p: FirstVisitPhase[]): ReactElement {
  return render(
    <SurveyConfigProvider value={{ phases: p, allQuestions: p.flatMap((x) => x.questions) }}>
      <UnitSurvey
        inspectionId="i1"
        target={{ id: 'tgt-1', label: 'Property A' }}
        scope="location"
        ctx={{ deal_id: 'd1', location_id: 'loc-1' }}
        snapshot={null}
        onBack={vi.fn()}
      />
    </SurveyConfigProvider>,
  ) as unknown as ReactElement;
}

describe('UnitSurvey conditional visibility (visible_when)', () => {
  it('hides a gated question until its controller matches, then reveals it', async () => {
    const user = userEvent.setup();
    renderSurvey(phases);
    await waitFor(() =>
      expect(screen.getByText('Is there a balcony?')).toBeInTheDocument(),
    );
    // Gate unanswered → dependent hidden.
    expect(screen.queryByLabelText('Number of balconies')).toBeNull();

    // Answer the gate Yes → dependent appears.
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Number of balconies')).toBeInTheDocument(),
    );
  });

  it('clears a hidden dependent’s stored value when the gate turns it off', async () => {
    const user = userEvent.setup();
    // Seed: gate=true and dependent already answered.
    await localDb.answers.bulkPut([
      {
        id: 'a-gate',
        inspection_id: 'i1',
        target_id: 'tgt-1',
        scope: 'location',
        location_id: 'loc-1',
        question_key: 'has_balcony',
        area_key: 'p1',
        step_index: null,
        value: true,
        data_point_slug: 'has_balcony',
        was_prefilled: false,
        was_accepted_as_is: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'a-dep',
        inspection_id: 'i1',
        target_id: 'tgt-1',
        scope: 'location',
        location_id: 'loc-1',
        question_key: 'balcony_count',
        area_key: 'p1',
        step_index: null,
        value: '2',
        data_point_slug: 'balcony_count',
        was_prefilled: false,
        was_accepted_as_is: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    renderSurvey(phases);
    await waitFor(() =>
      expect(screen.getByLabelText('Number of balconies')).toBeInTheDocument(),
    );

    // Flip the gate to No → dependent hides AND its stored value is cleared.
    await user.click(screen.getByRole('button', { name: 'No' }));
    await waitFor(() =>
      expect(screen.queryByLabelText('Number of balconies')).toBeNull(),
    );
    await waitFor(async () => {
      const dep = await localDb.answers.get('a-dep');
      expect(dep?.value).toBeNull();
    });
  });
});
