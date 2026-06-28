# Store a qualitative voice summary per section (in addition to structured fields)

> **For Claude:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (or executing-plans) to implement task-by-task. After approval, copy this plan to `docs/plans/2026-06-28-fv-voice-summary.md` and commit. Branch off `upstream/main` (current head 8c4e18e); push to `origin` (jb-arbio) and PR/merge to `iuliia-arbio/main` (the correct repo), same flow as PRs #10/#11.

**Goal:** For every voiced section, store a concise AI **qualitative summary** of the clip *in addition to* the structured fields it already pre-fills, show it as an editable box under the prompt, and sync it to the hub. Build a per-prompt `qualitative_only` toggle (off for now) so any section (e.g. check-in) can later capture *only* the summary.

**Tech stack:** Next.js App Router, React, TS, Dexie/IndexedDB → Supabase hub, Vitest.

---

## Context

The section-voice flow records a clip → accurate transcript (`postTranscribeAccurate`) → structured extraction (`postVoiceExtraction` → gpt-4o-mini structured output) → writes Accept-able suggestion rows. **The transcript is produced then discarded** (`useSectionVoiceFill.ts:116` → used at `:119`, never stored). Field feedback: keep the structured data points BUT also retain a shortened, informational qualitative record of what the inspector said — some sections (check-in steps) may eventually want *only* that narrative.

**User decisions (this session):** AI summary (not raw transcript); all voiced sections; keep both structured+summary for check-in now (build the qualitative-only toggle but leave it off); show the summary as an **editable** box.

### Key facts found during exploration (reuse, don't reinvent)
- **Extraction schema is built dynamically** (`extractionSchema.ts:105 buildExtractionSchema`) and is a strict JSON-schema object with root `singles`/`items`. Adding a root `summary` string is trivial and rides the **same gpt call** — no extra round-trip/cost.
- **Synthetic-key answers already exist and sync with ZERO hub changes.** The hub upserts on `[target_id, question_key, area_key]` with **no registry validation** (`src/app/api/first-visit/answers/route.ts:38`). Existing precedent: `${slug}__follow_up`, `${slug}__per_option__…` written via `onChange(q, change, stepIndex, syntheticQuestionKey)` (`UnitSurvey.tsx` ~131–168).
- **A summary is hub-only / qualitative by nature** — `pms_target: null`, no PMS work (`scripts/redesign/pms.mjs`). Synthetic slug `${promptId}__summary`, `area_key = phaseId` → unique per prompt.
- **Write path to reuse:** `aiFill.ts buildRow`/`writeAiSuggestions` (Dexie `bulkPut` + `enqueue('answer_upsert')`).

### Design summary
- **One extra schema field**, returned through validation as `summary: string | null`.
- Summary written **directly to `value`** (editable prose, NOT the Accept-to-confirm channel) as a synthetic answer `question_key = ${promptId}__summary`, `area_key = phaseId`, `was_prefilled:true`.
- Rendered as an editable textarea under the prompt card; edits go through the existing synthetic-key `onChange`.
- `qualitative_only` per prompt: when true, voice writes **only** the summary (skips structured singles/items); fields still render for manual entry. Off for all prompts initially.
- Re-recording a prompt **overwrites** its summary (intentional redo) — documented behaviour.

---

## Tasks

### Task 1 — Extraction: return a `summary`
**Files:** `src/lib/firstVisit/extractionSchema.ts`, `extractionPrompt.ts`, `validateExtraction.ts` (+ tests in `src/lib/firstVisit/__tests__/`).
1. `buildExtractionSchema`: add `summary: { type: ['string','null'] }` to `schema.properties` and to `required` (strict mode requires every property listed; null is allowed). Singles/items unchanged.
2. `EXTRACT_SYSTEM_PROMPT`: append a rule — *"Also return `summary`: a concise factual 2–4 sentence qualitative recap of what the inspector said about this section, in English, no fabrication. Empty/irrelevant clip → null."*
3. `validateExtraction.ts`: extend `ValidatedExtraction` with `summary: string | null`; coerce non-string → null, trim, cap length (e.g. 1500 chars).
4. Tests: schema has `summary` property; validate returns trimmed/capped string, null for missing/non-string.

### Task 2 — Config: summary slug + qualitative-only flag
**Files:** `src/data/section-voice-prompts.ts` (+ guard test `__tests__/section-voice-prompts.test.ts`).
1. `SectionPrompt`: add `qualitative_only?: boolean` (optional; undefined = false).
2. Export helper `voiceSummarySlug(promptId: string): string` → `` `${promptId}__summary` ``.
3. Guard test: every `voiceSummarySlug(p.id)` is unique across all prompts (per phase area_key + global).

