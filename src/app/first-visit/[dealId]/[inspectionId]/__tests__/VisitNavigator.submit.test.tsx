import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import VisitNavigator from '../VisitNavigator';
import { localDb, type LocalTarget } from '@/lib/firstVisit/db';
import { questionsForScope } from '@/lib/firstVisit/questions';

// Keep the sync engine inert and deterministic — this test is about the submit
// dialog's "what's left" list and the success state, not the outbox.
vi.mock('@/lib/firstVisit/useSyncEngine', () => ({
  useSyncEngine: () => ({ pending: 0, syncing: false, syncNow: vi.fn().mockResolvedValue(undefined) }),
  useOnlineStatus: () => true,
}));
vi.mock('@/lib/firstVisit/sync', () => ({ enqueue: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/firstVisit/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/firstVisit/export', () => ({ downloadInspectionZip: vi.fn() }));

const INSPECTION = 'insp-1';
const DEAL = 'deal-1';

async function seedProperty() {
  await localDb.targets.clear();
  await localDb.answers.clear();
  await localDb.inspections.clear();
  await localDb.inspections.put({
    id: INSPECTION,
    deal_id: DEAL,
    status: 'draft',
  } as Parameters<typeof localDb.inspections.put>[0]);
  const prop: LocalTarget = {
    id: 'prop-1',
    inspection_id: INSPECTION,
    kind: 'property',
    location_id: 'loc-1',
    label: 'Main Building',
    created_on_site: false,
    order: 0,
  };
  await localDb.targets.put(prop);
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ deal: { id: DEAL }, locations: [], units: [] }) }),
  );
});

describe('VisitNavigator submit flow', () => {
  it('lists an unanswered visible-required question grouped by target, then shows success', async () => {
    await seedProperty();

    render(
      <VisitNavigator dealId={DEAL} inspectionId={INSPECTION} previewSnapshot={undefined} visitTitle="Test Visit" />,
    );

    // Wait for the seeded property to appear.
    await waitFor(() => expect(screen.getByText('Main Building')).toBeInTheDocument());

    // Open the submit dialog (the page-level submit button).
    fireEvent.click(screen.getByRole('button', { name: 'Submit visit' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // The property has zero answers, so its first visible-required location
    // question must be listed, grouped under the property label.
    const firstRequired = questionsForScope('location').find(
      (q) => q.required && !q.group_id && !q.visible_when,
    )!;
    expect(firstRequired).toBeTruthy();
    // Grouped under the property label, inside the dialog.
    expect(within(dialog).getByText('Main Building')).toBeInTheDocument();
    expect(within(dialog).getAllByText(firstRequired.label).length).toBeGreaterThan(0);

    // Confirm submit → success state (the dialog's own submit button).
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit visit' }));
    await waitFor(() => expect(screen.getByText(/Visit submitted/i)).toBeInTheDocument());

    const updated = await localDb.inspections.get(INSPECTION);
    expect(updated?.status).toBe('submitted');
  });
});
