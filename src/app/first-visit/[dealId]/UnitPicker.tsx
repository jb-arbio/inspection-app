'use client';
import { useRouter } from 'next/navigation';
import { localDb } from '@/lib/firstVisit/db';
import { enqueue } from '@/lib/firstVisit/sync';
import { track } from '@/lib/firstVisit/analytics';

type Unit = { id: string; name?: string };
type Snap = { deal: { id: string; name?: string }; locations: Unit[]; units: Unit[] };

export default function UnitPicker({ dealId, snapshot }: { dealId: string; snapshot: Snap }) {
  const router = useRouter();
  const units = snapshot.units ?? [];

  const start = async (unit: Unit) => {
    const id = crypto.randomUUID();
    track('first_visit_started', { inspection_id: id, deal_id: dealId });
    track('unit_selected', { unit_id: unit.id });
    const inspection = {
      id,
      deal_id: dealId,
      location_id: snapshot.locations?.[0]?.id,
      unit_category_id: unit.id,
      status: 'draft' as const,
      inspector_email: '', // filled server-side from session
      started_at: new Date().toISOString(),
    };
    await localDb.inspections.put(inspection);
    await enqueue('inspection_upsert', inspection);
    router.push(`/first-visit/${dealId}/${id}`);
  };

  if (units.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">No unit categories on this deal.</p>;
  }
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {units.map((u) => (
        <li key={u.id}>
          <button
            onClick={() => start(u)}
            className="block w-full rounded border border-gray-200 p-3 text-left"
          >
            {u.name ?? u.id}
          </button>
        </li>
      ))}
    </ul>
  );
}
