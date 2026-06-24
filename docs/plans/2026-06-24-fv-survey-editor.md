# First-Visit Survey In-App Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task.

**Goal:** Let an admin edit the existing first-visit survey (content, options, order, add/remove questions) in-app, publish versioned changes that don't disturb in-flight inspections, while keeping the offline-first experience.

**Architecture:** Three layers — (1) editable **content** (versioned, Supabase, seeded from a committed JSON), (2) engineer-owned **code overlay** keyed by slug for structural/risky fields (repeater `group_id`, `follow_up`, `per_option_follow_up`, `anchor_to`, `pms_target`, `mode`, metadata), (3) a shared **zod validator** gating saves and publishes. A pure `buildSurveyConfig(content, overlay)` composes them into today's `PHASES`/`ALL_QUESTIONS` shape. Config becomes runtime data delivered via a React context; the bundled seed is the offline fallback.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Dexie 4, Supabase (`onboarding` schema), Vitest + jsdom + fake-indexeddb + Testing Library. New deps: `zod`, `react-hook-form`.

**Reference design:** `docs/plans/2026-06-24-fv-survey-editor-design.md`.

**Ground truth from codebase audit (2026-06-24):**
- `src/lib/firstVisit/questions.ts` builds `PHASES`/`ALL_QUESTIONS` via an 8-step transform chain over `src/data/first-visit-questions.json` (lines 479-489).
- `FirstVisitQuestion` fields: `slug, label, description, scope, mode, type, options, required, repeater, pms_target, status, verdict, notes, phase_id, phase_label, group_id?, multi_select?, allow_custom_options?, follow_up?, per_option_follow_up?, anchor_to?`.
- Heavy runtime consumers of `questions.ts`: `UnitSurvey.tsx` (`phasesForScope, areaKeyFor, groupIdFor, isScopeLevelRequired, buildAnchorMap, filterOutAnchored`), `progress.ts` (`phasesForScope, isScopeLevelRequired`), `extractionSchema.ts` (`ALL_QUESTIONS, groupIdFor`). All other importers use the `FirstVisitQuestion` type only.
- Supabase: `getHubSupabase()` (`hubSupabase.ts`), `getHubRouteContext(getHubSupabase())` for route auth (`hubSupabaseAdmin.ts`), `getHubAdminSupabase()` service role. `onboarding` schema.
- No admin role exists. No React context exists. Migrations in `supabase/migrations/` are reference-only (hub repo is source of truth); convention `first_visit_00X_*.sql`, latest `005`.
- Tests: `vitest.config.ts` (jsdom, alias `@`→`src`), `vitest.setup.ts` (`@testing-library/jest-dom/vitest` + `fake-indexeddb/auto`). Route tests mock `getHubSupabase`/`getHubRouteContext` with `vi.mock`. Component tests use Testing Library + a `makeQuestion()` fixture in `src/components/firstVisit/__tests__/_fixtures.ts`.

**Conventions for every task:** Run the full suite with `npx vitest run` and a targeted file with `npx vitest run <path>`. Type-check with `npx tsc --noEmit`. Build with `npm run build`. Commit after each task with a Conventional Commit ending in the Co-Authored-By trailer.

---

## Phase 0 — Foundation refactor (zero behavior change)

Split the monolithic transform output into `content + overlay`, composed by a pure builder, proven byte-identical to today by a parity snapshot. Nothing user-facing changes. This phase is independently shippable and de-risks everything after it.

### Task 0.1: Capture the parity snapshot

**Files:**
- Create: `src/lib/firstVisit/__tests__/__fixtures__/all-questions.snapshot.json`
- Create: `scripts/gen-survey-snapshot.mjs`
- Test: `src/lib/firstVisit/__tests__/parity.test.ts`

**Step 1: Write the snapshot generator** (`scripts/gen-survey-snapshot.mjs`)

A throwaway-but-committed Node script that imports the *current* built config and writes it to the fixture. Run it via `npx tsx`:

