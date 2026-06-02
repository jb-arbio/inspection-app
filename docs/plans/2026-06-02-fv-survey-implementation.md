# FV Survey — Question-Set Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the 2026-06-02 question-set review to the first-visit survey: drop 40+ questions, replace the per-area cost/condition mechanics with one unified Findings repeater (shopping list + repairs), require a unique identifier per unit, apply the Bucket-2 comment fixes, and add a downloadable findings CSV with media links.

**Architecture:** Drops and field-edits are applied as **testable transforms** in `src/lib/firstVisit/questions.ts` (matching the existing `stripVerifyWord` / `dedupePhases` pattern) rather than hand-editing the 3k-line generated JSON. The Findings repeater is defined as a TypeScript constant and merged into the phase list, so it survives any future XLSX re-sync. The findings CSV is a server route that joins unit identifiers and mints signed media URLs. UI changes gate unit entry on a unique identifier.

**Tech Stack:** Next.js 16 (App Router, awaited route params), React, Dexie/IndexedDB, Supabase (onboarding schema + Storage signed URLs), Vitest + jsdom.

**Design source of truth:** `/Users/Joshua/Documents/01_Projects/Onboarding_tool/docs/plans/2026-06-02-fv-survey-question-review.md`

**Pre-req for every `git commit` step:** run `npm test` and confirm green before committing.

---

## Conventions

- All paths relative to `/Users/Joshua/Documents/01_Projects/inspection-app-fork`.
- Run a single test file: `npx vitest run src/lib/firstVisit/__tests__/<file>.ts`
- Run everything: `npm test`
- Question type & loader live in `src/lib/firstVisit/questions.ts`. Transforms are composed at line ~229:
  `stripVerifyWord(stripOperationalDescriptions(hideDealStampingQuestions(dedupePhases(RAW.phases))))`.

---

## Phase A — Drop the 40 confirmed questions

**Why a transform, not JSON surgery:** 40 removals across a 3k-line generated file is error-prone and gets wiped on the next XLSX sync. A `DROPPED_SLUGS` filter is testable and explicit.

### Task A1: Define the drop list + filter transform

**Files:**
- Modify: `src/lib/firstVisit/questions.ts`
- Test: `src/lib/firstVisit/__tests__/questions.drops.test.ts` (create)

**Step 1: Write the failing test**

```typescript
// src/lib/firstVisit/__tests__/questions.drops.test.ts
import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS, DROPPED_SLUGS } from '../questions';

describe('Phase A — dropped questions', () => {
  it('removes every slug in DROPPED_SLUGS from the loaded set', () => {
    const present = new Set(ALL_QUESTIONS.map((q) => q.slug));
    for (const slug of DROPPED_SLUGS) {
      expect(present.has(slug), `${slug} should be dropped`).toBe(false);
    }
  });

  it('drops the expected count (40 review drops + 9d/9e replacements)', () => {
    // 40 from Bucket 1 + 5 cost fields (9d) + 2 appliance fields (9e) = 47
    expect(DROPPED_SLUGS.size).toBe(47);
  });

  it('keeps a representative non-dropped question', () => {
    const present = new Set(ALL_QUESTIONS.map((q) => q.slug));
    expect(present.has('fv_wifi_download_speed_mbps')).toBe(true);
  });
});
```

**Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/firstVisit/__tests__/questions.drops.test.ts`
Expected: FAIL — `DROPPED_SLUGS` not exported.

**Step 3: Implement**

Add near the top of `questions.ts` (after imports, before the transform composition):

```typescript
// --- Phase A: dropped questions (review 2026-06-02) ---
// Bucket 1 (40) + 9d cost fields (5) + 9e appliance condition fields (2),
// replaced by the unified Findings repeater (see FINDINGS_QUESTIONS).
export const DROPPED_SLUGS = new Set<string>([
  // Phase 2 — location & arrival (Hub auto-generates from Geoapify/Places)
  'fv_location_distance_to_center_min', 'fv_location_nearest_transport',
  'fv_location_directions_from_airport', 'fv_location_directions_from_central_station',
  'fv_tips_grocery', 'fv_tips_restaurants', 'fv_tips_attractions', 'fv_tips_nightlife',
  'fv_tips_markets', 'fv_route_closest_transit_station', 'fv_route_from_airport',
  'fv_route_from_central_station',
  // Phase 3 — building exterior
  'fv_building_elevator_instructions', 'fv_accessibility_elevator_dimensions',
  // Phase 4 — check-in
  'fv_checkin_steps_count', 'fv_checkin_guide_2_needed', 'fv_step_lock_notes',
  // Phase 5 — infrastructure / utilities (meter block + dup proposed)
  'fv_trash_onsite_check', 'fv_waste_separation_streams', 'fv_utility_provider',
  'fv_electricity_meter_location', 'fv_electric_meter_location', 'fv_electric_meter_number',
  'fv_gas_meter_location', 'fv_gas_meter_number', 'fv_water_meter_location',
  'fv_water_meter_number',
  // Phase 6 — services
  'fv_service_restrictions_observed',
  // Phase 8 — documentation
  'fv_floorplan_uploaded', 'fv_floorplan_onsite_attach',
  // Phase 10 — check-out
  'fv_checkout_standard_items', 'fv_checkout_key_return_method',
  'fv_checkout_key_return_location', 'fv_checkout_trash_disposal', 'fv_checkout_time',
  // Phase 9g
  'fv_consumables_meet_standard',
  // Repeater-suffixed proposed dups (slug as they appear in JSON)
  'fv_fusebox_location', 'fv_fusebox_reset_instructions',
  // NOTE: the two slugs above also exist as the kept "existing" rows. See Task A2.
  // Phase 9d cost fields — replaced by Findings €
  'fv_furniture_cost_estimate_eur', 'fv_equipment_cost_estimate_eur',
  'fv_bathroom_improvement_cost_eur', 'fv_maintenance_cost_estimate_eur',
  'fv_maintenance_details',
  // Phase 9e appliance condition — repeater becomes pure inventory
  'appliance.status', 'appliance.statusNote',
]);

function dropQuestions(phases: FirstVisitPhase[]): FirstVisitPhase[] {
  return phases.map((p) => ({
    ...p,
    questions: p.questions.filter((q) => !DROPPED_SLUGS.has(q.slug)),
  }));
}
```

> ⚠️ **A2 caveat:** `fv_fusebox_location` and `fv_fusebox_reset_instructions` appear **twice** in the JSON (existing + proposed dup). A blunt slug filter drops BOTH. We must keep the existing one. See Task A2 before finalizing the count.

**Step 4: Wire the transform** — change the composition line (~229):

```typescript
export const PHASES: FirstVisitPhase[] = stripVerifyWord(
  stripOperationalDescriptions(
    hideDealStampingQuestions(dropQuestions(dedupePhases(RAW.phases))),
  ),
);
```

**Step 5: Run** — `npx vitest run src/lib/firstVisit/__tests__/questions.drops.test.ts` → still failing on count until A2 resolves the fuse-box duplicate. Proceed to A2.

### Task A2: Resolve the fuse-box duplicate (keep existing, drop proposed)

**Files:**
- Modify: `src/lib/firstVisit/questions.ts`
- Test: same drops test file

**Step 1: Add the failing test**

```typescript
it('keeps exactly one fuse box location (the existing one) and one reset instructions', () => {
  const fb = ALL_QUESTIONS.filter((q) => q.slug === 'fv_fusebox_location');
  expect(fb.length).toBe(1);
  expect(fb[0].status).toBe('existing');
  const reset = ALL_QUESTIONS.filter((q) => q.slug === 'fv_fusebox_reset_instructions');
  expect(reset.length).toBe(1);
  expect(reset[0].status).toBe('existing');
});
```

**Step 2: Run → FAIL** (both copies dropped, length 0).

**Step 3: Implement** — replace the blunt fuse-box entries in `DROPPED_SLUGS` with a status-aware drop. Remove `'fv_fusebox_location'` and `'fv_fusebox_reset_instructions'` from the Set, and extend `dropQuestions`:

```typescript
const DROP_PROPOSED_DUP_SLUGS = new Set(['fv_fusebox_location', 'fv_fusebox_reset_instructions']);

