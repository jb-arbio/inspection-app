import { describe, it, expect, beforeEach } from 'vitest';
import { localDb } from '../db';

describe('localDb', () => {
  beforeEach(async () => {
    await localDb.inspections.clear();
    await localDb.answers.clear();
    await localDb.media.clear();
    await localDb.outbox.clear();
  });

  it('stores and reads an inspection', async () => {
    await localDb.inspections.put({
      id: 'i1',
      deal_id: 'd1',
      status: 'draft',
      inspector_email: 'a@arbio.com',
      started_at: new Date().toISOString(),
    });
    const got = await localDb.inspections.get('i1');
    expect(got?.deal_id).toBe('d1');
  });

  it('enqueues outbox jobs', async () => {
    await localDb.outbox.add({
      kind: 'answer_upsert',
      payload: { foo: 'bar' },
      created_at: Date.now(),
      attempts: 0,
    });
    const jobs = await localDb.outbox.toArray();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe('answer_upsert');
  });
});