```js
// Run: npx tsx scripts/gen-survey-snapshot.mjs
import { writeFileSync } from 'node:fs';
import { ALL_QUESTIONS } from '../src/lib/firstVisit/questions.ts';

const out = new URL(
  '../src/lib/firstVisit/__tests__/__fixtures__/all-questions.snapshot.json',
  import.meta.url,
);
writeFileSync(out, JSON.stringify(ALL_QUESTIONS, null, 2) + '\n');
console.log(`wrote ${ALL_QUESTIONS.length} questions`);
```

**Step 2: Generate the fixture**

Run: `npx tsx scripts/gen-survey-snapshot.mjs`
Expected: `wrote 186 questions` (or current count) and the JSON file exists.

**Step 3: Write the parity test** (`parity.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS } from '../questions';
import snapshot from './__fixtures__/all-questions.snapshot.json';

describe('survey config parity', () => {
  it('ALL_QUESTIONS is byte-identical to the captured snapshot', () => {
    // JSON round-trip normalizes undefined/order so deep-equal is exact.
    expect(JSON.parse(JSON.stringify(ALL_QUESTIONS))).toEqual(snapshot);
  });
});
```

**Step 4: Run it**

Run: `npx vitest run src/lib/firstVisit/__tests__/parity.test.ts`
Expected: PASS (trivially — config is unchanged so far). This test is the guardrail for every later Task in Phase 0.

**Step 5: Commit**

```bash
git add src/lib/firstVisit/__tests__/__fixtures__/all-questions.snapshot.json scripts/gen-survey-snapshot.mjs src/lib/firstVisit/__tests__/parity.test.ts
git commit -m "test(fv): capture survey config parity snapshot"
```

### Task 0.2: Define the content + overlay types and the composition builder

**Files:**
- Create: `src/lib/firstVisit/surveyConfig.ts`
- Test: `src/lib/firstVisit/__tests__/surveyConfig.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildSurveyConfig } from '../surveyConfig';
import type { ContentConfig, StructureOverlay } from '../surveyConfig';

const content: ContentConfig = {
  phases: [
    {
      id: '9d', label: 'Unit walkthrough',
      questions: [
        { slug: 'q_simple', label: 'Simple', description: null, scope: 'unit_category',
          type: 'text', options: [], required: true, phase_id: '9d', phase_label: 'Unit walkthrough' },
        { slug: 'finding_item_name', label: 'Item', description: null, scope: 'unit_category',
          type: 'text', options: [], required: true, phase_id: '9d', phase_label: 'Unit walkthrough' },
      ],
    },
  ],
};
const overlay: StructureOverlay = {
  finding_item_name: { group_id: 'finding', repeater: true, mode: 'observe', status: 'proposed' },
};

describe('buildSurveyConfig', () => {
  it('merges overlay onto content by slug and fills structural defaults', () => {
    const phases = buildSurveyConfig(content, overlay);
    const q = phases[0].questions.find((x) => x.slug === 'finding_item_name')!;
    expect(q.group_id).toBe('finding');
    expect(q.repeater).toBe(true);
    expect(q.mode).toBe('observe');
    // A question with no overlay entry gets safe structural defaults.
    const simple = phases[0].questions.find((x) => x.slug === 'q_simple')!;
    expect(simple.repeater).toBe(false);
    expect(simple.mode).toBe('data');
    expect(simple.pms_target).toBeNull();
  });
});
```

**Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/firstVisit/__tests__/surveyConfig.test.ts`
Expected: FAIL — `buildSurveyConfig is not a function`.

**Step 3: Implement** (`surveyConfig.ts`)

Define `ContentQuestion` (safe fields), `ContentPhase`, `ContentConfig`, `OverlayEntry` (structural fields, all optional), `StructureOverlay = Record<slug, OverlayEntry>`. Implement:

```ts
import type { FirstVisitQuestion, FirstVisitPhase, FieldType, Mode, Status } from './questions';
import type { HubScope } from './resolveScope';

export type ContentQuestion = {
  slug: string; label: string; description: string | null;
  scope: HubScope; type: FieldType; options: string[]; required: boolean;
  multi_select?: boolean; allow_custom_options?: boolean;
  phase_id: string; phase_label: string;
};
export type ContentPhase = { id: string; label: string; questions: ContentQuestion[] };
export type ContentConfig = { phases: ContentPhase[] };

export type OverlayEntry = Partial<Pick<FirstVisitQuestion,
  'mode' | 'repeater' | 'pms_target' | 'status' | 'verdict' | 'notes' |
  'group_id' | 'follow_up' | 'per_option_follow_up' | 'anchor_to'>>;
export type StructureOverlay = Record<string, OverlayEntry>;

const STRUCTURAL_DEFAULTS = {
  mode: 'data' as Mode, repeater: false, pms_target: null,
  status: 'existing' as Status, verdict: null, notes: null,
};

export function buildSurveyConfig(content: ContentConfig, overlay: StructureOverlay): FirstVisitPhase[] {
  return content.phases.map((p) => ({
    id: p.id, label: p.label,
    questions: p.questions.map((c) => ({
      ...STRUCTURAL_DEFAULTS,
      ...c,
      ...overlay[c.slug],
    }) as FirstVisitQuestion),
  }));
}
```

> NOTE: the merge order (`STRUCTURAL_DEFAULTS` → content → overlay) and which fields live where will be tuned in Task 0.4 until the parity test passes. Keep this builder pure (no imports of the JSON).

**Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/firstVisit/__tests__/surveyConfig.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/firstVisit/surveyConfig.ts src/lib/firstVisit/__tests__/surveyConfig.test.ts
git commit -m "feat(fv): pure content+overlay survey config builder"
```

### Task 0.3: Generate the seed content JSON + structure overlay from today's config

**Files:**
- Create: `scripts/gen-survey-content.mjs`
- Create: `src/data/first-visit-content.json`
- Create: `src/lib/firstVisit/questionStructure.ts`

**Step 1: Write the generator** (`scripts/gen-survey-content.mjs`)

Imports the *current* `PHASES` and partitions every question into content vs overlay:

```js
// Run: npx tsx scripts/gen-survey-content.mjs
import { writeFileSync } from 'node:fs';
import { PHASES } from '../src/lib/firstVisit/questions.ts';

const CONTENT_KEYS = ['slug','label','description','scope','type','options','required',
  'multi_select','allow_custom_options','phase_id','phase_label'];
const OVERLAY_KEYS = ['mode','repeater','pms_target','status','verdict','notes',
  'group_id','follow_up','per_option_follow_up','anchor_to'];
const DEFAULTS = { mode:'data', repeater:false, pms_target:null, status:'existing', verdict:null, notes:null };

const content = { phases: PHASES.map((p) => ({
  id: p.id, label: p.label,
  questions: p.questions.map((q) => Object.fromEntries(
    CONTENT_KEYS.filter((k) => q[k] !== undefined).map((k) => [k, q[k]]))),
})) };

const overlay = {};
for (const p of PHASES) for (const q of p.questions) {
  const entry = {};
  for (const k of OVERLAY_KEYS) {
    if (q[k] === undefined) continue;
    if (k in DEFAULTS && q[k] === DEFAULTS[k]) continue; // omit default-valued structural fields
    entry[k] = q[k];
  }
  if (Object.keys(entry).length) overlay[q.slug] = entry;
}

writeFileSync(new URL('../src/data/first-visit-content.json', import.meta.url),
  JSON.stringify(content, null, 2) + '\n');
writeFileSync(new URL('../src/lib/firstVisit/questionStructure.ts', import.meta.url),
  `// AUTO-GENERATED SEED by scripts/gen-survey-content.mjs, then hand-maintained.\n` +
  `// Engineer-owned structural overlay keyed by slug. See the editor design doc.\n` +
  `import type { StructureOverlay } from './surveyConfig';\n\n` +
  `export const QUESTION_STRUCTURE: StructureOverlay = ${JSON.stringify(overlay, null, 2)};\n`);
