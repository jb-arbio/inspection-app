import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHandlers } from '../handlers';

describe('handlers', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('answer_upsert POSTs to /api/first-visit/answers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }) as never,
    );
    const handlers = createHandlers();
    await handlers.answer_upsert({ id: 'a1' });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/first-visit/answers',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on non-200 so outbox retains the job', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500 }) as never,
    );
    const handlers = createHandlers();
    await expect(handlers.answer_upsert({ id: 'a1' })).rejects.toThrow();
  });
});
