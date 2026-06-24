import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { UnitSurvey } from '../UnitSurvey';
import { localDb } from '@/lib/firstVisit/db';
import { SurveyConfigProvider } from '@/lib/firstVisit/SurveyConfigContext';
import type { FirstVisitPhase, FirstVisitQuestion } from '@/lib/firstVisit/questions';

// Minimal fixture mirroring the real WS-F mapping for the fusebox slug:
// the file-question `fv_photo_fusebox` (originally in phase "8 — Property
// documentation") anchors to `fv_fusebox_location` (in phase "5 — Building
// infrastructure & utilities"). After the WS-F filter, phase 8 must be empty
// (and therefore hidden) and the photo must render inside phase 5 next to
// its anchor.

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
  phase_id: 'p_data',
  phase_label: 'Building infrastructure & utilities',
};

const anchorQ: FirstVisitQuestion = {
  ...baseQ,
  slug: 'fv_fusebox_location',
  label: 'Fuse box location',
  type: 'text',
  phase_id: 'p_data',
  phase_label: 'Building infrastructure & utilities',
};

const fileQ: FirstVisitQuestion = {
  ...baseQ,
  slug: 'fv_photo_fusebox',
  label: 'Fuse box photo',
  type: 'file',
  required: true,
  phase_id: 'p_media',
  phase_label: 'Property documentation',
  anchor_to: 'fv_fusebox_location',
};

const phases: FirstVisitPhase[] = [
  {
    id: 'p_data',
    label: 'Building infrastructure & utilities',
    questions: [anchorQ],
  },
  {
    id: 'p_media',
    label: 'Property documentation',
    questions: [fileQ],
  },
];

// Provide the two-phase fixture via the provider so the WS-F filter (run inside
// UnitSurvey over the context phases) acts on exactly these phases. areaKeyFor /
// groupIdFor are still imported by UnitSurvey, so keep them mocked.
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

function renderWithConfig(ui: ReactElement) {
  return render(
    <SurveyConfigProvider
      value={{
        phases: phases.map((p) => ({ ...p, questions: [...p.questions] })),
        allQuestions: phases.flatMap((p) => p.questions),
      }}
    >
      {ui}
    </SurveyConfigProvider>,
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(async () => {
  await localDb.answers.clear();
  vi.clearAllMocks();
});

function renderSurvey() {
  return renderWithConfig(
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

describe('UnitSurvey — WS-F media anchoring', () => {
  it('renders the anchored photo inside the anchor phase, not in its original phase', async () => {
    const { container } = renderSurvey();

    // Anchor data-question renders.
    await waitFor(() =>
      expect(screen.getByLabelText('Fuse box location')).toBeInTheDocument(),
    );

    // The anchored file-question renders (MediaButtons exposes the label).
    expect(screen.getByText('Fuse box photo')).toBeInTheDocument();

    // It is rendered with the WS-F anchor wrapper carrying data-anchored-to.
    const anchoredNode = container.querySelector('[data-anchored-to="fv_fusebox_location"]');
    expect(anchoredNode).not.toBeNull();

    // The original phase "Property documentation" is not shown — its only
    // question (the file) was anchored away, so the phase chip should not
    // appear. Use the section strip chip text to assert this.
    expect(screen.queryByRole('button', { name: /Property documentation/ })).toBeNull();

    // Phase chip for the anchor's phase is present, and its visible item
    // count reflects the anchor + the inlined anchored child (1 + 1 = 2).
    const anchorChip = screen.getByRole('button', { name: /Building infrastructure & utilities/ });
    expect(anchorChip).toBeInTheDocument();
    expect(anchorChip.textContent).toContain('2');
  });
});