### Task 3 — Write path: persist the summary row
**Files:** `src/lib/firstVisit/aiFill.ts` (+ `__tests__/aiFill.test.ts`).
1. `WriteArgs`: add `summarySlug?: string` and `writeStructured?: boolean` (default true).
2. In `writeAiSuggestions`: when `!writeStructured`, skip the singles+items loops. When `summarySlug` set and `extraction.summary` non-empty, push a row via a small builder: `question_key/data_point_slug = summarySlug`, `value = extraction.summary` (direct, editable prose), `step_index: null`, `was_prefilled:true`, `was_accepted_as_is:false`. Overwrite any existing summary row (reuse its id/created_at). Include it in `writtenRows`.
3. Tests: summary row written with value=text when summary present; none when null; structured skipped when `writeStructured:false` but summary still written; summary row overwrites existing.

### Task 4 — Hook: request + carry the summary through
**Files:** `src/lib/firstVisit/postVoiceExtraction.ts`, `src/lib/firstVisit/useSectionVoiceFill.ts`.
1. `postVoiceExtraction` already returns the full `ValidatedExtraction` (now incl. `summary`) — no signature change.
2. `useSectionVoiceFill`: extend `onStart(promptId, areaKey, targetSlugs, summarySlug, qualitativeOnly)`; store `summarySlugRef`, `qualitativeOnlyRef`. In `onStop`, pass `summarySlug` + `writeStructured: !qualitativeOnly` to `writeAiSuggestions`. (When `qualitativeOnly`, still extract structured for the summary context but don't write fields.)
3. Keep `VoiceFillSummary` as-is; optionally set a flag (e.g. `summaryWritten`) so the card hint can append "· summary saved". Low priority.

### Task 5 — UI: editable summary box under the prompt
**Files:** `src/components/firstVisit/SectionVoicePrompts.tsx` (new small `VoiceSummaryField` or inline), `src/app/first-visit/[dealId]/[inspectionId]/UnitSurvey.tsx`.
1. `VoicePromptCard.onStart` call passes `voiceSummarySlug(prompt.id)` and `prompt.qualitative_only` (import helper).
2. New presentational `VoiceSummaryField` (textarea, label "Summary (from voice)", `✦ from voice` highlight when just-filled): props `value`, `justFilled`, `onChange(text)`.
3. In `UnitSurvey.voiceCardFor`: return a `<Fragment>` of the card **plus** the summary box, rendered when `answers[${target.id}::${phaseId}::${summarySlug}]?.value` is non-empty. Wire its `onChange` to the existing synthetic-key path: `onChange(anchorQuestion, { value: text, wasAcceptedAsIs: false }, null, summarySlug)` where `anchorQuestion` is the phase question matching the prompt's anchor slug (already resolved in `voiceCardFor`). Use the same key in `justFilledKeys` so the highlight works.

### Task 6 — Green + ship
1. `npx tsc --noEmit`; `npx vitest run --pool=forks` (one run, wait — output buffers when non-TTY); `npm run build`.
2. Copy plan to `docs/plans/2026-06-28-fv-voice-summary.md`; commit. Branch off `upstream/main`, push to `origin`, PR → `iuliia-arbio/main`, merge.
3. Update auto-memory MEMORY.md.

---

## Verification
- **Unit:** schema includes `summary`; `validateExtraction` trims/caps/nulls; `writeAiSuggestions` writes/overwrites the summary row and honours `writeStructured`; `voiceSummarySlug` uniqueness guard.
- **Build/types:** `tsc` + `npm run build` clean; full vitest green (currently 376).
- **Manual E2E** (`NEXT_PUBLIC_FV_VOICE_FILL=1`, `OPENAI_API_KEY` set): record a section clip → structured fields pre-fill as today AND an editable "Summary (from voice)" box appears with a concise recap → edit it → it persists (Dexie) and enqueues sync. Confirm the synthetic `${promptId}__summary` row reaches `first_visit_answers` with no hub changes. Flip one prompt to `qualitative_only:true` in a scratch edit → only the summary is written, structured fields stay empty (manual). Flag off → no voice UI at all.

## Risks / notes
- **Re-record overwrites** the summary (intended redo) — could lose a manual edit made before re-recording; acceptable for v1, documented.
- **Hub hand-off:** new hub-only qualitative slugs `${promptId}__summary` (e.g. `p3_parking__summary`); no PMS target. Mention in the hub registry note if/when summaries should map to `operationalInfo.*` (out of scope here).
- Summary adds a small number of output tokens to each extraction call; no extra request.
