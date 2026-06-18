import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firstVisit/hubSupabaseServer', () => ({ getHubUserClient: vi.fn() }));

import { GET, parseFindingMediaStep } from '../route';
import { getHubUserClient } from '@/lib/firstVisit/hubSupabaseServer';

const asMock = (fn: unknown) => fn as never as ReturnType<typeof vi.fn>;

// Build a query-builder stub whose terminal `.in()` / `.eq()` resolves to the
// row set for a given table. The route reads three tables:
//   first_visit_answers  -> .select().eq(inspection).in(question_key)  (awaited)
//   first_visit_targets  -> .select().eq(inspection)                   (awaited)
//   first_visit_media    -> .select().eq(inspection)                   (awaited)
function makeClient(opts: {
  answers: unknown[];
  targets: unknown[];
  media: unknown[];
  createSignedUrl: ReturnType<typeof vi.fn>;
}) {
  const from = vi.fn((table: string) => {
    let rows: unknown[] = [];
    if (table === 'first_visit_answers') rows = opts.answers;
    else if (table === 'first_visit_targets') rows = opts.targets;
    else if (table === 'first_visit_media') rows = opts.media;
    const result = { data: rows, error: null };
    const builder: Record<string, unknown> = {
      select: () => builder,
      in: () => Promise.resolve(result),
      // .eq() must be awaitable (targets/media: .select().eq() is the terminal
      // call) AND chainable into .in() (answers: .select().eq().in()). Return a
      // thenable promise that also exposes .in().
      eq: () => {
        const p = Promise.resolve(result) as Promise<typeof result> & {
          in: () => Promise<typeof result>;
        };
        p.in = () => Promise.resolve(result);
        return p;
      },
    };
    return builder;
  });
  const storage = {
    from: vi.fn(() => ({ createSignedUrl: opts.createSignedUrl })),
  };
  return {
    from,
    storage,
    auth: { getUser: () => ({ data: { user: { email: 'a@arbio.com' } } }) },
  };
}

const makeParams = (inspectionId: string) => Promise.resolve({ inspectionId });

describe('parseFindingMediaStep', () => {
  it('extracts step index from finding_media::N', () => {
    expect(parseFindingMediaStep('finding_media::3')).toBe(3);
    expect(parseFindingMediaStep('finding_media::0')).toBe(0);
  });
  it('returns null for non-matching keys', () => {
    expect(parseFindingMediaStep('finding_media')).toBeNull();
    expect(parseFindingMediaStep('finding_item_name')).toBeNull();
    expect(parseFindingMediaStep('finding_media::x')).toBeNull();
  });
});

describe('GET /api/first-visit/[inspectionId]/findings.csv', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when getHubRouteContext returns null', async () => {
    asMock(getHubUserClient).mockResolvedValue(null);
    const res = await GET(new Request('http://x/findings.csv'), {
      params: makeParams('i1'),
    });
    expect(res.status).toBe(401);
  });

  it('returns text/csv with the header row', async () => {
    const createSignedUrl = vi.fn();
    asMock(getHubUserClient).mockResolvedValue(
      makeClient({ answers: [], targets: [], media: [], createSignedUrl }),
    );
    const res = await GET(new Request('http://x/findings.csv'), {
      params: makeParams('i1'),
    });
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    const body = await res.text();
    expect(body.startsWith('unit_identifier,list_type,item_name')).toBe(true);
  });

  it('uses "Building / common" for a location-scoped finding', async () => {
    const createSignedUrl = vi.fn();
    asMock(getHubUserClient).mockResolvedValue(
      makeClient({
        answers: [
          { target_id: 't1', scope: 'location', question_key: 'finding_item_name', step_index: 0, value: 'Leak' },
          { target_id: 't1', scope: 'location', question_key: 'finding_resolution', step_index: 0, value: 'Repair' },
        ],
        targets: [{ id: 't1', label: 'Apt 2', kind: 'unit' }],
        media: [],
        createSignedUrl,
      }),
    );
    const res = await GET(new Request('http://x/findings.csv'), {
      params: makeParams('i1'),
    });
    const body = await res.text();
    expect(body).toContain('Building / common');
  });

  it('signs each media row once and includes the URL in the row', async () => {
    const createSignedUrl = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed/url1' }, error: null });
    asMock(getHubUserClient).mockResolvedValue(
      makeClient({
        answers: [
          { target_id: 't1', scope: 'unit_category', question_key: 'finding_item_name', step_index: 2, value: 'Chair' },
          { target_id: 't1', scope: 'unit_category', question_key: 'finding_resolution', step_index: 2, value: 'Replace' },
        ],
        targets: [{ id: 't1', label: 'Apt 2', kind: 'unit' }],
        media: [
          { target_id: 't1', question_key: 'finding_media::2', storage_path: 'i1/abc.jpg', kind: 'photo' },
        ],
        createSignedUrl,
      }),
    );
    const res = await GET(new Request('http://x/findings.csv'), {
      params: makeParams('i1'),
    });
    const body = await res.text();
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
    expect(createSignedUrl).toHaveBeenCalledWith('i1/abc.jpg', 60 * 60 * 24 * 7);
    expect(body).toContain('https://signed/url1');
    expect(body).toContain('Apt 2');
  });
});
