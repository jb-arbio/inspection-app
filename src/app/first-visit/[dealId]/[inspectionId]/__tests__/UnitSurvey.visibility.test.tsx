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

// 3-question cascade chain: A gates B, B gates C. Used by the cascade-clear test.
const chainA: FirstVisitQuestion = {
  ...baseQ,
  slug: 'chainA',
  label: 'A: enable B?',
  type: 'boolean',
};
const chainB: FirstVisitQuestion = {
  ...baseQ,
  slug: 'chainB',
  label: 'B: enable C?',
  type: 'boolean',
  visible_when: { question: 'chainA', equals: true },
};
const chainC: FirstVisitQuestion = {
  ...baseQ,
  slug: 'chainC',
  label: 'C: detail',
  type: 'text',
  visible_when: { question: 'chainB', equals: true },
};

// Progress-ring fixture: one always-visible required question (`reqVisible`) plus
// one required dependent (`reqDep`) hidden by a "No" controller (`ringCtrl`). Once
// the always-visible required questions are answered the ring must read complete,
// because the hidden required dependent must not count toward the total.
const ringCtrl: FirstVisitQuestion = {
  ...baseQ,
  slug: 'ringCtrl',
  label: 'Ring: has extra?',
  type: 'boolean',
  required: true,
};
const reqVisible: FirstVisitQuestion = {
  ...baseQ,
  slug: 'reqVisible',
  label: 'Ring: always required',
  type: 'text',
  required: true,
};
const reqDep: FirstVisitQuestion = {
  ...baseQ,
  slug: 'reqDep',
  label: 'Ring: required only when extra',
  type: 'text',
  required: true,
  visible_when: { question: 'ringCtrl', equals: true },
};

// Mutable phase set so individual tests can swap in their own fixture before
// rendering. Defaults to the controller/dependent pair used by the first suite.
let activePhases: FirstVisitPhase[] = [
  { id: 'p1', label: 'Phase 1', questions: [ctrlQ, depQ] },
];

vi.mock('@/lib/firstVisit/questions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/firstVisit/questions')>(
    '@/lib/firstVisit/questions',
  );
  return {
    ...actual,
    phasesForScope: () =>
      activePhases.map((p) => ({ ...p, questions: [...p.questions] })),
    areaKeyFor: (q: FirstVisitQuestion) => q.phase_id,
    groupIdFor: (q: FirstVisitQuestion) => q.group_id ?? null,
  };
});

vi.mock('@/lib/firstVisit/sync', () => ({ enqueue: vi.fn(async () => undefined) }));
vi.mock('@/lib/firstVisit/analytics', () => ({ track: vi.fn() }));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  // Reset to the default controller/dependent fixture; individual tests override.
  activePhases = [{ id: 'p1', label: 'Phase 1', questions: [ctrlQ, depQ] }];
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

  it('cascade-clears a 3-deep chain (A→B→C) when the root flips to hiding', async () => {
    activePhases = [
      { id: 'p1', label: 'Phase 1', questions: [chainA, chainB, chainC] },
    ];
    await seedAnswer('chainA', 'p1', true);
    await seedAnswer('chainB', 'p1', true);
    await seedAnswer('chainC', 'p1', 'leaf detail');
    renderSurvey();

    // Whole chain visible while A=true, B=true.
    await waitFor(() =>
      expect(screen.getByLabelText('C: detail')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('B: enable C?')).toBeInTheDocument();

    // Flip A → No. B is hidden directly (A gates B); C is hidden because B's
    // value is cleared (B gates C), which cascades on the next render.
    fireEvent.click(
      screen.getAllByRole('button', { name: 'No' })[0],
    );

    // Both B and C leave the DOM.
    await waitFor(() =>
      expect(screen.queryByLabelText('B: enable C?')).toBeNull(),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('C: detail')).toBeNull(),
    );

    // Both stored values are cleared to null.
    await waitFor(async () => {
      const rows = await localDb.answers
        .where('target_id')
        .equals('tgt-1')
        .toArray();
      const b = rows.find((r) => r.question_key === 'chainB');
      const c = rows.find((r) => r.question_key === 'chainC');
      expect(b?.value).toBeNull();
      expect(c?.value).toBeNull();
    });
  });
});

describe('UnitSurvey — in-panel progress ring honors visible_when', () => {
  it('reads complete once visible required answered, ignoring a hidden required dependent', async () => {
    activePhases = [
      { id: 'p1', label: 'Phase 1', questions: [ringCtrl, reqVisible, reqDep] },
    ];
    // Controller = No → reqDep is hidden and must not count toward the total.
    await seedAnswer('ringCtrl', 'p1', false);
    await seedAnswer('reqVisible', 'p1', 'answered');
    renderSurvey();

    // The always-visible required question is rendered; the hidden required
    // dependent is not.
    await waitFor(() =>
      expect(screen.getByText('Ring: always required')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Ring: required only when extra')).toBeNull();

    // Ring counts only the two visible required questions (ringCtrl + reqVisible),
    // both answered → done === total.
    await waitFor(() =>
      expect(
        screen.getByLabelText('Progress: 2 of 2 required answered'),
      ).toBeInTheDocument(),
    );
  });
});
