import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubServerClient, getHubRequestClient } from '@/lib/firstVisit/hubSupabaseAdmin';

export async function GET() {
  const supabase = getHubServerClient((await getHubRequestClient()) ?? getHubSupabase());
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });
  const { data, error } = await supabase
    .from('deals')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deals: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = getHubServerClient((await getHubRequestClient()) ?? getHubSupabase());
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim();
  const form_type = body?.form_type === 'greenfield' ? 'greenfield' : 'care';
  if (!name) {
    return NextResponse.json({ error: 'name-required' }, { status: 400 });
  }

  // Insert deal.
  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .insert({ name, form_type })
    .select('id, name')
    .single();
  if (dealErr || !deal) {
    return NextResponse.json(
      { error: dealErr?.message ?? 'create-failed' },
      { status: 500 },
    );
  }

  // Seed one default location + unit_category so the unit picker isn't empty.
  const { data: location } = await supabase
    .from('locations')
    .insert({ deal_id: deal.id, display_name: name })
    .select('id')
    .single();

  if (location) {
    await supabase.from('unit_categories').insert({
      location_id: location.id,
      category_type: 'default',
    });
  }

  return NextResponse.json({ deal });
}