console.log(`content: ${content.phases.length} phases; overlay: ${Object.keys(overlay).length} slugs`);
```

**Step 2: Run it**

Run: `npx tsx scripts/gen-survey-content.mjs`
Expected: prints phase + overlay counts; both files created.

**Step 3: Sanity check the overlay**

Verify `QUESTION_STRUCTURE` contains the known structural slugs: `finding_*` entries have `group_id:'finding'`, `repeater:true`; `fv_parking_actual_type` has a `follow_up`; the `anchor_to` media questions are present; `fv_step_lock_brand` has `group_id:null`. Run: `npx tsc --noEmit` — Expected: clean.

**Step 4: Commit**

```bash
git add scripts/gen-survey-content.mjs src/data/first-visit-content.json src/lib/firstVisit/questionStructure.ts
git commit -m "feat(fv): generate seed content config + structure overlay"
```

### Task 0.4: Swap questions.ts to compose content + overlay, prove parity

**Files:**
- Modify: `src/lib/firstVisit/questions.ts:479-489` (the `PHASES`/`ALL_QUESTIONS` export block)
- Test: `src/lib/firstVisit/__tests__/parity.test.ts` (already exists)

**Step 1: Rewrite the export block**

Replace the transform-chain `PHASES` export with composition from the new artifacts. Keep `RawConfig`/`CONFIG_META` for `version`/`generated_at`, but compute counts from the composed result (as today). Keep all helper functions (`phasesForScope`, `groupIdFor`, etc.) unchanged.

```ts
import contentJson from '@/data/first-visit-content.json';
import { QUESTION_STRUCTURE } from './questionStructure';
import { buildSurveyConfig, type ContentConfig } from './surveyConfig';

