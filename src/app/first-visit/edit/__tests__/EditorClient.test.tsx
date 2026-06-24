import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EditorClient } from '../EditorClient';
import { validateSurveyContent } from '@/lib/firstVisit/validateSurveyContent';

// Mock validation so small fixtures can simulate ok/invalid without needing the
// full overlay slug coverage. Default to "ok" so existing tests are unaffected;
// individual tests override per-case.
vi.mock('@/lib/firstVisit/validateSurveyContent', () => ({
  validateSurveyContent: vi.fn(() => ({ ok: true, errors: [] })),
}));

const mockValidate = vi.mocked(validateSurveyContent);

// A minimal valid draft: one phase, two content questions.
const DRAFT_CONTENT = {
  phases: [
    {
      id: 'p1',
      label: 'Location',
      questions: [
        {
          slug: 'fv_a',
          label: 'Question A',
          description: null,
          scope: 'unit_category',
          type: 'text',
          options: [],
          required: false,
          phase_id: 'p1',
          phase_label: 'Location',
        },
        {
          slug: 'fv_b',
          label: 'Question B',
          description: null,
          scope: 'deal',
          type: 'boolean',
          options: [],
          required: true,
          phase_id: 'p1',
          phase_label: 'Location',
        },
      ],
    },
  ],
};

function jsonRes(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

// A draft whose slugs ARE present in QUESTION_STRUCTURE, so the new-field banner
// is absent unless a brand-new field is added.
const MAPPED_DRAFT_CONTENT = {
  phases: [
    {
      id: 'p1',
      label: 'Visit',
      questions: [
        {
          slug: 'fv_visit_date',
          label: 'Visit date',
          description: null,
          scope: 'deal',
          type: 'date',
          options: [],
          required: false,
          phase_id: 'p1',
          phase_label: 'Visit',
        },
        {
          slug: 'fv_visit_visitor_name',
          label: 'Visitor name',
          description: null,
          scope: 'deal',
          type: 'text',
          options: [],
          required: false,
          phase_id: 'p1',
          phase_label: 'Visit',
        },
      ],
    },
  ],
};

describe('EditorClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockValidate.mockReturnValue({ ok: true, errors: [] });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders rows grouped by phase from the draft GET', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonRes(200, { version: 1, content: DRAFT_CONTENT }),
    );

    render(<EditorClient />);

    expect(await screen.findByText('Location')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Question A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Question B')).toBeInTheDocument();
  });

  it('renders the no-access message on a 403 draft GET', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonRes(403, { error: 'forbidden' }),
    );

    render(<EditorClient />);

    expect(
      await screen.findByText(/don't have access to edit the survey/i),
    ).toBeInTheDocument();
  });

  it('PUTs the current content to the draft route on Save draft', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonRes(200, { version: 1, content: DRAFT_CONTENT }));

    render(<EditorClient />);
    await screen.findByText('Location');

    // Reset so we assert only on the PUT call.
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(jsonRes(200, { ok: true }));

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/first-visit/survey-config/draft',
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.content).toEqual(DRAFT_CONTENT);

    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('adds a question to a phase with a unique slug on "+ Add question"', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonRes(200, { version: 1, content: DRAFT_CONTENT }),
    );

    render(<EditorClient />);
    await screen.findByText('Location');

    // Two questions to start.
    expect(screen.getAllByLabelText('Label')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /add question/i }));

    const labels = screen.getAllByLabelText('Label');
    expect(labels).toHaveLength(3);

    // The new row carries a unique slug not already present.
    expect(screen.getByText('fv_new_field_1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New question')).toBeInTheDocument();
  });

  it('removes a question when its Remove control is clicked', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonRes(200, { version: 1, content: DRAFT_CONTENT }),
    );

    render(<EditorClient />);
    await screen.findByText('Location');

    expect(screen.getByDisplayValue('Question A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove fv_a' }));

    expect(screen.queryByDisplayValue('Question A')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Question B')).toBeInTheDocument();
  });

  it('reorders questions: ↓ on the first row swaps it with the second', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonRes(200, { version: 1, content: DRAFT_CONTENT }),
    );

    render(<EditorClient />);
    await screen.findByText('Location');

    // Initial order: fv_a then fv_b.
    let slugs = screen
      .getAllByText(/^fv_[ab]$/)
      .map((el) => el.textContent);
    expect(slugs).toEqual(['fv_a', 'fv_b']);

    fireEvent.click(screen.getByRole('button', { name: 'Move fv_a down' }));

    slugs = screen.getAllByText(/^fv_[ab]$/).map((el) => el.textContent);
    expect(slugs).toEqual(['fv_b', 'fv_a']);
  });

  it('shows the new-field banner only when a slug is not in QUESTION_STRUCTURE', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonRes(200, { version: 1, content: MAPPED_DRAFT_CONTENT }),
    );

    render(<EditorClient />);
    await screen.findByText('Visit');

    // All slugs mapped → no banner.
    expect(
      screen.queryByText(/aren't PMS-mapped or wired into branching/i),
    ).not.toBeInTheDocument();

    // Adding a field introduces an unmapped slug → banner appears.
    fireEvent.click(screen.getByRole('button', { name: /add question/i }));

    expect(
      await screen.findByText(/aren't PMS-mapped or wired into branching/i),
    ).toBeInTheDocument();
  });

  it('does not POST and shows errors when client validation fails on Publish', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonRes(200, { version: 1, content: DRAFT_CONTENT }));

    render(<EditorClient />);
    await screen.findByText('Location');

    fetchMock.mockClear();
    mockValidate.mockReturnValue({ ok: false, errors: ['boom'] });

    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));

    expect(await screen.findByText('boom')).toBeInTheDocument();

    // No publish POST went out.
    const postedToPublish = fetchMock.mock.calls.some(
      ([url, init]) =>
        url === '/api/first-visit/survey-config' &&
        (init as RequestInit | undefined)?.method === 'POST',
    );
    expect(postedToPublish).toBe(false);
  });

  it('POSTs and shows the published version when validation passes', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonRes(200, { version: 1, content: DRAFT_CONTENT }));

    render(<EditorClient />);
    await screen.findByText('Location');

    fetchMock.mockClear();
    mockValidate.mockReturnValue({ ok: true, errors: [] });
    fetchMock.mockResolvedValue(jsonRes(200, { version: 7 }));

    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/first-visit/survey-config',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findByText(/version 7/i)).toBeInTheDocument();
  });
});
