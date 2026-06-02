CREATE TABLE IF NOT EXISTS onboarding.first_visit_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES onboarding.first_visit_inspections(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  area_key TEXT NOT NULL,
  value JSONB,
  notes TEXT,
  data_point_slug TEXT,  -- resolved to data_point_id at write-back time
  hub_suggestion_snapshot JSONB,
  was_prefilled BOOLEAN NOT NULL DEFAULT false,
  was_accepted_as_is BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  UNIQUE (inspection_id, question_key, area_key)
);

CREATE INDEX IF NOT EXISTS idx_first_visit_answers_inspection
  ON onboarding.first_visit_answers(inspection_id);

ALTER TABLE onboarding.first_visit_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read first_visit_answers"
  ON onboarding.first_visit_answers FOR SELECT TO authenticated
  USING (onboarding.is_staff());
CREATE POLICY "Staff insert first_visit_answers"
  ON onboarding.first_visit_answers FOR INSERT TO authenticated
  WITH CHECK (onboarding.is_staff());
CREATE POLICY "Staff update first_visit_answers"
  ON onboarding.first_visit_answers FOR UPDATE TO authenticated
  USING (onboarding.is_staff());
