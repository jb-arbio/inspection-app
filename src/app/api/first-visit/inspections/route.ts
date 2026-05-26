import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';

export async function POST(req: Request) {
  const ctx = await getHubRouteContext(getHubSupabase());
  if (!ctx) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  const { supabase, email } = ctx;

  const body = await req.json();
  const row = {
    id: body.id,
    deal_id: body.deal_id,
    location_id: body.location_id ?? null,
    unit_category_id: body.unit_category_id ?? null,
    status: body.status ?? 'draft',
    inspector_email: email,
    started_at: body.started_at ?? new Date().toISOString(),
    submitted_at: body.submitted_at ?? null,
  };
  const { error } = await supabase.from('first_visit_inspections').upsert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