function dropQuestions(phases: FirstVisitPhase[]): FirstVisitPhase[] {
  return phases.map((p) => ({
    ...p,
    questions: p.questions.filter((q) => {
      if (DROPPED_SLUGS.has(q.slug)) return false;
      // keep existing fuse-box rows, drop the proposed duplicates
      if (DROP_PROPOSED_DUP_SLUGS.has(q.slug) && q.status === 'proposed') return false;
      return true;
    }),
  }));
}
```

Update the count test: `DROPPED_SLUGS.size` is now 45 (47 − 2 fuse-box moved to the status-aware set). Adjust the assertion to `45` and add an assertion that 2 proposed dups are removed.

**Step 4: Run → PASS.**

**Step 5: Commit**

```bash
git add src/lib/firstVisit/questions.ts src/lib/firstVisit/__tests__/questions.drops.test.ts
git commit -m "feat(fv): drop 40 reviewed questions + 9d/9e cost fields via transform"
```

---

## Phase B — Findings repeater (unified shopping/repair model)

Replaces 9d cost fields + 9e status. One block-repeater group `finding`, rendered at BOTH
unit_category and location scope. Defined in TS so it survives XLSX re-sync.

### Task B1: Define the FINDINGS_QUESTIONS constant

**Files:**
- Modify: `src/lib/firstVisit/questions.ts`
- Test: `src/lib/firstVisit/__tests__/questions.findings.test.ts` (create)

**Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS } from '../questions';

const FINDING_SLUGS = [
  'finding_item_name', 'finding_category', 'finding_location',
  'finding_resolution', 'finding_quantity', 'finding_cost_estimate_eur',
  'finding_urgency', 'finding_notes', 'finding_media',
];

describe('Phase B — findings repeater', () => {
  it('registers all finding fields under group_id "finding"', () => {
    for (const slug of FINDING_SLUGS) {
      const matches = ALL_QUESTIONS.filter((q) => q.slug === slug);
      expect(matches.length, `${slug} present`).toBeGreaterThan(0);
      for (const m of matches) expect(m.group_id).toBe('finding');
    }
  });

  it('renders findings at both unit_category and location scope', () => {
    const scopes = new Set(
      ALL_QUESTIONS.filter((q) => q.slug === 'finding_item_name').map((q) => q.scope),
    );
    expect(scopes.has('unit_category')).toBe(true);
    expect(scopes.has('location')).toBe(true);
  });

  it('marks item_name, category, cost, media as required', () => {
    const req = (slug: string, scope: string) =>
      ALL_QUESTIONS.find((q) => q.slug === slug && q.scope === scope)!.required;
    for (const scope of ['unit_category', 'location']) {
      expect(req('finding_item_name', scope)).toBe(true);
      expect(req('finding_category', scope)).toBe(true);
      expect(req('finding_cost_estimate_eur', scope)).toBe(true);
      expect(req('finding_media', scope)).toBe(true);
      expect(req('finding_urgency', scope)).toBe(false);
    }
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement** — add a builder in `questions.ts`:

```typescript
// --- Phase B: unified Findings repeater (review 2026-06-02 §5) ---
const FINDING_CATEGORY_OPTIONS = [
  'Furniture', 'Appliance', 'Equipment', 'Bathroom', 'Structural/Building',
  'Consumable', 'Other',
];
const FINDING_LOCATION_OPTIONS = [
  'Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Hallway', 'Balcony',
  'Building/common', 'Other',
];
const FINDING_RESOLUTION_OPTIONS = ['Buy new (add)', 'Replace', 'Repair', 'Deep clean'];
const FINDING_URGENCY_OPTIONS = ['Blocks go-live', 'Nice-to-have'];

