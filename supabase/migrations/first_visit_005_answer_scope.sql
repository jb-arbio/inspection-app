-- First Visit Survey — visit tree scope columns + targets table
-- Run in Onboarding_tool's Supabase project (Studio SQL editor).
-- After applying: NOTIFY pgrst, 'reload schema';

-- Answers/media now hang off a tree node (target) and carry the hub scope they
-- write back to. target_id === inspection_id is the deal-scoped visit root.
ALTER TABLE onboarding.first_visit_answers
  ADD COLUMN IF NOT EXISTS target_id UUID,
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS location_id UUID,
  ADD COLUMN IF NOT EXISTS unit_category_id UUID;

ALTER TABLE onboarding.first_visit_media
  ADD COLUMN IF NOT EXISTS target_id UUID;

-- Answers are now unique per tree node, not per inspection. Drop the old
-- inspection-scoped uniqueness if present and key on the target.
ALTER TABLE onboarding.first_visit_answers
  DROP CONSTRAINT IF EXISTS first_visit_answers_inspection_id_question_key_area_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_first_visit_answers_target
  ON onboarding.first_visit_answers(target_id, question_key, area_key);

-- The visit tree: properties (location) and units (unit_category) under one
-- inspection. Either pulled from the hub or created on-site by staff.
CREATE TABLE IF NOT EXISTS onboarding.first_visit_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES onboarding.first_visit_inspections(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('property','unit')),
  parent_id UUID,
  location_id UUID,
  unit_category_id UUID,
  label TEXT,
  created_on_site BOOLEAN NOT NULL DEFAULT false,
  "order" INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_first_visit_targets_inspection
  ON onboarding.first_visit_targets(inspection_id);

ALTER TABLE onboarding.first_visit_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read first_visit_targets"
  ON onboarding.first_visit_targets FOR SELECT TO authenticated
  USING (onboarding.is_staff());
CREATE POLICY "Staff insert first_visit_targets"
  ON onboarding.first_visit_targets FOR INSERT TO authenticated
  WITH CHECK (onboarding.is_staff());
CREATE POLICY "Staff update first_visit_targets"
  ON onboarding.first_visit_targets FOR UPDATE TO authenticated
  USING (onboarding.is_staff());
