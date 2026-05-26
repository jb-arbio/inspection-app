'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { localDb, type LocalInspection } from '@/lib/firstVisit/db';

export default function MyVisits() {
  const [rows, setRows] = useState<LocalInspection[]>([]);
  useEffect(() => {
    localDb.inspections.toArray().then(setRows);
  }, []);
  if (rows.length === 0) return <p className="mt-2 text-sm text-gray-500">No visits yet.</p>;
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded border border-gray-200 p-3">
          <Link href={`/first-visit/${r.deal_id}/${r.id}`} className="block">
            <div className="text-sm font-medium">Deal {r.deal_id.slice(0, 8)}…</div>
            <div className="text-xs text-gray-500">
              {r.status} · started {new Date(r.started_at).toLocaleDateString()}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
