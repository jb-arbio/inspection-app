import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dealId: string }> },
) {
  const { dealId } = await params;
  const supabase = getHubSupabase();
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const { data: deal } = await supabase
    .from('deals').select('*').eq('id', dealId).single();
  const { data: locations } = await supabase
    .from('locations').select('*').eq('deal_id', dealId);
  const { data: units } = await supabase
    .from('unit_categories').select('*').eq('deal_id', dealId);
  const { data: values } = await supabase
    .from('data_point_values')
    .select('data_point_id, scope_id, source, value, submitted_at')
    .in('scope_id', [
      dealId,
      ...(locations ?? []).map((l: any) => l.id),
      ...(units ?? []).map((u: any) => u.id),
    ]);
  const { data: points } = await supabase
    .from('data_points').select('id, slug, level');

  return NextResponse.json({ deal, locations, units, values, points });
}
