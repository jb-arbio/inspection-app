'use client';
import { useEffect, useState, useMemo } from 'react';
import { DEV_QUESTIONS, byArea, type FirstVisitQuestion } from '@/lib/firstVisit/questions';
import { PrefilledField } from '@/components/firstVisit/PrefilledField';
import { localDb, type LocalAnswer } from '@/lib/firstVisit/db';
import { enqueue } from '@/lib/firstVisit/sync';
import { useSyncEngine } from '@/lib/firstVisit/useSyncEngine';
import { createHandlers } from '@/lib/firstVisit/handlers';

export default function SurveyFlow({ dealId, inspectionId }: { dealId: string; inspectionId: string }) {
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const handlers = useMemo(() => createHandlers(), []);
  const { pending, syncNow, syncing } = useSyncEngine(handlers);

  useEffect(() => {
    (async () => {
      const rows = await localDb.answers
        .where('inspection_id').equals(inspectionId).toArray();
      const map: Record<string, LocalAnswer> = {};
      for (const r of rows) map[`${r.area_key}::${r.question_key}`] = r;
      setAnswers(map);
    })();
  }, [inspectionId]);

  const onChange = async (q: FirstVisitQuestion, next: { value: unknown; wasAcceptedAsIs: boolean }) => {
    const key = `${q.area_key}::${q.question_key}`;
    const now = new Date().toISOString();
    const existing = answers[key];
    const row: LocalAnswer = {
      id: existing?.id ?? crypto.randomUUID(),
      inspection_id: inspectionId,
      question_key: q.question_key,
      area_key: q.area_key,
      value: next.value,
      data_point_slug: q.data_point_slug,
      hub_suggestion_snapshot: existing?.hub_suggestion_snapshot,
      was_prefilled: !!existing?.was_prefilled,
      was_accepted_as_is: next.wasAcceptedAsIs,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await localDb.answers.put(row);
    setAnswers((a) => ({ ...a, [key]: row }));
    await enqueue('answer_upsert', row);
  };

  const grouped = byArea(DEV_QUESTIONS);

  return (
    <main className="mx-auto max-w-md p-6">
      <header className="sticky top-0 bg-white pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">First Visit</h1>
          <div className="flex items-center gap-2 text-xs">
            <span>{pending} pending</span>
            <button
              onClick={syncNow}
              disabled={syncing}
              className="rounded border border-gray-300 px-2 py-0.5"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>
      </header>

      {Object.entries(grouped).map(([area, qs]) => (
        <section key={area} className="mt-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">{area}</h2>
          <div className="mt-2 flex flex-col gap-3">
            {qs.map((q) => {
              const key = `${q.area_key}::${q.question_key}`;
              return (
                <PrefilledField
                  key={key}
                  question={q}
                  hubValue={undefined /* wired in Task 33 */}
                  value={answers[key]?.value ?? ''}
                  onChange={(c) => onChange(q, c)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
