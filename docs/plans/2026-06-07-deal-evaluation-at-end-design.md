# Deal Evaluation at the End — Design Doc

**Date:** 2026-06-07
**Status:** Approved.
**Owner:** First Visit Survey app

## 1. Problem

The VisitNavigator's top "Visit details" card renders ALL deal-scoped questions, which
mashes two phases together:

- **Phase 1 "Visit metadata"** — date of visit, visitor name (deal name already hidden
  via `HIDDEN_DEAL_STAMPING_SLUGS`). Belongs at the start.
- **Phase 11 "Final assessment / readiness"** — 7 deal-evaluation questions
  (`fv_readiness_overall`, `fv_readiness_go_live_recommendation`,
  `fv_readiness_go_live_delay_weeks`, `fv_readiness_blocking_issues`,
  `fv_readiness_blocking_details`, `fv_readiness_health_score`,
  `fv_readiness_recommendation_summary`). The inspector is asked for a verdict
  before seeing a single room.

## 2. Decision

**Pure UI split. No data-model change, no scope change, no migration, no new questions.**
Answers keep the same target (`inspectionId`), scope (`deal`), and slugs — only where the
questions appear in the navigator changes.

Rejected alternatives:
- Re-scope phase-11 questions to `location` — wrong semantics (evaluation is per-deal,
  breaks multi-location deals) and a data migration for a UI problem.
- Reorder questions within the single deal card — doesn't put the evaluation at the end
  of the flow, which is the whole point.

## 3. Changes

1. **`UnitSurvey` gains optional `phaseIds?: string[]`** — when provided, renders only
   those phases from `phasesForScope(scope)`. Absent = all phases (today's behavior,
   backwards-compatible for property/unit cards).
2. **`VisitNavigator` splits the deal card:**
   - Top card (unchanged position): **"Visit details"** → `phaseIds: ['1']`.
   - New bottom card: **"Deal evaluation"**, subtitle "Fill in at the end of the visit" →
     `phaseIds: ['11']`, placed AFTER the Properties section (near Findings CSV / Submit).
   - `selected` state distinguishes the two (carry `phaseIds` + label on the deal variant).
3. **Progress split:** `computeProgressFromAnswers` gains the same optional phase filter
   so each card's ProgressRing counts only its own questions. The two cards sum to
   exactly the old deal total, so `totalUnansweredRequired` / submit gating are unchanged.
4. **`fv_general_comments`** (phase 11, `location` scope) is untouched — it already
   renders in the property section.

## 4. Testing

- Phase-filter tests: `phaseIds: ['1']` renders only metadata; `['11']` only evaluation;
  absent renders all (regression guard for property/unit cards).
- Progress tests: filtered progress for '1' + '11' sums to unfiltered deal progress.
- Navigator order: evaluation card appears after the Properties section.

— end —