function makeFindingQuestions(
  scope: HubScope,
  phaseId: string,
  phaseLabel: string,
): FirstVisitQuestion[] {
  const base = {
    scope, mode: 'observe' as Mode, status: 'proposed' as Status, verdict: null,
    notes: null, repeater: true, group_id: 'finding', phase_id: phaseId,
    phase_label: phaseLabel,
  };
  const q = (
    slug: string, label: string, type: FieldType, required: boolean,
    options: string[] = [], extra: Partial<FirstVisitQuestion> = {},
  ): FirstVisitQuestion => ({
    ...base, slug, label, description: null, type, required, options,
    pms_target: null, ...extra,
  });
  return [
    q('finding_item_name', 'Item / issue (clear name)', 'text', true),
    q('finding_category', 'Category', 'select', true, FINDING_CATEGORY_OPTIONS),
    q('finding_location', 'Location in unit', 'select', false, FINDING_LOCATION_OPTIONS),
    q('finding_resolution', 'Resolution', 'select', true, FINDING_RESOLUTION_OPTIONS),
    q('finding_quantity', 'Quantity', 'number', false),
    q('finding_cost_estimate_eur', 'Cost estimate (€)', 'number', true),
    q('finding_urgency', 'Urgency', 'select', false, FINDING_URGENCY_OPTIONS),
    q('finding_notes', 'Notes', 'text', false),
    q('finding_media', 'Photo / video', 'file', true),
  ];
}
```

> Choose the phase placement: unit findings go into phase `9d` (Unit walkthrough), building
> findings into phase `5` (Building infrastructure). Confirm `phase_id`/`phase_label` strings
> against the JSON during implementation.

**Step 4: Merge into PHASES** — add a transform that appends findings to the right phases:

```typescript
function injectFindings(phases: FirstVisitPhase[]): FirstVisitPhase[] {
  return phases.map((p) => {
    if (p.id === '9d') {
      return { ...p, questions: [...p.questions, ...makeFindingQuestions('unit_category', p.id, p.label)] };
    }
    if (p.id === '5') {
      return { ...p, questions: [...p.questions, ...makeFindingQuestions('location', p.id, p.label)] };
    }
    return p;
  });
}
```

Add `injectFindings(...)` to the composition (inside, after `dropQuestions`):
```typescript
hideDealStampingQuestions(injectFindings(dropQuestions(dedupePhases(RAW.phases))))
```

**Step 5: Run → PASS. Commit**

```bash
git add src/lib/firstVisit/questions.ts src/lib/firstVisit/__tests__/questions.findings.test.ts
git commit -m "feat(fv): add unified findings repeater at unit + building scope"
```

### Task B2: Verify the render plan groups findings into one block

**Files:**
- Test: `src/lib/firstVisit/__tests__/questions.findings.test.ts`

The existing `buildRenderPlan` merges consecutive same-`group_id` questions into a `group`
node (UnitSurvey.tsx:689-723). Add a test that the 9 finding questions in a phase collapse
to a single group node. If the helper is not exported, export `buildRenderPlan` from
`UnitSurvey.tsx` (or move it to `questions.ts`) and test it there.

```typescript
it('collapses the 9 finding questions into a single repeater group', () => {
  const plan = buildRenderPlan(questionsInPhase('9d', 'unit_category'));
  const findingGroups = plan.filter((n) => n.kind === 'group' && n.groupId === 'finding');
  expect(findingGroups.length).toBe(1);
  expect(findingGroups[0].questions.length).toBe(9);
});
```

Commit after green.

### Task B3: Mandatory media inside a repeater block

**Files:**
- Modify: `src/components/firstVisit/StepGroup.tsx` (QuestionRow, ~210-329)
- Test: a component test or a progress test asserting a `file`-type required question renders a capture control per block.

The `finding_media` question is `type: 'file'` and required. Confirm QuestionRow renders the
media-capture control for `type === 'file'` within a block (step_index passed through). If `file`
is not yet handled in QuestionRow, add a branch that renders the existing media capture component
bound to `(targetId, areaKey, slug, stepIndex)`. Write the test first, then implement, then commit.

---

## Phase C — Keep condition ratings as pure observations

Decision (review §5): per-area ratings stay (feed health score) but no longer carry €.
`fv_furniture_status`, `fv_equipment_status`, `fv_bathroom_condition`, `fv_bathroom_issues`,
`fv_maintenance_level` remain. The cost fields were already removed in Phase A. No new code —
add ONE guard test so a future edit doesn't accidentally drop the ratings.

### Task C1: Guard test for kept ratings

**Files:** `src/lib/firstVisit/__tests__/questions.drops.test.ts`

```typescript
it('keeps per-area condition ratings (no longer cost-bearing)', () => {
  const present = new Set(ALL_QUESTIONS.map((q) => q.slug));
  for (const slug of ['fv_furniture_status','fv_equipment_status','fv_bathroom_condition','fv_bathroom_issues','fv_maintenance_level']) {
    expect(present.has(slug), `${slug} kept`).toBe(true);
  }
});
```

Run → PASS (no impl needed). Commit.

---

## Phase D — Require a unique identifier per unit before walkthrough

Today: on-site units require a non-empty label; hub units auto-derive a label with no prompt
and no uniqueness check (VisitNavigator.tsx:43-44, 729-854). Goal: every unit needs a unique,
non-empty identifier (the `label`) before its survey opens.

### Task D1: Uniqueness + non-empty helper (pure function, TDD)

**Files:**
- Create: `src/lib/firstVisit/unitIdentifier.ts`
- Test: `src/lib/firstVisit/__tests__/unitIdentifier.test.ts`

**Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { validateUnitIdentifier } from '../unitIdentifier';

describe('validateUnitIdentifier', () => {
  const siblings = ['Apt 1A', 'Apt 2B'];
  it('rejects empty / whitespace', () => {
    expect(validateUnitIdentifier('', siblings).ok).toBe(false);
    expect(validateUnitIdentifier('   ', siblings).ok).toBe(false);
  });
  it('rejects a case-insensitive duplicate within the property', () => {
    expect(validateUnitIdentifier('apt 1a', siblings).ok).toBe(false);
  });
  it('accepts a unique trimmed identifier', () => {
    const r = validateUnitIdentifier('  Apt 3C ', siblings);
    expect(r.ok).toBe(true);
    expect(r.value).toBe('Apt 3C');
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement**

```typescript
// src/lib/firstVisit/unitIdentifier.ts
export type IdentifierResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' | 'duplicate' };