export const PHASES: FirstVisitPhase[] = buildSurveyConfig(
  contentJson as unknown as ContentConfig,
  QUESTION_STRUCTURE,
);
export const ALL_QUESTIONS: FirstVisitQuestion[] = PHASES.flatMap((p) => p.questions);
```

Delete the now-dead transform functions and their constants (`dropQuestions`, `DROPPED_SLUGS`, `injectFindings`, `makeFindingQuestions`, `injectBucket2Questions`, `makeBucket2Question`, `BUCKET2_OVERRIDES`, `stripVerifyWord`, `stripOperationalDescriptions`, `hideDealStampingQuestions`, `dedupePhases`, the `*_PATTERNS` arrays). **Keep** `overrideQuestions` only if any test imports it (audit: `questions.bucket2.test.ts`) — otherwise delete and update/remove that test in Step 3.

**Step 2: Run the parity test**

Run: `npx vitest run src/lib/firstVisit/__tests__/parity.test.ts`
Expected: PASS — composed `ALL_QUESTIONS` deep-equals the snapshot. If it fails, the diff reveals which field landed in the wrong layer; adjust `gen-survey-content.mjs` partition keys / `buildSurveyConfig` merge and regenerate (Task 0.3 Step 2) until green.

**Step 3: Fix transform-specific tests**

These tests assert the *behavior* of deleted transforms and must be retargeted or removed (they are now covered by parity + the seed being correct):
- `src/lib/firstVisit/__tests__/questions.transforms.test.ts`
- `src/lib/firstVisit/__tests__/questions.drops.test.ts`
- `src/lib/firstVisit/__tests__/questions.findings.test.ts`
- `src/lib/firstVisit/__tests__/questions.bucket2.test.ts`

For each: keep assertions that check the *resulting* config (e.g. "a findings repeater exists in phase 9d", "dropped slug X is absent from ALL_QUESTIONS") since those still hold against the composed output; delete assertions that call deleted internal functions. Run each file and fix.

**Step 4: Run the full suite + typecheck + build**

Run: `npx vitest run` — Expected: all pass.
Run: `npx tsc --noEmit` — Expected: clean.
Run: `npm run build` — Expected: green.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(fv): compose survey config from content+overlay (parity-proven, transform chain removed)"
```

### Task 0.5: Retire the XLSX sync pipeline references

**Files:**
- Modify: `package.json` (the `sync-questions` script), `scripts/sync-questions.sh`, `src/data/first-visit-questions.json`

