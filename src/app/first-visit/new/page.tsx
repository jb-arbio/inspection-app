import Link from 'next/link';
import DealPicker from './DealPicker';
import { getHubAdminSupabase } from '@/lib/firstVisit/hubSupabaseAdmin';

export const dynamic = 'force-dynamic';

async function getDeals() {
  // Read directly via the hub admin client. Middleware already gates this
  // page behind auth, so RLS-bypass via service role is safe here. Avoids
  // a server-side fetch to our own API (which had no auth cookies → got
  // redirected to /login → returned HTML → JSON.parse crash in prod).
  const supabase = getHubAdminSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('deals')
    .select('id, name')
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []) as { id: string; name: string }[];
}

export default async function NewVisitPage() {
  const deals = await getDeals();
  return (
    <main className="mx-auto max-w-md p-6">
      <Link
        href="/first-visit"
        className="mb-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
      >
        ← Back to my visits
      </Link>
      <h1 className="text-xl font-semibold">Pick a deal</h1>
      <DealPicker deals={deals} />
    </main>
  );
}