export function validateUnitIdentifier(
  raw: string,
  existingSiblings: string[],
): IdentifierResult {
  const value = raw.trim();
  if (!value) return { ok: false, reason: 'empty' };
  const norm = value.toLowerCase();
  if (existingSiblings.some((s) => s.trim().toLowerCase() === norm)) {
    return { ok: false, reason: 'duplicate' };
  }
  return { ok: true, value };
}
```

**Step 4: Run → PASS. Commit.**

### Task D2: Prompt + validate for BOTH hub and on-site units

**Files:**
- Modify: `src/app/first-visit/[dealId]/[inspectionId]/VisitNavigator.tsx`
  (AddUnitControl ~729-854; `addUnitOnSite` ~283-315; the hub add path ~766-770)

**Changes:**
1. Hub-unit add (`onAddFromHub`): instead of passing the auto-derived label silently, open the
   same identifier input pre-filled with `unitLabel(u)`, and require the inspector to confirm a
   unique value. Wire through `validateUnitIdentifier(value, unitsOf(property.id).map(t => t.label))`.
2. On-site add: replace the bare non-empty check with `validateUnitIdentifier`; show an inline
   error for `empty` vs `duplicate`.
3. Persist `label = result.value` (trimmed) on the LocalTarget.

Add a test (component or logic-level) that adding a second unit with a duplicate identifier is
blocked. Commit after green.

### Task D3: Gate UnitSurvey entry on a present identifier

**Files:**
- Modify: `src/app/first-visit/[dealId]/[inspectionId]/VisitNavigator.tsx` (the node-open handler)

If a unit `LocalTarget.label` is empty (legacy data), block opening its survey and force the
identifier prompt first. Add a guard test. Commit.

---

## Phase E — Bucket-2 comment fixes

Each is a focused config edit in the JSON (these fields live in raw JSON) or a small transform.
Prefer editing `first-visit-questions.json` directly for single-field option/required changes;
prefer a transform when behavior is cross-cutting.

### Task E1: Building amenities → multi-select + custom, always shown

**File:** `src/data/first-visit-questions.json` (question `fv_building_amenities_verify`)
- Set `"multi_select": true`, `"allow_custom_options": true`.
- Replace options with the Host FAQ list:
  `["Aufzug","Gemeinschafts Balkon/Terrasse","Gemeinschaftsgarten","Schwimmbad","Sauna","Fitnessraum","Konferenzräume","Reception/Concierge"]`
- Ensure it is NOT gated on Host-FAQ prefill (it already renders unconditionally; confirm no
  conditional `follow_up`/visibility wraps it).
Test: assert the loaded question has `multi_select && allow_custom_options` and the 8 options.

### Task E2: Parking — exact spot number (optional) + mandatory photo

**File:** `src/data/first-visit-questions.json`
- Add `fv_parking_spot_number` (text, optional) near `fv_parking_dedicated_spots`.
- Add `fv_photo_parking_spot` (type `file`, required) anchored to the parking question via
  `"anchor_to": "fv_parking_dedicated_spots"`.
Test: both slugs present; photo required + `anchor_to` set.

### Task E3: Parking — underground clearance height (conditional)

**File:** `src/data/first-visit-questions.json` (question `fv_parking_access_instructions` or
the parking-type question)
- Add `fv_parking_underground_height_cm` (number) with a `follow_up`/conditional shown only when
  parking type indicates underground garage. Use the existing `follow_up` mechanism
  (`when_value` matches the underground option).
Test: the conditional config exists with the correct `when_value`.

### Task E4: Lock brand → once per unit + copy-from-unit

**Files:**
- `src/data/first-visit-questions.json`: remove `group_id: "checkin_step"` from `fv_step_lock_brand`,
  change scope to `unit_category` (a single per-unit field, not per step). (It is already in
  DROPPED of nothing — confirm it is not in DROPPED_SLUGS.)
- UI: add a "copy lock brand from already-filled unit" action in UnitSurvey for this field.
Tests: (a) `fv_step_lock_brand` has no `group_id` and scope `unit_category`; (b) copy action unit
test if logic is extracted to a helper.

> ⚠️ Scope move: confirm storage migration isn't needed — answers are keyed by
> `(target_id, area_key, slug, step_index)`. Moving brand off the repeater means it loses
> `step_index`; old per-step brand answers (if any in prod) are orphaned. Acceptable pre-launch.

### Task E5: Capacity — always collect

**File:** `src/data/first-visit-questions.json`
- `fv_capacity_actual_setup` and `fv_capacity_comments`: remove the conditional gate (set
  `required` per design; drop any `follow_up`/conditional so they always render).
Test: neither question carries a conditional; both render for unit_category scope.

### Task E6: Fuse box — add video + location photo

**File:** `src/data/first-visit-questions.json`
- Add `fv_video_fusebox` (type `file`, video) `anchor_to: "fv_fusebox_location"`.
- Add `fv_photo_fusebox_location` (type `file`, photo) `anchor_to: "fv_fusebox_location"`.
- Confirm existing `fv_photo_fusebox` also `anchor_to: "fv_fusebox_location"`.
Test: three media slugs anchored to the fuse-box question.

### Task E7: Common areas — add Shared kitchen + Shared garden

**File:** `src/data/first-visit-questions.json` (question `fv_common_area (repeater)` type list)
- Add `Shared kitchen` and `Shared garden` to the common-area type options.
Test: both options present.

### Task E8: Media anchoring confirmation (already built)

Confirm the 5 "Move to relevant section" media questions have `anchor_to` set to their topic
question (`fv_video_checkin_walkthrough`, `fv_video_trash_location`, `fv_photo_storage_room`,
`fv_video_parking_access`, `fv_photo_fusebox`). Add/adjust `anchor_to` where missing. Test the
anchor map places them under the right parent.

Commit after each task (E1…E8) once its test is green.

---

## Phase F — Findings CSV export (server route + button)

Single flat CSV with a unit identifier column and signed media URLs per finding.

### Task F1: CSV builder (pure function, TDD)

**Files:**
- Create: `src/lib/firstVisit/findingsCsv.ts`
- Test: `src/lib/firstVisit/__tests__/findingsCsv.test.ts`

**Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { buildFindingsCsv, type FindingRow } from '../findingsCsv';

const rows: FindingRow[] = [
  { unit_identifier: 'Apt 3B', item_name: 'Couch', category: 'Furniture',
    location_in_unit: 'Living room', resolution: 'Replace', quantity: 1,
    cost_estimate_eur: 400, urgency: 'Blocks go-live', notes: 'torn',
    media_links: ['https://x/a.jpg', 'https://x/b.mp4'] },
  { unit_identifier: 'Building / common', item_name: 'Hallway paint', category: 'Structural/Building',
    location_in_unit: 'Hallway', resolution: 'Repair', quantity: null,
    cost_estimate_eur: 180, urgency: null, notes: null, media_links: [] },
];

describe('buildFindingsCsv', () => {
  it('emits the header and a list_type derived from resolution', () => {
    const csv = buildFindingsCsv(rows);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'unit_identifier,list_type,item_name,category,location_in_unit,resolution,quantity,cost_estimate_eur,urgency,notes,media_links',
    );
    expect(lines[1]).toContain('Apt 3B,Shopping,'); // Replace → Shopping
    expect(lines[2]).toContain('Building / common,Renovation,'); // Repair → Renovation
  });
  it('joins media links with semicolons and quotes cells with commas', () => {
    const csv = buildFindingsCsv(rows);
    expect(csv).toContain('https://x/a.jpg;https://x/b.mp4');
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement**

```typescript
// src/lib/firstVisit/findingsCsv.ts
export type FindingRow = {
  unit_identifier: string; item_name: string; category: string;
  location_in_unit: string | null; resolution: string; quantity: number | null;
  cost_estimate_eur: number | null; urgency: string | null; notes: string | null;
  media_links: string[];
};

