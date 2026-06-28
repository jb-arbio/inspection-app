import { describe, it, expect, beforeEach } from 'vitest';
import { localDb, type LocalInspection } from '../db';
import { ensureInspectionQueued } from '../sync';

function makeInspection(over: Partial<LocalInspection> = {}): LocalInspection {
  return {
    id: 'insp1',
    deal_id: 'deal1',
    status: 'draft',
    inspector_email: '',
    started_at: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

async function inspectionUpserts(inspectionId: string) {
  const jobs = await localDb.outbox.toArray();
  return jobs.filter(
    (j) =>
      j.kind === 'inspection_upsert' &&
      (j.payload as { id?: string } | null)?.id === inspectionId,
  );
}

beforeEach(async () => {
  await localDb.inspections.clear();
  await localDb.outbox.clear();
});

describe('ensureInspectionQueued', () => {
  it('queues an inspection_upsert for an existing draft', async () => {
    await localDb.inspections.put(makeInspection());
    await ensureInspectionQueued('insp1');
    expect(await inspectionUpserts('insp1')).toHaveLength(1);
  });

  it('does not queue a duplicate when one is already pending', async () => {
    await localDb.inspections.put(makeInspection());
    await ensureInspectionQueued('insp1');
    await ensureInspectionQueued('insp1');
    expect(await inspectionUpserts('insp1')).toHaveLength(1);
  });

  it('does nothing when the inspection does not exist locally', async () => {
    await ensureInspectionQueued('missing');
    expect(await localDb.outbox.count()).toBe(0);
  });

  it('skips a submitted inspection (avoid clobbering server submit state)', async () => {
    await localDb.inspections.put(makeInspection({ status: 'submitted', submitted_at: 'x' }));
    await ensureInspectionQueued('insp1');
    expect(await inspectionUpserts('insp1')).toHaveLength(0);
  });
});