**Step 1:** Confirm `first-visit-questions.json` has no remaining importers.
Run: `grep -rn "first-visit-questions" src scripts` — Expected: only the (now-removed) reference. If clean, delete the raw JSON and `scripts/sync-questions.sh`, and remove the `sync-questions` npm script. Update `src/lib/firstVisit/questions.ts` header comment (lines 5-7) to point at `first-visit-content.json` + `questionStructure.ts`.

**Step 2:** Run: `npx vitest run` and `npm run build` — Expected: green.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore(fv): retire XLSX sync pipeline; content+overlay is the source"
```

---

## Phase 1 — Runtime config plumbing (still bundled seed)

Make the config flow as data (so a future version can come from Supabase) without changing what config is shown. Introduce a context + parameterize the pure helpers. Still zero user-facing change; the context default is the bundled seed.

### Task 1.1: Parameterize the pure helpers

**Files:**
- Modify: `src/lib/firstVisit/progress.ts`, `src/lib/firstVisit/extractionSchema.ts`
- Test: `src/lib/firstVisit/__tests__/progress.test.ts`, `extractionSchema.test.ts`

**Step 1:** Add an optional `questions`/`phases` parameter to the pure functions so callers can inject a config, defaulting to the module `PHASES`/`ALL_QUESTIONS` for backward-compatibility.

- `computeProgressFromAnswers(scope, answers, phaseIds?, phases = PHASES)` — replace the internal `phasesForScope(scope, phaseIds)` call with a local filter over the injected `phases`.
- `extractionSchema.ts`: change `BY_SLUG` from a module constant to `buildBySlug(questions = ALL_QUESTIONS)`; have `buildExtractionSchema(targetSlugs, questions = ALL_QUESTIONS)` and `isFillableSlug(slug, questions?)` accept the set.

**Step 2:** Add a test passing a *custom* small `phases`/`questions` array and asserting the helper uses it (not the global). Run the two test files. Expected: existing tests still pass (defaults), new tests pass.

**Step 3: Commit**

```bash
git add -A && git commit -m "refactor(fv): pure config helpers accept injected question set"
```

### Task 1.2: SurveyConfigProvider context + hook

**Files:**
- Create: `src/lib/firstVisit/SurveyConfigContext.tsx`
- Test: `src/lib/firstVisit/__tests__/SurveyConfigContext.test.tsx`

**Step 1: Write the failing test** — render a child inside `<SurveyConfigProvider>` and assert `useSurveyConfig()` returns `{ phases, allQuestions }` defaulting to the bundled seed; assert a provided `value` overrides it.

**Step 2:** Implement:

```tsx
'use client';
import { createContext, useContext, useMemo } from 'react';
import { PHASES, ALL_QUESTIONS, type FirstVisitPhase, type FirstVisitQuestion } from './questions';

export type SurveyConfig = { phases: FirstVisitPhase[]; allQuestions: FirstVisitQuestion[]; version?: number };
const Ctx = createContext<SurveyConfig>({ phases: PHASES, allQuestions: ALL_QUESTIONS });

