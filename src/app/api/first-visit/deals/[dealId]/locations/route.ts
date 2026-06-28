import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubServerClient, getHubRequestClient } from '@/lib/firstVisit/hubSupabaseAdmin';

// On-site creation of a hub property. Inserts an onboarding.locations row and
// returns it so the client can hang a local property target off the real id.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ dealId: string }> },
) {
  const { dealId } = await params;
  const supabase = getHubServerClient((await getHubRequestClient()) ?? getHubSupabase());
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const display_name = String(body?.display_name ?? '').trim();
  if (!display_name) return NextResponse.json({ error: 'name-required' }, { status: 400 });

  const { data, error } = await supabase
    .from('locations')
    .insert({ deal_id: dealId, display_name })
    .select('id, display_name')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'create-failed' }, { status: 500 });
  }
  return NextResponse.json({ location: data });
}
