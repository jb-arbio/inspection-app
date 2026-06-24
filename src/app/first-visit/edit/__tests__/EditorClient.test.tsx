import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EditorClient } from '../EditorClient';

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

describe('EditorClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
