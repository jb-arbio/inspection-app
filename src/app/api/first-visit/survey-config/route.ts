import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';
import { validateSurveyContent } from '@/lib/firstVisit/validateSurveyContent';
import { QUESTION_STRUCTURE } from '@/lib/firstVisit/questionStructure';
import type { ContentConfig } from '@/lib/firstVisit/surveyConfig';

export const maxDuration = 30;

const TEMPLATE_KEY = 'first_visit';
const TABLE = 'first_visit_survey_versions';

// GET /api/first-visit/survey-config
//  - no query  -> latest published row (highest version) for the template
//  - ?version=N -> that specific version's content
// Read-only and unauthenticated: the published survey config is what every
// inspector device loads.
export async function GET(req: Request) {
  const supabase = getHubSupabase();
  if (!supabase) {
    return NextResponse.json({ version: null, content: null });
  }

  const url = new URL(req.url);
  const versionParam = url.searchParams.get('version');

  if (versionParam != null) {
    const version = Number(versionParam);
    const { data, error } = await supabase
      .from(TABLE)
      .select('version, content_json')
      .eq('template_key', TEMPLATE_KEY)
      .eq('version', version)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({
      version: data.version,
      content: (data.content_json ?? null) as ContentConfig | null,
    });
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('version, content_json')
    .eq('template_key', TEMPLATE_KEY)
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ version: null, content: null });
  return NextResponse.json({
    version: data.version,
    content: (data.content_json ?? null) as ContentConfig | null,
  });
}

// POST /api/first-visit/survey-config — publish a new survey version.
// Any authenticated user may publish (the whole app is behind login).
// Validates the content, then inserts a published row at (max published) + 1.
export async function POST(req: Request) {
  const auth = await getHubRouteContext(getHubSupabase());
  if (!auth) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  const { supabase, email } = auth;

  const body = await req.json();
  const content = body?.content as ContentConfig;

  const { ok, errors } = validateSurveyContent(content, QUESTION_STRUCTURE);
  if (!ok) {
    return NextResponse.json({ error: 'invalid', errors }, { status: 400 });
  }

  const { data: latest, error: maxErr } = await supabase
    .from(TABLE)
    .select('version')
    .eq('template_key', TEMPLATE_KEY)
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) return NextResponse.json({ error: maxErr.message }, { status: 500 });

  const nextVersion = (latest?.version ?? 0) + 1;

  const { error: insErr } = await supabase.from(TABLE).insert({
    template_key: TEMPLATE_KEY,
    version: nextVersion,
    status: 'published',
    content_json: content,
    created_by: email,
    published_at: new Date().toISOString(),
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ version: nextVersion });
}
