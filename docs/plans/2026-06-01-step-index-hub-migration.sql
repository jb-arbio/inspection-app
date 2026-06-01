-- =============================================================================
-- First Visit Refactor Phase 2 — `step_index` column for block-repeater answers
-- =============================================================================
--
-- WHEN TO APPLY: Paste into the Supabase Studio SQL Editor on the hub project
-- (the Onboarding_tool repo's database), then run. The inspection-app-fork
-- WS-A code is forward-compatible: it serialises `step_index` only when
-- present, and the API route accepts `null` until the column exists.
--
-- WHY: Block-repeater UI (check-in steps, equipment issues, appliances, etc.)
-- needs to address multiple answer rows that share the same
-- (target_id / scope_id, area_key, question_key). The `step_index` coordinate
-- preserves the 1-question = 1-answer invariant of the polymorphic answer
-- architecture — each instance is a separate row, distinguished by its index.
--
-- IMPORTANT: After running, do NOT forget the schema-reload NOTIFY at the
-- bottom; PostgREST caches the schema and new columns are invisible to the
-- API until it reloads.
--
-- Column types: INT NULL — single instance answers leave it NULL; repeater
-- instances number from 0 upward (UI decision; not enforced here).
--
-- Table names are based on hub-repo conventions as of 2026-06-01. If the
-- live schema differs, adjust the names before running.
-- =============================================================================

SET search_path = onboarding;

-- Survey answers persisted by the inspector via inspection-app-fork.
ALTER TABLE first_visit_answers
  ADD COLUMN IF NOT EXISTS step_index INT NULL;

-- Canonical polymorphic answer store used across the hub (HostFAQ, prefills,
-- PMS push). Same coordinate so a repeater group can be flattened the same
-- way regardless of which pipeline wrote it.
ALTER TABLE data_point_values
  ADD COLUMN IF NOT EXISTS step_index INT NULL;

-- Indexes for the per-group aggregation query at PMS push time
-- (read every step of a repeater group on a given scope, in order).
CREATE INDEX IF NOT EXISTS idx_dpv_scope_step
  ON data_point_values (scope_id, step_index);

CREATE INDEX IF NOT EXISTS idx_fva_target_step
  ON first_visit_answers (target_id, step_index);

-- PostgREST schema cache reload — required after any column change so the
-- REST/GraphQL API surfaces the new field. Without this the API will silently
-- drop step_index from inserts and selects.
NOTIFY pgrst, 'reload schema';
