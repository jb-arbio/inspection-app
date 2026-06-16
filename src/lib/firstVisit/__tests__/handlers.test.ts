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

  it('forwards step_index in the outbox payload when set', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }) as never,
    );
    const handlers = createHandlers();
    await handlers.answer_upsert({ id: 'a1', step_index: 2 });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(init?.body as string);
    expect(body.step_index).toBe(2);
  });

  it('media_delete DELETEs /api/first-visit/media?id=', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }) as never,
    );
    const handlers = createHandlers();
    await handlers.media_delete({ id: 'm1' });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/first-visit/media?id=m1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('media_delete throws on non-200 so outbox retains the job', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500 }) as never,
    );
    const handlers = createHandlers();
    await expect(handlers.media_delete({ id: 'm1' })).rejects.toThrow();
  });

  it('omits step_index when null or undefined', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ ok: true }), { status: 200 }) as never,
      );
    const handlers = createHandlers();
    await handlers.answer_upsert({ id: 'a1', step_index: null });
    let body = JSON.parse(
      (fetchSpy.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect('step_index' in body).toBe(false);

    await handlers.answer_upsert({ id: 'a2' });
    body = JSON.parse(
      (fetchSpy.mock.calls[1]?.[1] as RequestInit).body as string,
    );
    expect('step_index' in body).toBe(false);
  });
});