export function SurveyConfigProvider({ value, children }: { value?: SurveyConfig; children: React.ReactNode }) {
  const resolved = useMemo<SurveyConfig>(
    () => value ?? { phases: PHASES, allQuestions: ALL_QUESTIONS }, [value]);
  return <Ctx.Provider value={resolved}>{children}</Ctx.Provider>;
}
export function useSurveyConfig() { return useContext(Ctx); }
```

**Step 3:** Run the test. Expected: PASS. **Step 4: Commit** `feat(fv): SurveyConfigProvider context with bundled-seed default`.

### Task 1.3: UnitSurvey + progress read config from context

**Files:**
- Modify: `src/app/first-visit/[dealId]/[inspectionId]/UnitSurvey.tsx`, `VisitNavigator.tsx`, `progress.ts` callers

**Step 1:** Wrap the survey tree in `<SurveyConfigProvider>` (no `value` yet → seed) at the top of `VisitNavigator`. In `UnitSurvey.tsx`, replace the direct `phasesForScope(scope, phaseIds)` call with a local filter over `useSurveyConfig().phases` (reuse the same scope/phase filter logic). Keep `areaKeyFor`/`groupIdFor`/`buildAnchorMap`/`filterOutAnchored`/`isScopeLevelRequired` as pure imports (they take a question and don't need the global set), but feed `buildAnchorMap`/`filterOutAnchored` from the context phases.

**Step 2:** Run the `UnitSurvey.*` test files and `progress.test.ts`. Fix any that mock `phasesForScope` — switch them to render within the provider or pass a config. Expected: green.

**Step 3:** Run `npx vitest run`, `npx tsc --noEmit`, `npm run build`. Expected: all green, app visually unchanged.

**Step 4: Commit** `refactor(fv): survey renderer + progress read config from context`.

---

## Phase 2 — Supabase versioning, offline cache, version pinning

Persist versioned content in the hub, cache it in Dexie, pin a version per inspection, and fall back to the bundled seed offline. The renderer keeps reading from context; we now feed the context a fetched version.

### Task 2.1: Hub migration for `first_visit_survey_versions` (reference file)

**Files:**
- Create: `supabase/migrations/first_visit_006_survey_versions.sql`
- Modify: `supabase/migrations/README.md` (note it must be applied in the hub repo)

**Step 1:** Author the table:

```sql
-- onboarding schema, applied in the hub (Onboarding_tool) repo. Reference copy.
create table if not exists onboarding.first_visit_survey_versions (
  template_key text not null default 'first_visit',
  version integer not null,
  status text not null check (status in ('draft','published','archived')),
  content_json jsonb not null,
  created_by text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  primary key (template_key, version)
);
-- at most one draft per template
create unique index if not exists first_visit_survey_versions_one_draft
  on onboarding.first_visit_survey_versions (template_key) where status = 'draft';
