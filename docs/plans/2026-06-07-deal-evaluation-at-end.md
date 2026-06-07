# Deal Evaluation at the End — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the navigator's deal-scoped card so visit metadata (phase 1) stays at the top and the 7 deal-evaluation questions (phase 11) move to a new "Deal evaluation" card at the bottom, after Properties.

**Architecture:** Pure UI split — answers keep the same target/scope/slugs. A `phaseIds?: string[]` filter threads through `phasesForScope` → `computeProgressFromAnswers` → `UnitSurvey` → two navigator cards. No data-model change.

**Tech Stack:** Next.js App Router client components, Vitest + jsdom + @testing-library/react.

**Design doc:** `docs/plans/2026-06-07-deal-evaluation-at-end-design.md`

**Conventions:** run `npx vitest run <file>` per task, `npx vitest run && npx tsc --noEmit` before each commit. Branch: `feat/deal-evaluation-at-end` (already created, based on upstream/main).

---

### Task 1: `phasesForScope` phase filter

**Files:**
- Modify: `src/lib/firstVisit/questions.ts` (the `phasesForScope` export, ~line 511)
- Test: `src/lib/firstVisit/__tests__/questions.phaseFilter.test.ts` (new)

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { phasesForScope } from '../questions';

describe('phasesForScope phase filter', () => {
  it('returns all deal phases when no filter is given (regression)', () => {
    const all = phasesForScope('deal');
    expect(all.map((p) => p.id)).toEqual(['1', '11']);
  });

  it("['1'] returns only visit metadata", () => {
    const filtered = phasesForScope('deal', ['1']);
    expect(filtered.map((p) => p.id)).toEqual(['1']);
    // sanity: the metadata questions live here
    const slugs = filtered.flatMap((p) => p.questions.map((q) => q.slug));
    expect(slugs).toContain('fv_visit_date');
    expect(slugs).not.toContain('fv_readiness_health_score');
  });

  it("['11'] returns only the final assessment", () => {
    const filtered = phasesForScope('deal', ['11']);
    expect(filtered.map((p) => p.id)).toEqual(['11']);
    const slugs = filtered.flatMap((p) => p.questions.map((q) => q.slug));
    expect(slugs).toContain('fv_readiness_health_score');
    expect(slugs).not.toContain('fv_visit_date');
  });

  it('the two filtered sets partition the unfiltered set exactly', () => {
    const all = phasesForScope('deal').flatMap((p) => p.questions.map((q) => q.slug));
    const a = phasesForScope('deal', ['1']).flatMap((p) => p.questions.map((q) => q.slug));
    const b = phasesForScope('deal', ['11']).flatMap((p) => p.questions.map((q) => q.slug));
    expect([...a, ...b].sort()).toEqual([...all].sort());
  });

  it('does not affect other scopes when no filter is given', () => {
    expect(phasesForScope('location').length).toBeGreaterThan(0);
    expect(phasesForScope('unit_category').length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run, expect FAIL** (`phasesForScope` takes 1 arg today; the 2-arg call type-errors / filter not applied):
`npx vitest run src/lib/firstVisit/__tests__/questions.phaseFilter.test.ts`

**Step 3: Implement** — in `src/lib/firstVisit/questions.ts`, change `phasesForScope` to:

```typescript
export function phasesForScope(scope: HubScope, phaseIds?: string[]): FirstVisitPhase[] {
  const phases = PHASES.map((p) => ({
    ...p,
    questions: p.questions.filter((q) => q.scope === scope),
  })).filter((p) => p.questions.length > 0);
  // Optional phase filter: lets the UI render a subset of a scope's phases as
  // its own card (e.g. deal phase '1' at the top of the navigator, phase '11'
  // "Deal evaluation" at the bottom). Absent = all phases, unchanged behavior.
  if (!phaseIds) return phases;
  const wanted = new Set(phaseIds);
  return phases.filter((p) => wanted.has(p.id));
}
```

(Keep the body consistent with whatever the current implementation does — read it first; only ADD the filter at the end, do not change the existing mapping/filtering.)

**Step 4: Run, expect PASS (5 tests).** Also `npx vitest run` full + `npx tsc --noEmit`.

**Step 5: Commit**
```bash
git add src/lib/firstVisit/questions.ts src/lib/firstVisit/__tests__/questions.phaseFilter.test.ts
git commit -m "feat(fv): optional phaseIds filter on phasesForScope"
```

---

### Task 2: progress split

**Files:**
- Modify: `src/lib/firstVisit/progress.ts` (`computeProgressFromAnswers`, `loadProgressForTarget`)
- Test: `src/lib/firstVisit/__tests__/progress.test.ts` (append to existing file — read it first and match its fixture style)

**Step 1: Write the failing test** (append a describe block; adapt fixture helpers to whatever the existing file uses — read it first):

```typescript
describe('computeProgressFromAnswers phase filter', () => {
  it('filtered deal progress for phases 1 and 11 sums to the unfiltered total', () => {
    const whole = computeProgressFromAnswers('deal', []);
    const meta = computeProgressFromAnswers('deal', [], ['1']);
    const evaluation = computeProgressFromAnswers('deal', [], ['11']);
    expect(meta.total + evaluation.total).toBe(whole.total);
    expect(meta.total).toBeGreaterThan(0);
    expect(evaluation.total).toBeGreaterThan(0);
  });

  it('an answer only counts toward the card that contains its question', () => {
    const answers = [
      { question_key: 'fv_readiness_health_score', value: '7' } as never,
    ];
    const meta = computeProgressFromAnswers('deal', answers, ['1']);
    const evaluation = computeProgressFromAnswers('deal', answers, ['11']);
    expect(meta.done).toBe(0);
    expect(evaluation.done).toBe(1);
  });
});
```

(If the existing tests construct `LocalAnswer` rows with more fields, mirror that shape instead of the `as never` cast.)

**Step 2: Run, expect FAIL.**

**Step 3: Implement** — thread the filter through:

```typescript
export function computeProgressFromAnswers(
  scope: HubScope,
  answers: LocalAnswer[],
  phaseIds?: string[],
): ScopeProgress {
  const questions = phasesForScope(scope, phaseIds).flatMap((p) => p.questions);
  // ... rest unchanged
}

export async function loadProgressForTarget(
  targetId: string,
  scope: HubScope,
  phaseIds?: string[],
): Promise<ScopeProgress> {
  const answers = await loadAnswersForTarget(targetId);
  return computeProgressFromAnswers(scope, answers, phaseIds);
}
```

**Step 4: Run, expect PASS.** Full suite + tsc.

**Step 5: Commit**
```bash
git add src/lib/firstVisit/progress.ts src/lib/firstVisit/__tests__/progress.test.ts
git commit -m "feat(fv): phase-filtered scope progress"
```

---

### Task 3: `UnitSurvey` accepts `phaseIds`

**Files:**
- Modify: `src/app/first-visit/[dealId]/[inspectionId]/UnitSurvey.tsx`
- Test: `src/app/first-visit/[dealId]/[inspectionId]/__tests__/UnitSurvey.phaseFilter.test.tsx` (new — copy the mock-harness pattern from `UnitSurvey.lastPhase.test.tsx`, which mocks `@/lib/firstVisit/questions` and `localDb`)

**Step 1: Write the failing test.** Reuse the lastPhase harness: mock `phasesForScope` so it RESPECTS a `phaseIds` argument (return both fake phases when undefined, the matching subset when given). Render `UnitSurvey` with `phaseIds={['p2']}` and assert only Phase 2's chip/question renders; render without `phaseIds` and assert both phases render. Read `UnitSurvey.lastPhase.test.tsx` first and mirror its mock + render props exactly (target/scope/ctx/snapshot/onBack), adding the new prop.

```tsx
// sketch — adapt to the real harness:
const phasesFor = (scope: unknown, phaseIds?: string[]) =>
  phaseIds ? phases.filter((p) => phaseIds.includes(p.id)) : phases;
// in vi.mock: phasesForScope: phasesFor
it('renders only the filtered phase when phaseIds is set', async () => {
  render(<UnitSurvey {...baseProps} phaseIds={['p2']} />);
  expect(await screen.findByText('Question 2')).toBeInTheDocument();
  expect(screen.queryByText('Question 1')).toBeNull();
});
it('renders all phases when phaseIds is absent (regression)', async () => {
  render(<UnitSurvey {...baseProps} />);
  expect(await screen.findByText('Question 1')).toBeInTheDocument();
});
```

**Step 2: Run, expect FAIL** (prop doesn't exist).

**Step 3: Implement** — in `UnitSurvey.tsx`:
- Add `phaseIds?: string[]` to the props type and destructure it.
- Pass it to BOTH `phasesForScope` call sites (the `phases` memo at ~line 59 and the `anchorMap` memo at ~line 69): `phasesForScope(scope, phaseIds)`. Add `phaseIds` to both memo dependency arrays.
- `requiredStats` derives from the `phases` memo, so it follows automatically — verify, don't duplicate.

**Step 4: Run, expect PASS.** Full suite (watch the three existing UnitSurvey tests — their mocked `phasesForScope` ignores the second arg, which is fine) + tsc.

**Step 5: Commit**
```bash
git add "src/app/first-visit/[dealId]/[inspectionId]/UnitSurvey.tsx" "src/app/first-visit/[dealId]/[inspectionId]/__tests__/UnitSurvey.phaseFilter.test.tsx"
git commit -m "feat(fv): UnitSurvey renders an optional phase subset"
```

---

### Task 4: navigator split — "Visit details" top, "Deal evaluation" bottom

**Files:**
- Modify: `src/app/first-visit/[dealId]/[inspectionId]/VisitNavigator.tsx`

No new automated test (VisitNavigator has no harness; the behavior is covered by Tasks 1–3 + manual smoke in Task 5). Keep the change minimal.

**Step 1: Constants + Selection type.** Near the top of the file:

```typescript
// The deal-scoped questions render as two navigator cards: metadata up top,
// evaluation at the bottom — you can't judge a deal before walking it.
const DEAL_DETAILS_PHASES = ['1'];
const DEAL_EVALUATION_PHASES = ['11'];
```

Change the Selection union (~line 84):
```typescript
type Selection =
  | { kind: 'deal'; label: string; phaseIds: string[] }
  | { kind: 'property'; target: LocalTarget }
  | { kind: 'unit'; target: LocalTarget; property: LocalTarget };
```

**Step 2: progressFor with filter.** Extend (~line 146):
```typescript
const progressFor = (targetId: string, scope: HubScope, phaseIds?: string[]): ScopeProgress => {
  const own = answers.filter((a) => a.target_id === targetId);
  return computeProgressFromAnswers(scope, own, phaseIds);
};
```
`totalUnansweredRequired` keeps calling `progressFor(inspectionId, 'deal')` unfiltered — unchanged totals, unchanged submit gating.

**Step 3: Survey view.** In the `selected.kind === 'deal'` branch (~line 352): use `selected.label` for the target label and pass the filter to the survey:
```typescript
target = { id: inspectionId, label: selected.label };
```
and in the `<UnitSurvey ...>` render add `phaseIds={selected.kind === 'deal' ? selected.phaseIds : undefined}` (or destructure earlier into a local — match file style).

**Step 4: Top card.** The existing "Visit details" button (~line 481): `setSelected({ kind: 'deal', label: 'Visit details', phaseIds: DEAL_DETAILS_PHASES })` and its ring becomes `progressFor(inspectionId, 'deal', DEAL_DETAILS_PHASES)`.

**Step 5: Bottom card.** After the Properties `</section>` and BEFORE the Submit button (~line 582), add:

```tsx
{/* Deal evaluation — deliberately last: the verdict comes after the walkthrough. */}
<button
  onClick={() =>
    setSelected({ kind: 'deal', label: 'Deal evaluation', phaseIds: DEAL_EVALUATION_PHASES })
  }
  className="mt-5 flex w-full items-center gap-2 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
>
  <div className="flex-1">
    <div className="text-sm font-medium">Deal evaluation</div>
    <div className="text-xs text-gray-500">Fill in at the end of the visit</div>
  </div>
  {(() => {
    const pr = progressFor(inspectionId, 'deal', DEAL_EVALUATION_PHASES);
    return pr.total > 0 ? <ProgressRing done={pr.done} total={pr.total} size={32} /> : null;
  })()}
  <span aria-hidden className="text-gray-400">›</span>
</button>
```

(Mirror the top card's markup exactly — read it and copy the classes.)

**Step 6: Verify + commit**
- `npx vitest run` (all green) and `npx tsc --noEmit` (clean).
```bash
git add "src/app/first-visit/[dealId]/[inspectionId]/VisitNavigator.tsx"
git commit -m "feat(fv): split deal card — visit details on top, deal evaluation after properties"
```

---

### Task 5: final verification + PR

1. Full suite + tsc one more time.
2. Manual smoke (Joshua, or quick local `npm run dev`): top card shows only date + visitor name; new "Deal evaluation" card sits below Properties above Submit; both rings count their own questions; opening each card shows only its phase; previously saved evaluation answers still appear (same slugs/target).
3. Push + PR to `iuliia-arbio:main` (head `jb-arbio:feat/deal-evaluation-at-end`), noting: pure UI split, no data change, existing answers unaffected.

— end —
