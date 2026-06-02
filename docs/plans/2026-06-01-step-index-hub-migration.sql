-- =============================================================================
-- First Visit Survey — Full hub schema setup (idempotent)
-- =============================================================================
--
-- WHEN TO APPLY: Paste into the Supabase Studio SQL Editor on the
-- Onboarding_tool hub project, then run. Idempotent — safe to re-run.
--
-- WHY a single combined file instead of the per-migration files in
-- supabase/migrations/? Because the per-migration files were never applied
-- to the live hub (verified 2026-06-01: `first_visit_answers` did not exist
-- in the hub when Refactor Phase 2's step_index migration tried to ALTER it).
-- This consolidated script creates all four tables + the step_index column
-- inline, so a fresh hub or a partially-applied one ends up correct.
--
-- After running, do NOT forget the schema-reload NOTIFY at the bottom.
-- PostgREST caches the schema; new columns are invisible to the API until
-- it reloads.
-- =============================================================================

SET search_path = onboarding;

-- 1) Inspections (top-level visit record per deal).
CREATE TABLE IF NOT EXISTS first_visit_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  unit_category_id UUID REFERENCES unit_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','submitted','discarded')) DEFAULT 'draft',
  inspector_email TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_first_visit_inspections_inspector
  ON first_visit_inspections(inspector_email);
CREATE INDEX IF NOT EXISTS idx_first_visit_inspections_deal
  ON first_visit_inspections(deal_id);

-- 2) Visit tree (properties + units under each inspection).
CREATE TABLE IF NOT EXISTS first_visit_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES first_visit_inspections(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('property','unit')),
  parent_id UUID,
  location_id UUID,
  unit_category_id UUID,
  label TEXT,
  created_on_site BOOLEAN NOT NULL DEFAULT false,
  "order" INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_first_visit_targets_inspection
  ON first_visit_targets(inspection_id);

-- 3) Answers (per tree node, with step_index for block-repeater instances).
CREATE TABLE IF NOT EXISTS first_visit_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES first_visit_inspections(id) ON DELETE CASCADE,
  target_id UUID,
  scope TEXT,
  location_id UUID,
  unit_category_id UUID,
  question_key TEXT NOT NULL,
  area_key TEXT NOT NULL,
  step_index INT NULL,
  value JSONB,
  notes TEXT,
  data_point_slug TEXT,
  hub_suggestion_snapshot JSONB,
  was_prefilled BOOLEAN NOT NULL DEFAULT false,
  was_accepted_as_is BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_first_visit_answers_target
  ON first_visit_answers(target_id, question_key, area_key);
CREATE INDEX IF NOT EXISTS idx_first_visit_answers_inspection
  ON first_visit_answers(inspection_id);
CREATE INDEX IF NOT EXISTS idx_fva_target_step
  ON first_visit_answers(target_id, step_index);

-- 4) Media (photos / videos / audio attached to answers).
CREATE TABLE IF NOT EXISTS first_visit_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES first_visit_inspections(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES first_visit_answers(id) ON DELETE SET NULL,
  target_id UUID,
  area_key TEXT NOT NULL,
  question_key TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('photo','video','audio')),
  storage_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_first_visit_media_inspection
  ON first_visit_media(inspection_id);

-- 5) RLS + staff policies (idempotent — DROP+CREATE for each).
ALTER TABLE first_visit_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_visit_targets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_visit_answers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_visit_media       ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['first_visit_inspections','first_visit_targets','first_visit_answers','first_visit_media']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Staff read %1$s" ON %1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Staff insert %1$s" ON %1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Staff update %1$s" ON %1$s', t);
    EXECUTE format('CREATE POLICY "Staff read %1$s" ON %1$s FOR SELECT TO authenticated USING (is_staff())', t);
    EXECUTE format('CREATE POLICY "Staff insert %1$s" ON %1$s FOR INSERT TO authenticated WITH CHECK (is_staff())', t);
    EXECUTE format('CREATE POLICY "Staff update %1$s" ON %1$s FOR UPDATE TO authenticated USING (is_staff())', t);
  END LOOP;
END$$;

-- 6) Canonical answer store — add step_index for repeater aggregation at push.
ALTER TABLE data_point_values
  ADD COLUMN IF NOT EXISTS step_index INT NULL;
CREATE INDEX IF NOT EXISTS idx_dpv_scope_step
  ON data_point_values(scope_id, step_index);

-- 7) Schema-cache reload — PostgREST won't see new columns without this.
NOTIFY pgrst, 'reload schema';
