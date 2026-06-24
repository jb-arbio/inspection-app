import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firstVisit/hubSupabase', () => ({ getHubSupabase: vi.fn() }));
vi.mock('@/lib/firstVisit/hubSupabaseAdmin', () => ({
  getHubRouteContext: vi.fn(),
}));
vi.mock('@/lib/firstVisit/adminAccess', () => ({ isAdminEmail: vi.fn() }));
// validateSurveyContent runs against the REAL full overlay (QUESTION_STRUCTURE),
// which references many slugs our tiny test content omits. Mock it so each POST
// test controls the ok/errors outcome explicitly.
vi.mock('@/lib/firstVisit/validateSurveyContent', () => ({
  validateSurveyContent: vi.fn(),
}));

import { GET, POST } from '../route';
import { GET as DRAFT_GET, PUT as DRAFT_PUT } from '../draft/route';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';
import { isAdminEmail } from '@/lib/firstVisit/adminAccess';
import { validateSurveyContent } from '@/lib/firstVisit/validateSurveyContent';
import type { ContentConfig } from '@/lib/firstVisit/surveyConfig';

const mockGetHubSupabase = getHubSupabase as unknown as ReturnType<typeof vi.fn>;
const mockGetHubRouteContext =
  getHubRouteContext as unknown as ReturnType<typeof vi.fn>;
const mockIsAdminEmail = isAdminEmail as unknown as ReturnType<typeof vi.fn>;
const mockValidate =
  validateSurveyContent as unknown as ReturnType<typeof vi.fn>;

// A genuinely valid minimal content config (passes validateSurveyContent against
// the empty overlay subset it touches — slug is well-formed, no select/options).
const validContent: ContentConfig = {
  phases: [
    {
      id: 'p1',
      label: 'Phase 1',
      questions: [
        {
          slug: 'fv_visit_date',
          label: 'Visit date',
          description: null,
          scope: 'deal',
          type: 'date',
          options: [],
          required: false,
          phase_id: 'p1',
          phase_label: 'Phase 1',
        },
      ],
    },
  ],
};

// Invalid: a select with empty options -> validateSurveyContent reports an error.
const invalidContent = {
  phases: [
    {
      id: 'p1',
      label: 'Phase 1',
      questions: [
        {
          slug: 'fv_visit_date',
          label: 'Visit date',
          description: null,
          scope: 'deal',
          type: 'select',
          options: [],
          required: false,
          phase_id: 'p1',
          phase_label: 'Phase 1',
        },
      ],
    },
  ],
} as ContentConfig;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/first-visit/survey-config', () => {
  it('returns the latest published content', async () => {
    const row = { version: 3, content_json: validContent };
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: row, error: null }),
              }),
            }),
          }),
        }),
      }),
    }));
    mockGetHubSupabase.mockReturnValue({ from });

    const res = await GET(new Request('http://x/api/first-visit/survey-config'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ version: 3, content: validContent });
  });

  it('returns {version:null, content:null} when nothing is published', async () => {
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
    }));
    mockGetHubSupabase.mockReturnValue({ from });

    const res = await GET(new Request('http://x/api/first-visit/survey-config'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: null, content: null });
  });

  it('returns a specific version when ?version=N is given', async () => {
    const row = { version: 2, content_json: validContent };
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: row, error: null }),
          }),
        }),
      }),
    }));
    mockGetHubSupabase.mockReturnValue({ from });

    const res = await GET(
      new Request('http://x/api/first-visit/survey-config?version=2'),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: 2, content: validContent });
  });

  it('404s for a missing ?version=N', async () => {
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    }));
    mockGetHubSupabase.mockReturnValue({ from });

    const res = await GET(
      new Request('http://x/api/first-visit/survey-config?version=99'),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not-found' });
  });
});

