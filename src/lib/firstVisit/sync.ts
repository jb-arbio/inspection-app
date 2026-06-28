import { localDb, type OutboxJob } from './db';

export type JobHandlers = Record<OutboxJob['kind'], (payload: unknown) => Promise<void>>;

export async function enqueue(kind: OutboxJob['kind'], payload: unknown): Promise<void> {
  await localDb.outbox.add({
    kind,
    payload,
    created_at: Date.now(),
    attempts: 0,
  });
}

// Re-ensure the hub has the parent inspection row for an open survey. The
// inspection is only enqueued once, when first created (DealPicker) — so if that
// single inspection_upsert never landed (offline / the auth-broken window), the
// inspection has no hub row and every child target/answer FK-fails forever with
// no recovery. Calling this on survey open re-queues an idempotent upsert so an
// orphaned parent self-heals on the next sync. Skips submitted inspections (to
// avoid clobbering their server-side submit state) and de-dupes against any
// inspection_upsert already pending in the outbox.
export async function ensureInspectionQueued(inspectionId: string): Promise<void> {
  const insp = await localDb.inspections.get(inspectionId);
  if (!insp || insp.status === 'submitted') return;
  const jobs = await localDb.outbox.toArray();
  const alreadyQueued = jobs.some(
    (j) =>
      j.kind === 'inspection_upsert' &&
      (j.payload as { id?: string } | null)?.id === inspectionId,
  );
  if (alreadyQueued) return;
  await enqueue('inspection_upsert', insp);
}

export async function drainOutbox(handlers: JobHandlers): Promise<void> {
  const jobs = await localDb.outbox.orderBy('created_at').toArray();
  for (const job of jobs) {
    const handler = handlers[job.kind];
    if (!handler) continue;
    try {
      await handler(job.payload);
      await localDb.outbox.delete(job.id!);
    } catch (err) {
      await localDb.outbox.update(job.id!, {
        attempts: job.attempts + 1,
        last_error: err instanceof Error ? err.message : String(err),
        last_attempt_at: Date.now(),
      });
    }
  }
}

export async function outboxCount(): Promise<number> {
  return localDb.outbox.count();
}
