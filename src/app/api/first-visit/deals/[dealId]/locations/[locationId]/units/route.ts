import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubServerClient, getHubRequestClient } from '@/lib/firstVisit/hubSupabaseAdmin';

// On-site creation of a hub unit. Inserts an onboarding.unit_categories row
// under the given location and returns it.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ dealId: string; locationId: string }> },
) {
  const { locationId } = await params;
  const supabase = getHubServerClient((await getHubRequestClient()) ?? getHubSupabase());
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const category_type = String(body?.category_type ?? '').trim() || 'default';

  const { data, error } = await supabase
    .from('unit_categories')
    .insert({ location_id: locationId, category_type })
    .select('id, category_type, custom_name, source_room_name')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'create-failed' }, { status: 500 });
  }
  return NextResponse.json({ unit: data });
}
