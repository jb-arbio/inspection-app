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
