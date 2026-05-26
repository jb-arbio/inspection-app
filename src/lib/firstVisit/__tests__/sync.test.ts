import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localDb } from '../db';
import { enqueue, drainOutbox } from '../sync';

describe('sync engine', () => {
  beforeEach(async () => {
    await localDb.outbox.clear();
  });

  it('enqueues a job', async () => {
    await enqueue('answer_upsert', { foo: 1 });
    const jobs = await localDb.outbox.toArray();
    expect(jobs).toHaveLength(1);
  });

  it('drains jobs by calling the registered handler', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    await enqueue('answer_upsert', { foo: 1 });
    await drainOutbox({ answer_upsert: handler } as never);
    expect(handler).toHaveBeenCalledOnce();
    expect(await localDb.outbox.count()).toBe(0);
  });

  it('keeps job in outbox on handler failure, increments attempts', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    await enqueue('answer_upsert', { foo: 1 });
    await drainOutbox({ answer_upsert: handler } as never);
    const jobs = await localDb.outbox.toArray();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].attempts).toBe(1);
    expect(jobs[0].last_error).toContain('boom');
  });
});
