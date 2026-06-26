# Replace First-Visit Survey with the V1 Redesign Question Set

> **For Claude:** REQUIRED SUB-SKILL: use superpowers:executing-plans (or subagent-driven-development) to implement task-by-task. After approval, also copy this plan to `docs/plans/2026-06-24-fv-v1-redesign-questions.md` and commit.

**Goal:** Replace the live first-visit survey field set with the Notion "First-Visit Survey — V1 Redesign (review)" question set (15 phases, gate-driven), keep our content+overlay architecture, and keep the broad-prompt-per-category voice-fill that pre-fills the structured fields.

**Tech Stack:** Next.js App Router, React, TS, Dexie/IndexedDB, Supabase hub, Vitest. Config = editor-safe `content` (`src/data/first-visit-content.json`) + engineer overlay (`src/lib/firstVisit/questionStructure.ts`) composed by `buildSurveyConfig` (`surveyConfig.ts`).

---

## Context

The team redesigned the survey in Notion (DB `ccc55f4d…`, data source `collection://8d91e5e7-08c5-436a-b91d-55a8dd7e70de`). It is a **structural overhaul**, not a tweak: **18 phases → 15**, regrouped, with a pervasive **gate model** (each block fronted by a yes/no/select that collapses its sub-fields) and **reworked repeaters** (unified **Issue log**, new **Item log**, richer **Check-in steps**). User decisions: **replace the live config now**; **re-fetch the Notion gaps ourselves** (no CSV export); **keep the voice-fill approach** (broad spoken prompt per category → structured fields pre-filled as confirmable suggestions).

**Caveat surfaced to user (accepted):** the DB is labelled "(review)" and most rows are `Review decision = Undecided` — we're shipping an unreviewed redesign by explicit choice. PMS mappings for net-new fields are unknown and become a hub follow-up.

### The blocking architectural fact
This tree has `follow_up`, `per_option_follow_up`, `group_id` repeaters and `anchor_to`, **but no whole-question `visible_when` gating engine**. The redesign is ~80% gates. The engine *was* built on branch `feat/fv-feedback-2026-06-11` (commits `c0e7d48`, `5311f3d`, `6e20d13`, `5a7f510`) and must be **ported** here first (Phase 0). Ported `VisibleWhen`/`isVisible` shape (verbatim from that branch):

```ts
export type VisibleWhen = { question: string; equals?: unknown; not_equals?: unknown; in?: unknown[]; not_in?: unknown[] };
// isVisible(rule, answersByKey): equals/in → hidden until controller matches; not_equals/not_in → visible until excluded; strict ===.
```

### Field mapping rules (Notion → our config)
- **Input → `type`**: text→text, number→number, select→select, **multi-select→select + `multi_select:true`**, boolean→boolean, date→date, file→file. (No `scale` rows exist; FieldType has no 'scale'.)
- **Level → `scope`**: Visit→`deal`, Property→`location`, Unit→`unit_category`.
- **Required** Yes/No → boolean. **Guidance (V1 proposal)** → `description`. **Options** ("A · B · C") → `options[]` (strip `+custom` → `allow_custom_options:true`; `None` stays an option).
- **Shown when (gate)** → overlay `visible_when` (e.g. `[Parking present] = not None` → `{question:<parking slug>, not_in:['None']}`; `[Elevator present] = Yes` → `{question:<slug>, equals:true}`; `[Noise] != No` → `{question:<slug>, not_equals:'No'}`; `[Issues found] = Yes` → `{question:<slug>, equals:true}`).
- **Repeating block** → overlay `group_id`: Check-in steps→`checkin_step`, Issue log→`issue`, Item log→`item`.
- **Slugs (no slug column in Notion):** reuse the **current** slug where a question is clearly preserved (so its `pms_target` + code refs carry over); else mint `fv_<snake_case>`. Repeater members prefixed by group. Carry `pms_target` only on 1:1 preserved fields; leave net-new `null` and list for the hub follow-up.

### New phase structure (ids = Notion numbers `1`…`15`)
1 Visit metadata · 2 Location & neighbourhood · 3 Building exterior & parking · 4 Building access & check-in · 5 Building infrastructure & services · 6 Cleaning & laundry · 7 WiFi · 8 Unit identity · 9 Unit capacity · 10 Unit condition & issues · 11 Unit appliances & amenities · 12 Unit safety equipment · 13 Unit amenities & details · 14 Unit photos & videos · 15 Final assessment / readiness. (`#` runs 1→136 with intentional consolidation gaps; ~118 live rows.)

### Gates to wire (controller → block)
parking#9 (not None), elevator#25, storage#42, trash#47, central fuse box#53, central fire safety#58, wifi#71, laundry setup#67 (≠ "Not yet set up"), noise#87 (≠ No), balcony#81, issues found#96, items to log#106, unit fuse box#114, extinguisher#117, smoke detector#120, CO detector#122, first-aid#124.

### Repeaters (contiguous runs — compatible with the renderer's consecutive-`group_id` merge)
- **Check-in steps** #29–38: step name, access point, lock type, smart-lock provider, smart-lock serial, lock brand, lock classification, key storage method, storage brand, default access code. (serial/code = manual, voice-excluded.)
- **Issue log** #97–105 (gate #96): name, type[Furniture·Equipment·Maintenance·Other], location, resolution[Buy·Fix·Replace·Monitor], quantity, cost estimate(€), urgency, photo(file), notes.
- **Item log** #107–113 (gate #106): item name, item kind, brand/manufacturer, location, operation notes, availability type, how-to-use video(file).

---

## Tasks

