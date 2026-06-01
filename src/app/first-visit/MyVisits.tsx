'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { localDb, type LocalInspection, type LocalAnswer } from '@/lib/firstVisit/db';

type DealRow = { id: string; name?: string };

// One row per deal — picks the most-recent inspection for that deal so the
// list doesn't blow up when an inspector re-opens the same deal repeatedly.
type Row = {
  deal_id: string;
  deal_name?: string;
  inspection: LocalInspection;
  lastActivity: string; // ISO
};

function pickLatest(insps: LocalInspection[]): LocalInspection {
  // Latest by submitted_at if present, else started_at.
  return insps.reduce((acc, i) => {
    const ts = (x: LocalInspection) => x.submitted_at ?? x.started_at;
    return ts(i) > ts(acc) ? i : acc;
  });
}

async function latestAnswerTs(inspectionId: string): Promise<string | null> {
  const rows: LocalAnswer[] = await localDb.answers
    .where('inspection_id')
    .equals(inspectionId)
    .toArray();
  if (rows.length === 0) return null;
  return rows.reduce((acc, r) => (r.updated_at > acc ? r.updated_at : acc), '');
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const opts: Intl.DateTimeFormatOptions = sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleString(undefined, opts);
}

export default function MyVisits() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      // Pull local inspections + hub deal names in parallel. Deal fetch can
      // fail offline — we still render with UUID-prefix fallbacks.
      const [insps, dealsRes] = await Promise.all([
        localDb.inspections.toArray(),
        fetch('/api/first-visit/deals')
          .then((r) => (r.ok ? r.json() : { deals: [] }))
          .catch(() => ({ deals: [] })),
      ]);
      const deals: DealRow[] = dealsRes.deals ?? [];
      const dealNameById = new Map(deals.map((d) => [d.id, d.name]));

      // Group inspections by deal_id, keep the latest per deal.
      const byDeal = new Map<string, LocalInspection[]>();
      for (const i of insps) {
        const list = byDeal.get(i.deal_id) ?? [];
        list.push(i);
        byDeal.set(i.deal_id, list);
      }

      const out: Row[] = await Promise.all(
        Array.from(byDeal.entries()).map(async ([deal_id, list]) => {
          const inspection = pickLatest(list);
          const answersTs = await latestAnswerTs(inspection.id);
          const lastActivity =
            answersTs ?? inspection.submitted_at ?? inspection.started_at;
          return {
            deal_id,
            deal_name: dealNameById.get(deal_id),
            inspection,
            lastActivity,
          };
        }),
      );
      out.sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1));
      setRows(out);
    })();
  }, []);

  if (rows === null) {
    return <p className="mt-2 text-sm text-gray-500">Loading…</p>;
  }
  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-gray-500">No visits yet.</p>;
  }
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.deal_id} className="rounded border border-gray-200 p-3 hover:bg-gray-50">
          <Link
            href={`/first-visit/${r.deal_id}/${r.inspection.id}`}
            className="block"
          >
            <div className="text-sm font-medium">
              {r.deal_name ?? `Deal ${r.deal_id.slice(0, 8)}…`}
            </div>
            <div className="text-xs text-gray-500">
              {r.inspection.status} · last activity {formatWhen(r.lastActivity)}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
