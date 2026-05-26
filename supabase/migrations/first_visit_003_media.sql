CREATE TABLE IF NOT EXISTS onboarding.first_visit_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES onboarding.first_visit_inspections(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES onboarding.first_visit_answers(id) ON DELETE SET NULL,
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
  ON onboarding.first_visit_media(inspection_id);

ALTER TABLE onboarding.first_visit_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read first_visit_media"
  ON onboarding.first_visit_media FOR SELECT TO authenticated
  USING (onboarding.is_staff());
CREATE POLICY "Staff insert first_visit_media"
  ON onboarding.first_visit_media FOR INSERT TO authenticated
  WITH CHECK (onboarding.is_staff());
CREATE POLICY "Staff update first_visit_media"
  ON onboarding.first_visit_media FOR UPDATE TO authenticated
  USING (onboarding.is_staff());
