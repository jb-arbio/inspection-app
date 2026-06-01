'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  phasesForScope,
  areaKeyFor,
  groupIdFor,
  buildAnchorMap,
  filterOutAnchored,
  type FirstVisitQuestion,
} from '@/lib/firstVisit/questions';
import { RepeaterStub } from '@/components/firstVisit/PrefilledField';
import { MediaButtons } from '@/components/firstVisit/MediaButtons';
import { AttachAffordance } from '@/components/firstVisit/AttachAffordance';
import { CopyFromUnitPicker } from '@/components/firstVisit/CopyFromUnitPicker';
import { ProgressRing, isAnswered } from '@/components/firstVisit/ProgressRing';
import { StepGroup, QuestionRow } from '@/components/firstVisit/StepGroup';
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
  breadcrumb,
}: {
  inspectionId: string;
  target: SurveyTarget;
  scope: HubScope;
  ctx: InspectionScopeContext;
  snapshot: HubSnapshot | null;
  onBack: () => void;
  breadcrumb?: string[];
}) {
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  // WS-F media anchoring: pull photo/video file-questions out of their own
  // phase ("Property documentation", "Unit photos & videos") and inline them
  // under their related data question. We build the map across the whole
  // scope so an anchor in phase A can pull a file-question that was originally
  // in phase B.
  const phases = useMemo(() => {
    const raw = phasesForScope(scope);
    const allInScope = raw.flatMap((p) => p.questions);
    const anchorMap = buildAnchorMap(allInScope);
    const anchoredSlugs = new Set<string>();
    for (const arr of anchorMap.values()) {
      for (const q of arr) anchoredSlugs.add(q.slug);
    }
    return filterOutAnchored(raw, anchoredSlugs);
  }, [scope]);
  const anchorMap = useMemo(() => {
    const allInScope = phasesForScope(scope).flatMap((p) => p.questions);
    return buildAnchorMap(allInScope);
  }, [scope]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    (async () => {
      const rows = await localDb.answers
        .where('target_id')
        .equals(target.id)
        .toArray();
      const map: Record<string, LocalAnswer> = {};
      for (const r of rows) {
        const base = `${r.target_id}::${r.area_key}::${r.question_key}`;
        // Repeater-aware answers (step_index set) get a step-suffixed key so
        // multiple blocks of the same group don't collide in the map. Single-
        // instance answers keep the legacy 3-part key.
        const key = r.step_index == null ? base : `${base}::${r.step_index}`;
        map[key] = r;
      }
      setAnswers(map);
    })();
  }, [target.id]);

  // Reset to first section when switching targets.
  useEffect(() => {
    setCurrentIdx(0);
  }, [target.id]);

  // Keep the active section chip visible in the strip when it changes, and
  // bring the new section header into view on the page itself. Skip on first
  // mount so we don't snap the page on initial load.
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentIdx]);

  const onChange = async (
    q: FirstVisitQuestion,
    next: { value: unknown; wasAcceptedAsIs: boolean },
    stepIndex: number | null = null,
    syntheticQuestionKey?: string,
  ) => {
    const areaKey = areaKeyFor(q);
    // syntheticQuestionKey lets the renderer route follow-up answers
    // (`${slug}__follow_up`, `${slug}__per_option__${slug(opt)}`) into the
    // same answers table without minting a question on the JSON config.
    const questionKey = syntheticQuestionKey ?? q.slug;
    const baseKey = `${target.id}::${areaKey}::${questionKey}`;
    const key = stepIndex == null ? baseKey : `${baseKey}::${stepIndex}`;
    const now = new Date().toISOString();
    const existing = answers[key];
    const row: LocalAnswer = {
      id: existing?.id ?? crypto.randomUUID(),
      inspection_id: inspectionId,
      target_id: target.id,
      scope,
      location_id: ctx.location_id,
      unit_category_id: ctx.unit_category_id,
      question_key: questionKey,
      area_key: areaKey,
      step_index: stepIndex,
      value: next.value,
      data_point_slug: questionKey,
      hub_suggestion_snapshot: existing?.hub_suggestion_snapshot,
      was_prefilled: !!existing?.was_prefilled,
      was_accepted_as_is: next.wasAcceptedAsIs,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await localDb.answers.put(row);
    track('answer_saved', { question_key: questionKey, inspection_id: inspectionId });
    setAnswers((a) => ({ ...a, [key]: row }));
    await enqueue('answer_upsert', row);
  };

  // Update just the notes field on an answer row without touching value /
  // wasAcceptedAsIs. Creates a stub answer row if none exists yet so the note
  // survives across sessions even before the inspector picks a value.
  const setNotes = async (
    q: FirstVisitQuestion,
    nextNotes: string,
    stepIndex: number | null = null,
  ) => {
    const areaKey = areaKeyFor(q);
    const baseKey = `${target.id}::${areaKey}::${q.slug}`;
    const key = stepIndex == null ? baseKey : `${baseKey}::${stepIndex}`;
    const now = new Date().toISOString();
    const existing = answers[key];
    const row: LocalAnswer = {
      id: existing?.id ?? crypto.randomUUID(),
      inspection_id: inspectionId,
      target_id: target.id,
      scope,
      location_id: ctx.location_id,
      unit_category_id: ctx.unit_category_id,
      question_key: q.slug,
      area_key: areaKey,
      step_index: stepIndex,
      value: existing?.value ?? null,
      notes: nextNotes,
      data_point_slug: q.slug,
      hub_suggestion_snapshot: existing?.hub_suggestion_snapshot,
      was_prefilled: !!existing?.was_prefilled,
      was_accepted_as_is: !!existing?.was_accepted_as_is,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await localDb.answers.put(row);
    setAnswers((a) => ({ ...a, [key]: row }));
    await enqueue('answer_upsert', row);
  };

  // Copy every answer from another unit in this same visit onto the current
  // unit. Skips media, hub-suggestion snapshots, and skipped sentinel values.
  // If the target already has answers, asks for confirmation.
  const copyAnswersFromUnit = async (sourceUnitId: string) => {
    if (scope !== 'unit_category') return;
    const sourceRows = await localDb.answers
      .where('target_id')
      .equals(sourceUnitId)
      .toArray();
    const meaningful = sourceRows.filter(
      (r) => r.value !== null && r.value !== undefined && r.value !== '',
    );
    if (meaningful.length === 0) {
      alert('That unit has no answers to copy yet.');
      return;
    }

    const targetExisting = await localDb.answers
      .where('target_id')
      .equals(target.id)
      .toArray();
    const targetHasAny = targetExisting.some(
      (r) => r.value !== null && r.value !== undefined && r.value !== '',
    );
    if (targetHasAny) {
      const ok = confirm(
        'This unit already has answers. Replace them with the copied values?',
      );
      if (!ok) return;
    }

    const now = new Date().toISOString();
    const indexByKey = new Map<string, LocalAnswer>();
    for (const r of targetExisting) {
      indexByKey.set(`${r.area_key}::${r.question_key}`, r);
    }

    let copied = 0;
    for (const src of meaningful) {
      const existing = indexByKey.get(`${src.area_key}::${src.question_key}`);
      const row: LocalAnswer = {
        id: existing?.id ?? crypto.randomUUID(),
        inspection_id: inspectionId,
        target_id: target.id,
        scope,
        location_id: ctx.location_id,
        unit_category_id: ctx.unit_category_id,
        question_key: src.question_key,
        area_key: src.area_key,
        value: src.value,
        notes: src.notes,
        data_point_slug: src.data_point_slug,
        // Don't carry the source unit's hub-suggestion snapshot onto the target —
        // the target may have its own hub data the inspector still needs to
        // accept/decline. Keep the existing snapshot if any.
        hub_suggestion_snapshot: existing?.hub_suggestion_snapshot,
        was_prefilled: false,
        was_accepted_as_is: false,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      await localDb.answers.put(row);
      await enqueue('answer_upsert', row);
      copied++;
    }

    track('unit_answers_copied', {
      source: sourceUnitId,
      target: target.id,
      count: copied,
    });

    // Refresh in-memory map from Dexie so the UI reflects the copies.
    const fresh = await localDb.answers
      .where('target_id')
      .equals(target.id)
      .toArray();
    const map: Record<string, LocalAnswer> = {};
    for (const r of fresh) map[`${r.target_id}::${r.area_key}::${r.question_key}`] = r;
    setAnswers(map);
  };

  const scopeId = resolveScopeId(scope, ctx) ?? undefined;

  // Progress across the whole scope: required answered / required total.
  // Anchored file-questions render inside another phase but still count
  // toward the anchor's phase progress (they no longer have a phase of their
  // own once "Property documentation" / "Unit photos & videos" empty out).
  const allAnchoredInScope = useMemo(
    () => Array.from(anchorMap.values()).flat(),
    [anchorMap],
  );
  const requiredStats = useMemo(() => {
    const inPhases = phases.flatMap((p) => p.questions);
    const required = [...inPhases, ...allAnchoredInScope].filter((q) => q.required);
    const done = required.filter((q) => {
      const key = `${target.id}::${areaKeyFor(q)}::${q.slug}`;
      return isAnswered(answers[key]?.value);
    }).length;
    return { done, total: required.length };
  }, [phases, allAnchoredInScope, answers, target.id]);

  // Index of the next phase that has a required, unanswered question, searching
  // from currentIdx + 1 forward, then wrapping to 0..currentIdx. Returns null
  // when every required question across all phases is already answered.
  // Anchored file-questions are folded into their anchor's phase here so
  // skipping forward considers them too.
  const anchoredByAnchorPhase = useMemo(() => {
    const m = new Map<string, FirstVisitQuestion[]>();
    for (const p of phases) {
      const list: FirstVisitQuestion[] = [];
      for (const q of p.questions) {
        const a = anchorMap.get(q.slug);
        if (a) list.push(...a);
      }
      if (list.length > 0) m.set(p.id, list);
    }
    return m;
  }, [phases, anchorMap]);
  const nextIncompletePhaseIdx = useMemo(() => {
    const phaseHasIncomplete = (p: (typeof phases)[number]) => {
      const own = p.questions;
      const anchored = anchoredByAnchorPhase.get(p.id) ?? [];
      return [...own, ...anchored].some((q) => {
        if (!q.required) return false;
        const key = `${target.id}::${areaKeyFor(q)}::${q.slug}`;
        return !isAnswered(answers[key]?.value);
      });
    };
    for (let i = currentIdx + 1; i < phases.length; i++) {
      if (phaseHasIncomplete(phases[i])) return i;
    }
    for (let i = 0; i <= currentIdx; i++) {
      if (phaseHasIncomplete(phases[i])) return i;
    }
    return null;
  }, [phases, anchoredByAnchorPhase, answers, target.id, currentIdx]);

  if (phases.length === 0) {
    return (
      <main className="mx-auto max-w-md p-6">
        <button
          onClick={onBack}
          tabIndex={-1}
          className="mb-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
        >
          ← Back to visit
        </button>
        <h1 className="text-lg font-semibold">{target.label}</h1>
        <p className="mt-6 text-sm text-gray-500">
          No questions configured for this scope yet.
        </p>
      </main>
    );
  }

  const phase = phases[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === phases.length - 1;

  return (
    <main className="mx-auto max-w-md p-6 pb-24">
      <button
        onClick={onBack}
        tabIndex={-1}
        className="mb-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
      >
        ← Back to visit
      </button>
      {breadcrumb && breadcrumb.length > 1 && (
        // Show only the parent context — the last item duplicates the H1.
        // For property scope the breadcrumb is single-item, so nothing renders.
        <div className="mb-3 text-xs text-gray-400">
          {breadcrumb.slice(0, -1).map((crumb, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1 text-gray-300">›</span>}
              <span>{crumb}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-lg font-semibold">{target.label}</h1>
        <ProgressRing done={requiredStats.done} total={requiredStats.total} />
      </div>

      {scope === 'unit_category' && (
        <div className="mt-3">
          <CopyFromUnitPicker
            inspectionId={inspectionId}
            currentUnitId={target.id}
            onCopy={copyAnswersFromUnit}
          />
        </div>
      )}

      {/* Sticky horizontal section strip */}
      <div className="sticky top-0 z-10 -mx-6 mt-3 bg-white px-6 pb-2 pt-1">
        <div
          ref={stripRef}
          className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {phases.map((p, i) => {
            const active = i === currentIdx;
            // Section completion dot: any required question done for this phase.
            // Include anchored file-questions that render inside this phase.
            const anchoredHere = anchoredByAnchorPhase.get(p.id) ?? [];
            const reqInPhase = [...p.questions, ...anchoredHere].filter(
              (q) => q.required,
            );
            const doneInPhase = reqInPhase.filter((q) => {
              const key = `${target.id}::${areaKeyFor(q)}::${q.slug}`;
              return isAnswered(answers[key]?.value);
            }).length;
            const phaseComplete = reqInPhase.length > 0 && doneInPhase === reqInPhase.length;

            return (
              <button
                key={p.id}
                ref={active ? activeChipRef : undefined}
                onClick={() => setCurrentIdx(i)}
                tabIndex={-1}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                  active
                    ? 'bg-black text-white'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{p.label}</span>
                <span
                  aria-hidden
                  className={`text-[10px] tabular-nums ${
                    active ? 'text-white/70' : 'text-gray-400'
                  }`}
                >
                  {p.questions.length + anchoredHere.length}
                </span>
                {phaseComplete && (
                  <span
                    aria-hidden
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      active ? 'bg-white' : 'bg-emerald-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section key={phase.id} ref={sectionRef} className="mt-4 scroll-mt-20">
        <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
          {phase.label}
        </div>
        <div className="mt-2 flex flex-col gap-3">
          {buildRenderPlan(phase.questions).map((node) => {
            if (node.kind === 'group') {
              // Anchored children for any question in the group are rendered
              // after the group block (groups don't slice file-questions
              // mid-block; the StepGroup owns its own layout).
              const groupAnchored = node.questions.flatMap(
                (gq) => anchorMap.get(gq.slug) ?? [],
              );
              return (
                <div key={`group-${node.groupId}`} className="flex flex-col gap-3">
                  <StepGroup
                    groupId={node.groupId}
                    questions={node.questions}
                    inspectionId={inspectionId}
                    targetId={target.id}
                    areaKey={phase.id}
                    hubValueLookup={(slug) =>
                      snapshot ? lookupHubValue(snapshot, scopeId, slug) : undefined
                    }
                    answers={answers}
                    onChange={onChange}
                    setNotes={setNotes}
                  />
                  {groupAnchored.map((fq) =>
                    renderAnchoredFile(fq, {
                      inspectionId,
                      targetId: target.id,
                      areaKey: phase.id,
                      answers,
                      setNotes,
                    }),
                  )}
                </div>
              );
            }

            const q = node.question;
            const key = `${target.id}::${areaKeyFor(q)}::${q.slug}`;
            const answer = answers[key];
            const anchored = anchorMap.get(q.slug) ?? [];

            if (q.type === 'repeater') {
              return (
                <div key={key} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <RepeaterStub
                      question={q}
                      value={answer?.value}
                      onChange={(c) => onChange(q, c)}
                    />
                    <AttachAffordance
                      inspectionId={inspectionId}
                      targetId={target.id}
                      areaKey={phase.id}
                      questionKey={q.slug}
                      answerId={answer?.id}
                      notes={answer?.notes}
                      onNotesChange={(n) => setNotes(q, n)}
                    />
                  </div>
                  {anchored.map((fq) =>
                    renderAnchoredFile(fq, {
                      inspectionId,
                      targetId: target.id,
                      areaKey: phase.id,
                      answers,
                      setNotes,
                    }),
                  )}
                </div>
              );
            }

            if (q.type === 'file') {
              return (
                <div key={key} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <MediaButtons
                      inspectionId={inspectionId}
                      targetId={target.id}
                      areaKey={phase.id}
                      questionKey={q.slug}
                      answerId={answer?.id}
                      label={q.label}
                      description={q.description}
                      required={q.required}
                    />
                    <AttachAffordance
                      inspectionId={inspectionId}
                      targetId={target.id}
                      areaKey={phase.id}
                      questionKey={q.slug}
                      answerId={answer?.id}
                      notes={answer?.notes}
                      onNotesChange={(n) => setNotes(q, n)}
                    />
                  </div>
                  {anchored.map((fq) =>
                    renderAnchoredFile(fq, {
                      inspectionId,
                      targetId: target.id,
                      areaKey: phase.id,
                      answers,
                      setNotes,
                    }),
                  )}
                </div>
              );
            }

            return (
              <div key={key} className="flex flex-col gap-3">
                <QuestionRow
                  question={q}
                  inspectionId={inspectionId}
                  targetId={target.id}
                  areaKey={phase.id}
                  stepIndex={null}
                  hubValue={snapshot ? lookupHubValue(snapshot, scopeId, q.slug) : undefined}
                  answers={answers}
                  onChange={onChange}
                  setNotes={setNotes}
                />
                {anchored.map((fq) =>
                  renderAnchoredFile(fq, {
                    inspectionId,
                    targetId: target.id,
                    areaKey: phase.id,
                    answers,
                    setNotes,
                  }),
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        {nextIncompletePhaseIdx === null ? (
          <span className="text-xs text-emerald-600">✓ All required answered</span>
        ) : (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setCurrentIdx(nextIncompletePhaseIdx)}
            className="text-xs text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
          >
            Skip to next incomplete →
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => !isFirst && setCurrentIdx((i) => i - 1)}
          disabled={isFirst}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          ← Prev
        </button>
        <div className="text-xs text-gray-400 tabular-nums">
          {currentIdx + 1} / {phases.length}
        </div>
        {isLast ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={onBack}
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            Done — back to overview ↩
          </button>
        ) : (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setCurrentIdx((i) => i + 1)}
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            Next →
          </button>
        )}
      </div>
    </main>
  );
}

// Render an anchored file question inline beneath its anchor (WS-F). The
// rendering matches the standalone file-question branch in the main loop —
// MediaButtons + AttachAffordance — but is keyed off the anchored question's
// own slug so its answers are stored independently of the anchor.
function renderAnchoredFile(
  fq: FirstVisitQuestion,
  args: {
    inspectionId: string;
    targetId: string;
    /** Unused — anchored questions keep their original area_key (phase_id)
     *  so answer storage doesn't shift just because they render elsewhere. */
    areaKey: string;
    answers: Record<string, LocalAnswer>;
    setNotes: (q: FirstVisitQuestion, nextNotes: string, stepIndex?: number | null) => void;
  },
) {
  const { inspectionId, targetId, answers, setNotes } = args;
  // Anchored file-questions keep their original area_key. The visual location
  // moves; the storage coordinate doesn't. This means existing media (if any)
  // is preserved across the WS-F render change.
  const ownAreaKey = areaKeyFor(fq);
  const key = `${targetId}::${ownAreaKey}::${fq.slug}`;
  const answer = answers[key];
  return (
    <div
      key={`anchored-${fq.slug}`}
      data-anchored-to={fq.anchor_to}
      className="ml-3 flex flex-col gap-1 border-l-2 border-gray-100 pl-3"
    >
      <MediaButtons
        inspectionId={inspectionId}
        targetId={targetId}
        areaKey={ownAreaKey}
        questionKey={fq.slug}
        answerId={answer?.id}
        label={fq.label}
        description={fq.description}
        required={fq.required}
      />
      <AttachAffordance
        inspectionId={inspectionId}
        targetId={targetId}
        areaKey={ownAreaKey}
        questionKey={fq.slug}
        answerId={answer?.id}
        notes={answer?.notes}
        onNotesChange={(n) => setNotes(fq, n)}
      />
    </div>
  );
}

// Render plan node: either a single flat question or a grouped block of
// consecutive questions sharing a `group_id`. We walk the phase's question
// list once and merge runs of equal group_id into a single 'group' node so
// the StepGroup renderer owns the block lifecycle for that span.
type RenderNode =
  | { kind: 'question'; question: FirstVisitQuestion }
  | { kind: 'group'; groupId: string; questions: FirstVisitQuestion[] };

function buildRenderPlan(questions: FirstVisitQuestion[]): RenderNode[] {
  const out: RenderNode[] = [];
  let bucket: { groupId: string; questions: FirstVisitQuestion[] } | null = null;
  for (const q of questions) {
    const gid = groupIdFor(q);
    if (gid == null) {
      if (bucket) {
        out.push({ kind: 'group', groupId: bucket.groupId, questions: bucket.questions });
        bucket = null;
      }
      out.push({ kind: 'question', question: q });
      continue;
    }
    if (bucket && bucket.groupId === gid) {
      bucket.questions.push(q);
    } else {
      if (bucket) {
        out.push({ kind: 'group', groupId: bucket.groupId, questions: bucket.questions });
      }
      bucket = { groupId: gid, questions: [q] };
    }
  }
  if (bucket) {
    out.push({ kind: 'group', groupId: bucket.groupId, questions: bucket.questions });
  }
  return out;
}
