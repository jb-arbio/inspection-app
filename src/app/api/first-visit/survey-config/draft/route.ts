import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';
import { isAdminEmail } from '@/lib/firstVisit/adminAccess';
import type { ContentConfig } from '@/lib/firstVisit/surveyConfig';

export const maxDuration = 30;

const TEMPLATE_KEY = 'first_visit';
const TABLE = 'first_visit_survey_versions';

// GET /api/first-visit/survey-config/draft — admin-only.
// Returns the single draft row's content, or {version:null, content:null}.
export async function GET() {
  const auth = await getHubRouteContext(getHubSupabase());
  if (!auth) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  const { supabase, email } = auth;
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('version, content_json')
    .eq('template_key', TEMPLATE_KEY)
    .eq('status', 'draft')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ version: null, content: null });
  return NextResponse.json({
    version: data.version,
    content: (data.content_json ?? null) as ContentConfig | null,
  });
}

// PUT /api/first-visit/survey-config/draft — admin-only.
// Upsert the single draft row (template_key='first_visit', status='draft').
export async function PUT(req: Request) {
  const auth = await getHubRouteContext(getHubSupabase());
  if (!auth) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  const { supabase, email } = auth;
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const content = body?.content as ContentConfig;

  const { error } = await supabase.from(TABLE).upsert(
    {
      template_key: TEMPLATE_KEY,
      status: 'draft',
      content_json: content,
      created_by: email,
    },
    { onConflict: 'template_key,status' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
