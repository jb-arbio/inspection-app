'use client';
import { useEffect, useState, useMemo } from 'react';
import { DEV_QUESTIONS, byArea, type FirstVisitQuestion } from '@/lib/firstVisit/questions';
import { PrefilledField } from '@/components/firstVisit/PrefilledField';
import { MediaButtons } from '@/components/firstVisit/MediaButtons';
import { localDb, type LocalAnswer } from '@/lib/firstVisit/db';
import { enqueue } from '@/lib/firstVisit/sync';
import { useSyncEngine } from '@/lib/firstVisit/useSyncEngine';
import { createHandlers } from '@/lib/firstVisit/handlers';
import { lookupHubValue, type HubSnapshot } from '@/lib/firstVisit/snapshot';
import { downloadInspectionZip } from '@/lib/firstVisit/export';
import { SyncBadge } from '@/components/firstVisit/SyncBadge';
import { track } from '@/lib/firstVisit/analytics';

export default function SurveyFlow({
  dealId,
  inspectionId,
  previewSnapshot,
  previewUnitCategoryId,
}: {
  dealId: string;
  inspectionId: string;
  previewSnapshot?: HubSnapshot;
  previewUnitCategoryId?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [snapshot, setSnapshot] = useState<HubSnapshot | null>(previewSnapshot ?? null);
  const [unitCategoryId, setUnitCategoryId] = useState<string | undefined>(previewUnitCategoryId);
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

  useEffect(() => {
    if (previewSnapshot) return; // preview mode: skip network fetch
    fetch(`/api/first-visit/deals/${dealId}/snapshot`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSnapshot)
      .catch(() => setSnapshot(null));
    localDb.inspections.get(inspectionId).then((i) => setUnitCategoryId(i?.unit_category_id));
  }, [dealId, inspectionId, previewSnapshot]);

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
    track('answer_saved', { question_key: q.question_key, inspection_id: inspectionId });
    setAnswers((a) => ({ ...a, [key]: row }));
    await enqueue('answer_upsert', row);
  };

  const submit = async () => {
    if (!confirm('Submit this visit? You will not be able to edit it after.')) return;
    track('submit_clicked', { inspection_id: inspectionId });
    await localDb.inspections.update(inspectionId, {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });
    await enqueue('submit', { inspection_id: inspectionId });
    syncNow().catch(() => {});
  };

  const grouped = byArea(DEV_QUESTIONS);

  return (
    <main className="mx-auto max-w-md p-6">
      <header className="sticky top-0 bg-white pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">First Visit</h1>
          <div className="flex items-center gap-2 text-xs">
            <SyncBadge pending={pending} syncing={syncing} />
            <button
              onClick={syncNow}
              disabled={syncing}
              className="rounded border border-gray-300 px-2 py-0.5"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button onClick={() => downloadInspectionZip(inspectionId)} className="rounded border border-gray-300 px-2 py-0.5 text-xs">Export</button>
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
                <div key={key} className="flex flex-col gap-2">
                  <PrefilledField
                    question={q}
                    hubValue={snapshot && q.data_point_slug
                      ? lookupHubValue(snapshot, { deal_id: dealId, unit_category_id: unitCategoryId }, q.data_point_slug)
                      : undefined}
                    value={answers[key]?.value ?? ''}
                    onChange={(c) => onChange(q, c)}
                  />
                  <MediaButtons
                    inspectionId={inspectionId}
                    areaKey={q.area_key}
                    questionKey={q.question_key}
                    answerId={answers[key]?.id}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <button onClick={submit} className="mt-6 w-full rounded-md bg-black px-4 py-3 text-white">
        Submit visit
      </button>
    </main>
  );
}