describe('POST /api/first-visit/survey-config', () => {
  function makeReq(content: unknown) {
    return new Request('http://x/api/first-visit/survey-config', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  it('401 when not authenticated', async () => {
    mockGetHubRouteContext.mockResolvedValue(null);
    const res = await POST(makeReq(validContent));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauth' });
  });

  it('403 when authenticated but not admin', async () => {
    mockGetHubRouteContext.mockResolvedValue({
      supabase: {},
      email: 'nope@arbio.com',
    });
    mockIsAdminEmail.mockReturnValue(false);
    const res = await POST(makeReq(validContent));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden' });
  });

  it('400 with errors for invalid content', async () => {
    mockGetHubRouteContext.mockResolvedValue({
      supabase: {},
      email: 'admin@arbio.com',
    });
    mockIsAdminEmail.mockReturnValue(true);
    mockValidate.mockReturnValue({
      ok: false,
      errors: ['question "fv_visit_date" is select but has empty options'],
    });
    const res = await POST(makeReq(invalidContent));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid');
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it('200 and inserts at incremented version for valid content', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { version: 4 }, error: null }),
              }),
            }),
          }),
        }),
      }),
      insert,
    }));
    mockGetHubRouteContext.mockResolvedValue({
      supabase: { from },
      email: 'admin@arbio.com',
    });
    mockIsAdminEmail.mockReturnValue(true);
    mockValidate.mockReturnValue({ ok: true, errors: [] });

    const res = await POST(makeReq(validContent));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: 5 });
    expect(insert).toHaveBeenCalledOnce();
    const inserted = insert.mock.calls[0][0];
    expect(inserted).toMatchObject({
      template_key: 'first_visit',
      version: 5,
      status: 'published',
      created_by: 'admin@arbio.com',
    });
    expect(inserted.published_at).toBeTruthy();
  });

  it('starts at version 1 when nothing is published yet', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
      insert,
    }));
    mockGetHubRouteContext.mockResolvedValue({
      supabase: { from },
      email: 'admin@arbio.com',
    });
    mockIsAdminEmail.mockReturnValue(true);
    mockValidate.mockReturnValue({ ok: true, errors: [] });

    const res = await POST(makeReq(validContent));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: 1 });
  });
});

describe('GET /api/first-visit/survey-config/draft', () => {
  it('401 when not authenticated', async () => {
    mockGetHubRouteContext.mockResolvedValue(null);
    const res = await DRAFT_GET();
    expect(res.status).toBe(401);
  });

  it('403 when not admin', async () => {
    mockGetHubRouteContext.mockResolvedValue({
      supabase: {},
      email: 'nope@arbio.com',
    });
    mockIsAdminEmail.mockReturnValue(false);
    const res = await DRAFT_GET();
    expect(res.status).toBe(403);
  });

  it('returns the draft content for an admin', async () => {
    const row = { version: null, content_json: validContent };
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: row, error: null }),
          }),
        }),
      }),
    }));
    mockGetHubRouteContext.mockResolvedValue({
      supabase: { from },
      email: 'admin@arbio.com',
    });
    mockIsAdminEmail.mockReturnValue(true);

    const res = await DRAFT_GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: null, content: validContent });
  });
});

describe('PUT /api/first-visit/survey-config/draft', () => {
  function makeReq(content: unknown) {
    return new Request('http://x/api/first-visit/survey-config/draft', {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  it('403 when not admin', async () => {
    mockGetHubRouteContext.mockResolvedValue({
      supabase: {},
      email: 'nope@arbio.com',
    });
    mockIsAdminEmail.mockReturnValue(false);
    const res = await DRAFT_PUT(makeReq(validContent));
    expect(res.status).toBe(403);
  });

  it('upserts the draft and returns {ok:true} for an admin', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ upsert }));
    mockGetHubRouteContext.mockResolvedValue({
      supabase: { from },
      email: 'admin@arbio.com',
    });
    mockIsAdminEmail.mockReturnValue(true);

    const res = await DRAFT_PUT(makeReq(validContent));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert.mock.calls[0][0]).toMatchObject({
      template_key: 'first_visit',
      status: 'draft',
    });
  });
});
