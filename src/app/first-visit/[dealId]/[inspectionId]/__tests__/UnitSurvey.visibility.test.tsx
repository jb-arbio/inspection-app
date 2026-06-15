import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UnitSurvey } from '../UnitSurvey';
import { localDb } from '@/lib/firstVisit/db';
import { enqueue } from '@/lib/firstVisit/sync';
import type { FirstVisitPhase, FirstVisitQuestion } from '@/lib/firstVisit/questions';

// Conditional-branching fixture: a boolean controller (`ctrl`) gates a dependent
// text question (`dep`) via visible_when. When the controller is true the
// dependent renders; when false it is hidden AND its stored value is cleared.

const baseQ: FirstVisitQuestion = {
  slug: 'placeholder',
  label: 'placeholder',
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

const ctrlQ: FirstVisitQuestion = {
  ...baseQ,
  slug: 'ctrl',
  label: 'Has secondary fire exit?',
  type: 'boolean',
};

const depQ: FirstVisitQuestion = {
  ...baseQ,
  slug: 'dep',
  label: 'Where is the fire exit?',
  type: 'text',
  visible_when: { question: 'ctrl', equals: true },
};

const phases: FirstVisitPhase[] = [
  { id: 'p1', label: 'Phase 1', questions: [ctrlQ, depQ] },
];

vi.mock('@/lib/firstVisit/questions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/firstVisit/questions')>(
    '@/lib/firstVisit/questions',
  );
  return {
    ...actual,
    phasesForScope: () => phases.map((p) => ({ ...p, questions: [...p.questions] })),
    areaKeyFor: (q: FirstVisitQuestion) => q.phase_id,
    groupIdFor: (q: FirstVisitQuestion) => q.group_id ?? null,
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

function renderSurvey() {
  return render(
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

// Seed an answer row directly into Dexie under the keying UnitSurvey uses on
// load: target_id::area_key::question_key, step_index null.
async function seedAnswer(slug: string, areaKey: string, value: unknown) {
  await localDb.answers.put({
    id: `${slug}-id`,
    inspection_id: 'i1',
    target_id: 'tgt-1',
    scope: 'location',
    location_id: 'loc-1',
    question_key: slug,
    area_key: areaKey,
    step_index: null,
    value,
    data_point_slug: slug,
    was_prefilled: false,
    was_accepted_as_is: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

describe('UnitSurvey — conditional branching (visible_when)', () => {
  it('hides the dependent when the controller is "No", shows it when "Yes"', async () => {
    await seedAnswer('ctrl', 'p1', false);
    renderSurvey();

    // Controller always renders.
    await waitFor(() =>
      expect(screen.getByLabelText('Has secondary fire exit?')).toBeInTheDocument(),
    );
    // Dependent is hidden while controller = false.
    expect(screen.queryByLabelText('Where is the fire exit?')).toBeNull();

    // Flip the controller to Yes.
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    // Dependent now renders.
    await waitFor(() =>
      expect(screen.getByLabelText('Where is the fire exit?')).toBeInTheDocument(),
    );
  });

  it('clears the dependent answer when the controller flips to a hiding value', async () => {
    // Controller = true and dependent already answered.
    await seedAnswer('ctrl', 'p1', true);
    await seedAnswer('dep', 'p1', 'Through the back staircase');
    renderSurvey();

    // Dependent renders with its seeded value.
    await waitFor(() =>
      expect(screen.getByLabelText('Where is the fire exit?')).toBeInTheDocument(),
    );
    (enqueue as ReturnType<typeof vi.fn>).mockClear();

    // Flip controller to No → dependent becomes hidden, value must be cleared.
    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    // Dependent is removed from the DOM.
    await waitFor(() =>
      expect(screen.queryByLabelText('Where is the fire exit?')).toBeNull(),
    );

    // The cleared value is persisted through the existing autosave path:
    // enqueue('answer_upsert', { question_key: 'dep', value: null }).
    await waitFor(() => {
      const cleared = (enqueue as ReturnType<typeof vi.fn>).mock.calls.find(
        ([, row]) => row?.question_key === 'dep',
      );
      expect(cleared).toBeTruthy();
      expect(cleared![1].value).toBeNull();
    });

    // And the stored Dexie row for the dependent is now null.
    const row = await localDb.answers
      .where('target_id')
      .equals('tgt-1')
      .toArray();
    const depRow = row.find((r) => r.question_key === 'dep');
    expect(depRow?.value).toBeNull();
  });
});
