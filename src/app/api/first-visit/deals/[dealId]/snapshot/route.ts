import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubServerClient } from '@/lib/firstVisit/hubSupabaseAdmin';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dealId: string }> },
) {
  const { dealId } = await params;
  const supabase = getHubServerClient(getHubSupabase());
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const { data: deal } = await supabase
    .from('deals').select('*').eq('id', dealId).single();
  const { data: locations } = await supabase
    .from('locations').select('*').eq('deal_id', dealId);
  const locationIds = (locations ?? []).map((l: any) => l.id);

  // unit_categories belong to locations, not deals directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let units: any[] = [];
  if (locationIds.length > 0) {
    const { data } = await supabase
      .from('unit_categories').select('*').in('location_id', locationIds);
    units = data ?? [];
  }

  const scopeIds = [dealId, ...locationIds, ...units.map((u) => u.id)];
  const { data: values } = await supabase
    .from('data_point_values')
    .select('data_point_id, scope_id, source, value, submitted_at')
    .in('scope_id', scopeIds);
  const { data: points } = await supabase
    .from('data_points').select('id, slug');

  return NextResponse.json({ deal, locations, units, values, points });
}
