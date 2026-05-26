import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';

export async function GET() {
  const supabase = getHubSupabase();
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });
  const { data, error } = await supabase
    .from('deals')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deals: data ?? [] });
}