const HEADER = [
  'unit_identifier','list_type','item_name','category','location_in_unit',
  'resolution','quantity','cost_estimate_eur','urgency','notes','media_links',
];

export function listTypeFor(resolution: string): 'Shopping' | 'Renovation' | 'Ops' {
  if (resolution === 'Buy new (add)' || resolution === 'Replace') return 'Shopping';
  if (resolution === 'Repair') return 'Renovation';
  return 'Ops';
}

function cell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildFindingsCsv(rows: FindingRow[]): string {
  const body = rows.map((r) => [
    r.unit_identifier, listTypeFor(r.resolution), r.item_name, r.category,
    r.location_in_unit, r.resolution, r.quantity, r.cost_estimate_eur,
    r.urgency, r.notes, r.media_links.join(';'),
  ].map(cell).join(','));
  return [HEADER.join(','), ...body].join('\n');
}
```

**Step 4: Run → PASS. Commit.**

### Task F2: Server route — assemble rows + signed URLs

**Files:**
- Create: `src/app/api/first-visit/[inspectionId]/findings.csv/route.ts`
  (Next.js note: a `.csv` segment is a literal folder name; the route returns `text/csv`.)
- Test: `src/app/api/first-visit/[inspectionId]/findings.csv/__tests__/route.test.ts`

**Behavior:**
1. Auth via `getHubRouteContext(getHubSupabase())` (401 if null).
2. Read `inspectionId` from awaited params.
3. Load finding answers: query `first_visit_answers` where `inspection_id = ?` and
   `question_key LIKE 'finding_%'`, grouped by `(target_id, step_index)` into one row each.
4. Resolve `unit_identifier`: join `first_visit_targets.label` by `target_id`; location-scope
   findings → `'Building / common'`.
5. Resolve media: query `first_visit_media` for rows with `question_key = 'finding_media'`
   matching `(target_id, step_index)`; for each `storage_path` call
   `supabase.storage.from(BUCKET).createSignedUrl(storage_path, 60*60*24*7)` (7-day expiry).
6. `buildFindingsCsv(rows)` → return with headers:
   `Content-Type: text/csv; charset=utf-8`,
   `Content-Disposition: attachment; filename="findings-${inspectionId}.csv"`.

Reference the targets route boilerplate (`src/app/api/first-visit/targets/route.ts`) for client +
auth, and the upload-url route for the storage bucket constant.

**Tests:** mock the hub client; assert (a) 401 without auth, (b) the response body starts with the
CSV header, (c) `createSignedUrl` is called per media row, (d) location-scope finding yields
`Building / common`.

Commit after green.

### Task F3: "Download findings CSV" button

**Files:**
- Modify: `src/app/first-visit/[dealId]/[inspectionId]/VisitNavigator.tsx` (next to the existing
  Export button ~448)

```tsx
<a
  href={`/api/first-visit/${inspectionId}/findings.csv`}
  download
  tabIndex={-1}
  className="rounded border border-gray-300 px-2 py-0.5"
