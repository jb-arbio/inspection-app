// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firstVisit/hubSupabase', () => ({ getHubSupabase: vi.fn() }));
vi.mock('@/lib/firstVisit/hubSupabaseAdmin', () => ({ getHubRouteContext: vi.fn() }));

const chat = vi.fn();
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: chat } };
  },
}));

import { POST } from '../route';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';

const asMock = (fn: unknown) => fn as never as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown) {
  return new Request('http://test/api/first-visit/extract', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = 'sk-test';
  asMock(getHubRouteContext).mockResolvedValue({ supabase: {}, email: 'a@arbio.com' });
});

describe('POST /api/first-visit/extract', () => {
  it('401 when unauthenticated', async () => {
    asMock(getHubRouteContext).mockResolvedValue(null);
    const res = await POST(makeRequest({ text: 'x', targetSlugs: ['fv_location_quality'] }));
    expect(res.status).toBe(401);
  });

  it('400 when targetSlugs is empty', async () => {
    const res = await POST(makeRequest({ text: 'x', targetSlugs: [] }));
    expect(res.status).toBe(400);
  });

  it('returns empty (no model call) when transcript is blank', async () => {
    const res = await POST(makeRequest({ text: '   ', targetSlugs: ['fv_location_quality'] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ singles: {}, items: [], summary: null, warnings: ['empty transcript'] });
    expect(chat).not.toHaveBeenCalled();
  });

  it('extracts and validates a single field', async () => {
    chat.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        singles: { fv_location_quality: { value: 'Good', confidence: 0.9 } },
        items: [],
      }) } }],
    });
    const res = await POST(makeRequest({ text: 'great spot', targetSlugs: ['fv_location_quality'] }));
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.singles.fv_location_quality.value).toBe('Good');
  });

  it('degrades to empty (200) when the model call throws', async () => {
    chat.mockRejectedValue(new Error('llm down'));
    const res = await POST(makeRequest({ text: 'x', targetSlugs: ['fv_location_quality'] }));
    expect(res.status).toBe(200);
    expect((await res.json()).warnings).toContain('extraction failed');
  });
});
