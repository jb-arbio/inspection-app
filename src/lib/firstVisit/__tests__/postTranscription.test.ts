import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postTranscription } from '../postTranscription';

beforeEach(() => vi.restoreAllMocks());

describe('postTranscription', () => {
  it('POSTs the blob as multipart and returns the text', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ text: 'Clean text.' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const blob = new Blob(['x'], { type: 'audio/webm' });
    const text = await postTranscription(blob);

    expect(text).toBe('Clean text.');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/first-visit/transcribe');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it('throws on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await expect(postTranscription(new Blob(['x']))).rejects.toThrow();
  });
});