>
  Findings CSV
</a>
```

(Plain anchor — the browser streams the attachment; no client blob needed.) Manual smoke:
create a finding with a photo, sync, click → CSV downloads with a working signed link.
Commit.

---

## Phase G — Docs + final verification

### Task G1: Update review doc status
Append an "Implemented" note to
`/Users/Joshua/Documents/01_Projects/Onboarding_tool/docs/plans/2026-06-02-fv-survey-question-review.md`.

### Task G2: Full suite + typecheck
Run: `npm test` (all green) and `npx tsc --noEmit` (no errors). Fix fallout. Commit.

### Task G3: Manual smoke (production-like)
- Add a unit → identifier required + uniqueness enforced.
- Add a finding (unit + building) with mandatory media.
- Confirm 9d cost fields and 9e appliance status are gone; ratings remain.
- Download findings CSV → unit identifier + signed media links + correct list_type.

---

## Risks & notes
- **XLSX re-sync** (`scripts/sync-questions.sh`) regenerates `first-visit-questions.json` and will
  wipe direct JSON edits (Phase E) — TS transforms (Phase A/B) survive. Either update the XLSX
  source too, or treat JSON edits as authoritative and pause the sync. Flag to Joshua before
  any future sync.
- **Signed-URL expiry (7 days):** if findings lists must outlive a week, add a re-export action
  or move first-visit media to a public bucket (rejected here — media may contain PII like access
  codes). See review §6 Open.
- **Scope move for lock brand (E4):** orphans any pre-existing per-step brand answers; acceptable
  pre-launch.
- **PMS rollup:** findings € can later sum into `propertyFinancials.costs.oneOff`; out of scope here.