```

Add a `survey_version integer` column note for `first_visit_inspections` (pin), authored in the hub.

**Step 2: Commit** `feat(fv): hub migration for survey versions (reference)`. (No test — SQL reference.)

### Task 2.2: Survey-config API routes

**Files:**
- Create: `src/app/api/first-visit/survey-config/route.ts` (GET active published version; POST publish — admin only)
- Create: `src/app/api/first-visit/survey-config/draft/route.ts` (GET/PUT draft — admin only)
- Test: `src/app/api/first-visit/survey-config/__tests__/route.test.ts`

**Step 1: Write failing route tests** mirroring `submit/__tests__/route.test.ts`: mock `getHubSupabase`/`getHubRouteContext`; assert GET returns the latest `published` row's `content_json`; 401 when unauth; POST/PUT return 403 for a non-admin email and 200 for an admin email.

**Step 2: Implement.** Auth via `getHubRouteContext(getHubSupabase())`. Admin gate = `isAdminEmail(email)` (Task 2.3). GET active: `select ... where status='published' order by version desc limit 1`. Validate `content_json` with the validator (Task 2.4) before returning/accepting. Publish: read latest version number, insert new `published` row at `version+1`, set `published_at`, archive prior draft.

**Step 3:** Run the test file. Expected: PASS. **Step 4: Commit** `feat(fv): survey-config GET/publish/draft API routes`.

### Task 2.3: Admin allowlist helper

**Files:**
- Create: `src/lib/firstVisit/adminAccess.ts`
- Test: `src/lib/firstVisit/__tests__/adminAccess.test.ts`

**Step 1: Failing test:** `isAdminEmail('x@arbio-group.com')` true when `ADMIN_EMAILS` env contains it (comma-separated, case-insensitive, trimmed); false otherwise; false when env unset.

**Step 2: Implement** reading `process.env.ADMIN_EMAILS`. Provide a client-safe variant `NEXT_PUBLIC_ADMIN_EMAILS` for the button's visibility check (server route still enforces the real gate — the client flag is convenience only).

**Step 3:** Run test. **Step 4: Commit** `feat(fv): admin email allowlist helper`.

> NOTE: document `ADMIN_EMAILS` + `NEXT_PUBLIC_ADMIN_EMAILS` in the deployment follow-ups.

### Task 2.4: Shared zod validator

**Files:**
- Create: `src/lib/firstVisit/validateSurveyContent.ts`
- Test: `src/lib/firstVisit/__tests__/validateSurveyContent.test.ts`
- Modify: `package.json` (add `zod`)

**Step 1:** `npm install zod`. **Step 2: Failing tests** for `validateSurveyContent(content, overlay)` → `{ ok, errors[] }`. Rules: duplicate slug across config; `select`/multi-select question with empty `options`; unknown `type`/`scope`/`phase_id`; malformed slug (`/^[a-z][a-z0-9_.]*$/`); overlay entry whose slug is absent from content; repeater member (`group_id` set) without any sibling sharing the group. **Step 3:** Implement with a `zod` schema for `ContentQuestion` + cross-row checks. **Step 4:** Run tests, green. **Step 5: Commit** `feat(fv): zod survey-content validator`.

### Task 2.5: Dexie config cache + version pinning

**Files:**
- Modify: `src/lib/firstVisit/db.ts` (add a `surveyConfig` table at Dexie `version(4)`)
- Create: `src/lib/firstVisit/loadSurveyConfig.ts`
- Test: `src/lib/firstVisit/__tests__/loadSurveyConfig.test.ts`

**Step 1:** Add Dexie `version(4)` with `surveyConfig: '[template_key+version]'` storing `{ template_key, version, content_json, cached_at }`. Keep all v3 stores. **Step 2: Failing test** for `loadActiveSurveyConfig({ online, fetchImpl })`: online → fetches active version via the API, caches it, returns composed `{ phases, allQuestions, version }` via `buildSurveyConfig(content, QUESTION_STRUCTURE)`; offline with a cache hit → returns cached; offline with no cache → returns the bundled seed (`PHASES`/`ALL_QUESTIONS`, `version: undefined`). **Step 3:** Implement; compose with the overlay + run `validateSurveyContent` defensively (fall back to seed on invalid). **Step 4:** Run test (uses fake-indexeddb). **Step 5: Commit** `feat(fv): offline-cached survey config loader with seed fallback`.

### Task 2.6: Feed loaded config into the provider; pin per inspection

**Files:**
- Modify: `VisitNavigator.tsx` (load config, pass to provider), inspection-start path (record `survey_version`)

**Step 1:** On mount, call `loadActiveSurveyConfig` (or the inspection's pinned version if set) and pass the result as `<SurveyConfigProvider value={...}>`. While loading, render with the seed (no blank). **Step 2:** When an inspection is created, stamp the active `version` onto it (Dexie + outbox to hub) so later loads pin it. **Step 3:** Test: an inspection pinned to version N composes version N's content even after a newer version publishes (unit test against `loadSurveyConfig` with a pin arg). **Step 4:** Run `npx vitest run`, `npm run build`. **Step 5: Commit** `feat(fv): pin survey version per inspection; provider uses loaded config`.

---

## Phase 3 — Editor UI

A validated table editor reachable from an admin-only button. Edits a draft; publish creates a version.

### Task 3.1: Add `react-hook-form` + the edit-form schema

**Files:** Modify `package.json`; Create `src/lib/firstVisit/editorSchema.ts`; Test `__tests__/editorSchema.test.ts`.

**Step 1:** `npm install react-hook-form`. **Step 2:** Export a `zod` resolver schema for a single editable question (reuse rules from `validateSurveyContent`, single-row subset). **Step 3:** Test valid/invalid rows. **Step 4: Commit** `feat(fv): editor form schema (zod + rhf)`.

### Task 3.2: Admin-only "Edit survey" button (entry point)

**Files:** Modify `VisitNavigator.tsx` (header area, ~line 94+); Create `src/components/firstVisit/EditSurveyButton.tsx`; Test `__tests__/EditSurveyButton.test.tsx`.

**Step 1: Failing test:** button renders only when the current user is an admin (mock the admin check), and links to `/first-visit/edit`. **Step 2:** Implement the button (client component; checks `NEXT_PUBLIC_ADMIN_EMAILS` against the session email from `getHubSupabase().auth.getUser()`), render it in the navigator header. **Step 3:** Run test. **Step 4: Commit** `feat(fv): admin-only Edit survey entry button`.

### Task 3.3: Editor page shell + draft load/save

**Files:** Create `src/app/first-visit/edit/page.tsx` + `EditorClient.tsx`; Test `__tests__/EditorClient.test.tsx`.

**Step 1: Failing test:** the editor loads the draft (mock the draft GET), lists questions grouped by phase, and a "Save draft" calls the PUT with the edited content. **Step 2:** Implement: server page guards admin (redirect if not), client component fetches the draft (clone of latest published if none), renders the grouped list, debounced/explicit save to the draft route. **Step 3:** Run test. **Step 4: Commit** `feat(fv): survey editor page + draft load/save`.

### Task 3.4: Per-question edit row (validated)

**Files:** Create `src/components/firstVisit/QuestionEditorRow.tsx`; Test `__tests__/QuestionEditorRow.test.tsx`.

**Step 1: Failing tests:** editing `label`/`description`; choosing `type`/`scope`/`phase` from dropdowns; an options chip editor (add/remove) shown for `select`; toggles for `required`/`multi_select`/`allow_custom_options`; engineer-owned fields (`group_id`, `pms_target`, `follow_up`) shown as **read-only badges**; invalid input (e.g. select with zero options) blocks save with an inline error via the `editorSchema` resolver. **Step 2:** Implement with `react-hook-form`. **Step 3:** Run tests. **Step 4: Commit** `feat(fv): validated per-question editor row`.

### Task 3.5: Add / remove / reorder questions

**Files:** Modify `EditorClient.tsx`; Test extends `EditorClient.test.tsx`.

**Step 1: Failing tests:** "Add question" inserts a new row in a phase with a unique slug and safe defaults; "Remove" deletes it; reorder (up/down buttons — not drag, YAGNI) changes array order; all reflected in the saved content. New questions carry no overlay (so no PMS/branch) — assert a banner explains "new fields aren't PMS-mapped until an engineer wires them." **Step 2:** Implement. **Step 3:** Run tests. **Step 4: Commit** `feat(fv): add/remove/reorder questions in editor`.

### Task 3.6: Publish flow

**Files:** Modify `EditorClient.tsx`; Test extends `EditorClient.test.tsx`.

**Step 1: Failing tests:** "Publish" runs `validateSurveyContent` (content + `QUESTION_STRUCTURE`) and, on errors, shows them and does **not** call publish; on success calls the publish route and shows the new version number. **Step 2:** Implement. **Step 3:** Run tests. **Step 4: Commit** `feat(fv): editor publish flow with pre-publish validation`.

### Task 3.7: End-to-end verification

**Step 1:** `npx vitest run` (all green), `npx tsc --noEmit` (clean), `npm run build` (green).
**Step 2:** Manual E2E with `ADMIN_EMAILS`/`NEXT_PUBLIC_ADMIN_EMAILS` set and hub migration applied: open a first-visit survey as an admin → "Edit survey" → change a label + add an option + add a question → Save draft → Publish → reload survey → change appears; start an inspection on the old version → it is unaffected by a later publish; go offline → survey still renders from cache/seed.
**Step 3:** Update `docs/plans/2026-06-24-fv-survey-editor-design.md` "Deferred" notes if scope shifted, and add the env vars + hub migration to the deployment follow-ups in project memory.
**Step 4: Commit** any doc updates: `docs(fv): editor rollout notes + deployment follow-ups`.

---

## Deployment follow-ups (when this ships)

- Apply `first_visit_006_survey_versions` (+ `first_visit_inspections.survey_version` column) against the hub DB via the Onboarding_tool repo.
- Set `ADMIN_EMAILS` (server) and `NEXT_PUBLIC_ADMIN_EMAILS` (client button visibility) in Vercel.
- Seed published version 1 from `first-visit-content.json` (one-time insert or a tiny seed script).

## Notes on sequencing & risk

- **Phase 0 is the highest-value, lowest-risk slice** and is shippable alone — it kills the dual-source maintainability problem even before any editor exists.
- Phases 1–2 are the real cost (runtime-config ripple + versioning/offline). Phase 3 is comparatively mechanical CRUD once the foundation holds.
- Branch editing and multi-template remain deferred (design doc Non-goals).
