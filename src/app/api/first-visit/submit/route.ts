import { NextResponse } from 'next/server';
import { getHubUserClient } from '@/lib/firstVisit/hubSupabaseServer';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';
import { logValueSubmitted } from '@/lib/firstVisit/activityLog';
import { resolveScopeId, type HubScope } from '@/lib/firstVisit/resolveScope';

export async function POST(req: Request) {
  const auth = await getHubRouteContext(await getHubUserClient());
  if (!auth) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  const { supabase, email } = auth;

  const { inspection_id } = await req.json();

  const { data: inspection, error: iErr } = await supabase
    .from('first_visit_inspections')
    .select('id, deal_id')
    .eq('id', inspection_id)
    .single();
  if (iErr || !inspection) return NextResponse.json({ error: 'no-inspection' }, { status: 404 });

  const { data: answers, error: aErr } = await supabase
    .from('first_visit_answers')
    .select('question_key, area_key, scope, location_id, unit_category_id, value, data_point_slug')
    .eq('inspection_id', inspection_id);
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  const slugs = (answers ?? [])
    .map((a) => a.data_point_slug)
    .filter((s): s is string => !!s);
  let dataPoints: { id: string; slug: string }[] = [];
  if (slugs.length > 0) {
    const { data, error } = await supabase
      .from('data_points')
      .select('id, slug')
      .in('slug', slugs);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    dataPoints = data ?? [];
  }
  const slugToDp = Object.fromEntries(dataPoints.map((dp) => [dp.slug, dp]));

  for (const a of answers ?? []) {
    if (!a.data_point_slug) continue;
    const dp = slugToDp[a.data_point_slug];
    if (!dp) continue;
    // The answer carries its own scope; resolve the scope_id directly from the
    // answer's own location_id / unit_category_id (deal falls back to the
    // inspection's deal_id). data_points.level is no longer consulted.
    const scope_id = resolveScopeId(a.scope as HubScope, {
      deal_id: inspection.deal_id,
      location_id: a.location_id ?? undefined,
      unit_category_id: a.unit_category_id ?? undefined,
    });
    if (!scope_id) continue;

    const { error: upErr } = await supabase
      .from('data_point_values')
      .upsert({
        data_point_id: dp.id,
        scope_id,
        source: 'staff_first_visit',
        value: a.value,
      }, { onConflict: 'data_point_id,scope_id,source' });
    if (upErr) continue;

    await logValueSubmitted(supabase, {
      data_point_id: dp.id,
      scope_id,
      source: 'staff_first_visit',
      value: a.value,
      actor_name: email,
    });
  }

  const { error: subErr } = await supabase
    .from('first_visit_inspections')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', inspection_id);
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
