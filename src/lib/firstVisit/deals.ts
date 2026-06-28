import { getHubSupabase } from './hubSupabase';
import { getHubServerClient, getHubRequestClient } from './hubSupabaseAdmin';

export type FirstVisitDeal = { id: string; name: string };

// Load deals for the "pick a deal" screen. SERVER-ONLY (uses the hub client).
//
// Never throws: returns [] if the hub isn't configured or the query fails, so
// the New Visit page renders the create-deal form instead of crashing. This is
// the data source for both the GET /api/first-visit/deals route and the
// /first-visit/new server component — the page must NOT fetch its own API route
// (that broke in prod: an absolute self-URL fell back to localhost, and the
// route sits behind auth middleware a server-to-self fetch can't satisfy).
export async function listFirstVisitDeals(): Promise<FirstVisitDeal[]> {
  try {
    const supabase = getHubServerClient((await getHubRequestClient()) ?? getHubSupabase());
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('deals')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      console.error('[listFirstVisitDeals] hub query failed:', error.message);
      return [];
    }
    return (data ?? []).map((d: { id: string; name: string }) => ({
      id: d.id,
      name: d.name,
    }));
  } catch (err) {
    console.error('[listFirstVisitDeals] unexpected error:', err);
    return [];
  }
}
