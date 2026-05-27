'use client';
import { useRouter } from 'next/navigation';
import { localDb } from '@/lib/firstVisit/db';
import { enqueue } from '@/lib/firstVisit/sync';
import { track } from '@/lib/firstVisit/analytics';

// Picking a deal creates a visit (inspection scoped to the deal) and routes to
// the navigator. Properties/units are added inside the navigator, not here.
export default function StartVisit({ dealId }: { dealId: string }) {
  const router = useRouter();

  const start = async () => {
    const id = crypto.randomUUID();
    track('first_visit_started', { inspection_id: id, deal_id: dealId });
    const inspection = {
      id,
      deal_id: dealId,
      status: 'draft' as const,
      inspector_email: '', // filled server-side from session
      started_at: new Date().toISOString(),
    };
    await localDb.inspections.put(inspection);
    await enqueue('inspection_upsert', inspection);
    router.push(`/first-visit/${dealId}/${id}`);
  };

  return (
    <button
      onClick={start}
      className="mt-4 w-full rounded-md bg-black px-4 py-3 text-sm font-medium text-white"
    >
      Start visit
    </button>
  );
}
