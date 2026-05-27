'use client';
import { useEffect, useState } from 'react';
import {
  DEV_QUESTIONS,
  byArea,
  questionsForScope,
  type FirstVisitQuestion,
} from '@/lib/firstVisit/questions';
import { PrefilledField } from '@/components/firstVisit/PrefilledField';
import { MediaButtons } from '@/components/firstVisit/MediaButtons';
import { localDb, type LocalAnswer } from '@/lib/firstVisit/db';
import { enqueue } from '@/lib/firstVisit/sync';
import {
  resolveScopeId,
  type HubScope,
  type InspectionScopeContext,
} from '@/lib/firstVisit/resolveScope';
import { lookupHubValue, type HubSnapshot } from '@/lib/firstVisit/snapshot';
import { track } from '@/lib/firstVisit/analytics';

// A target the survey is rendering for. The deal-scoped visit root is a
// synthetic target whose id === inspectionId.
export type SurveyTarget = {
  id: string;
  label: string;
};

export function UnitSurvey({
  inspectionId,
  target,
  scope,
  ctx,
  snapshot,
  onBack,
}: {
  inspectionId: string;
  target: SurveyTarget;
  scope: HubScope;
  ctx: InspectionScopeContext;
  snapshot: HubSnapshot | null;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});

  useEffect(() => {
    (async () => {
      const rows = await localDb.answers
        .where('target_id')
        .equals(target.id)
        .toArray();
      const map: Record<string, LocalAnswer> = {};
      for (const r of rows) map[`${r.target_id}::${r.area_key}::${r.question_key}`] = r;
      setAnswers(map);
    })();
  }, [target.id]);

  const onChange = async (
    q: FirstVisitQuestion,
    next: { value: unknown; wasAcceptedAsIs: boolean },
  ) => {
    const key = `${target.id}::${q.area_key}::${q.question_key}`;
    const now = new Date().toISOString();
    const existing = answers[key];
    const row: LocalAnswer = {
      id: existing?.id ?? crypto.randomUUID(),
      inspection_id: inspectionId,
      target_id: target.id,
      scope,
      location_id: ctx.location_id,
      unit_category_id: ctx.unit_category_id,
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

  const scopeId = resolveScopeId(scope, ctx) ?? undefined;
  const grouped = byArea(questionsForScope(DEV_QUESTIONS, scope));

  return (
    <main className="mx-auto max-w-md p-6">
      <button
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
      >
        ← Back to visit
      </button>
      <h1 className="text-lg font-semibold">{target.label}</h1>

      {Object.entries(grouped).map(([area, qs]) => (
        <section key={area} className="mt-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">{area}</h2>
          <div className="mt-2 flex flex-col gap-3">
            {qs.map((q) => {
              const key = `${target.id}::${q.area_key}::${q.question_key}`;
              return (
                <div key={key} className="flex flex-col gap-2">
                  <PrefilledField
                    question={q}
                    hubValue={
                      snapshot && q.data_point_slug
                        ? lookupHubValue(snapshot, scopeId, q.data_point_slug)
                        : undefined
                    }
                    value={answers[key]?.value ?? ''}
                    onChange={(c) => onChange(q, c)}
                  />
                  <MediaButtons
                    inspectionId={inspectionId}
                    targetId={target.id}
                    areaKey={q.area_key}
                    questionKey={q.question_key}
                    answerId={answers[key]?.id}
                    evidence={q.evidence}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