### Phase 0 — Port the `visible_when` gating engine (prerequisite)
**Files:** `src/lib/firstVisit/questions.ts`, `surveyConfig.ts`, `progress.ts`, `src/app/first-visit/[dealId]/[inspectionId]/UnitSurvey.tsx`, `StepGroup.tsx`, voice `extractionSchema.ts`/`useSectionVoiceFill.ts`; tests alongside.
1. Port `VisibleWhen` type + `isVisible`/`matchesValue`/`inList` into `questions.ts` (from `feat/fv-feedback-2026-06-11`). Add `visible_when?: VisibleWhen` to `FirstVisitQuestion`.
2. Add `'visible_when'` to `OverlayEntry`'s `Pick<…>` in `surveyConfig.ts` (gates are engineer-owned, live in the overlay).
3. Renderer: in `UnitSurvey.tsx` build `answersByKey: Map<slug, value>` from current answers; **skip** questions where `!isVisible(q.visible_when, map)` and **clear** their stored values (port commit `5311f3d`). Ensure a fully-hidden repeater group renders nothing (gate on the block).
4. `progress.ts`: required denominator counts only visible-required (`requiredVisible`, port `6e20d13`).
5. Voice: intersect a prompt's `target_slugs` with currently-visible slugs before schema build + write.
6. Tests: `isVisible` predicate (port), renderer skip-and-clear, progress excludes hidden-required, repeater-block gating.

### Phase 1 — Authoritative extraction + mapping spec
**Files:** scratch `docs/plans/_fv-redesign-rows.json` (working artifact, not shipped).
1. Re-extract **all** rows via `notion-search` (data_source_url, page_size 25, varied queries) → collect unique ids → `notion-fetch` each. **Verify `#` contiguity** (1→136 minus known consolidation gaps) so nothing is silently missing. Already resolved: #66 Cleaning setup, #70 Extra services, #102 Cost estimate(€), item-log #107–113.
2. Resolve **empty option sets** (many selects ship blank Options in Notion — e.g. Unit type, Apartment category, Storage location, Laundry/Cleaning setup, Item kind, Availability type, readiness, Health score): carry the option list from the **current** config where the field is preserved; flag any genuinely new select with no source as "needs options authored".
3. Build the mapping spec: per row → {slug, phase_id, scope, type, options, required, multi_select, allow_custom_options, visible_when, group_id, follow_up, anchor_to, pms_target}. This spec drives Phases 2–3.

### Phase 2 — Rewrite content + parity snapshot
**Files:** `src/data/first-visit-content.json`, `src/lib/firstVisit/__tests__/__fixtures__/all-questions.snapshot.json`.
1. Write the new `first-visit-content.json` (15 phases, content-only fields, `version`/`generated_at` bumped).
2. Regenerate the parity snapshot to the **new** composed `ALL_QUESTIONS` (the set changes deliberately; the test now guards the new output against accidental drift).

### Phase 3 — Rewrite the structural overlay
**Files:** `src/lib/firstVisit/questionStructure.ts`.
1. Per-slug overlay: `visible_when` for every gated field; `group_id` for the three repeaters; `follow_up` for inline conditionals (e.g. "Yes (explain)"); `anchor_to` mapping each `file` question to its data parent (parking photo→parking, fuse-box video→fuse-box; issue photo lives inside the issue repeater); `mode:'observe'` for media; `pms_target` carried over / `null`.

### Phase 4 — Repeater titles, voice prompts, validation
**Files:** `src/lib/firstVisit/repeaterGroups.ts` (+ coverage guard test), `src/data/section-voice-prompts.ts` (+ guard test), `src/lib/firstVisit/validateSurveyContent.ts` (+ guard test).
1. `repeaterGroups.ts`: add `checkin_step`, `issue`, `item` (title/intro/itemNoun); coverage guard stays green.
2. Re-author `section-voice-prompts.ts` keyed by the new phase ids — broad spoken prompt per category mapping to that category's voice-suitable slugs. **Exclude** phases 1 (metadata) & 14 (photos), and within phases exclude `file`, exact codes/serials, and precise measurements (door widths, ceiling height). Issue log keeps the "go issue by issue…" prompt → new `issue.*` slugs. Guard test: every `target_slug` exists in its phase, non-file, no orphans/overlap.
3. Add/confirm a guard test asserting the shipped `content` + `QUESTION_STRUCTURE` passes `validateSurveyContent`.

### Phase 5 — Wire-up, fix fallout, green
1. `CONFIG_META` counts recompute automatically. `extractionSchema`/`aiFill` rebuild from `ALL_QUESTIONS` — no change needed.
2. Fix every test/fixture referencing **old** slugs or phase ids (UnitSurvey phase-filter/lastPhase/anchoring/renderPlan fixtures, progress tests, extraction tests).
3. `npx vitest run --pool=forks` (one run, wait — output buffers when non-TTY), `npm run build`, `tsc` all green. Manual smoke per Verification.

---

## Verification
- Unit: `isVisible`, renderer skip-and-clear, progress requiredVisible, repeater gating, voice-prompt guard, repeater-group coverage, `validateSurveyContent` on shipped config, parity snapshot.
- Build/types: `npm run build` + `tsc` clean.
- Full suite: `npx vitest run --pool=forks` (single background run; never run two vitest processes at once — corrupts results).
- Manual E2E in `/first-visit/...`: parking=None collapses parking; "Any issues found?"=Yes reveals the Issue log; `NEXT_PUBLIC_FV_VOICE_FILL=1` → a category prompt pre-fills its visible fields as Accept-able suggestions; flag off = no voice UI.

## Risks / follow-ups (not blockers)
- **PMS mapping** for net-new slugs — hub task; ship `null`, list them.
- **Empty option sets** for some new selects — author or carry from current config; flag any left blank.
- **Unreviewed redesign** — shipping by explicit user choice; expect churn when review lands.
- Large test-fallout surface from the slug/phase overhaul (Phase 5).
