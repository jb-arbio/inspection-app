-- First Visit Survey — inspections table
-- Run in Onboarding_tool's Supabase project (Studio SQL editor).
-- After applying: NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS onboarding.first_visit_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES onboarding.deals(id) ON DELETE CASCADE,
  location_id UUID REFERENCES onboarding.locations(id) ON DELETE SET NULL,
  unit_category_id UUID REFERENCES onboarding.unit_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','submitted','discarded')) DEFAULT 'draft',
  inspector_email TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_first_visit_inspections_inspector
  ON onboarding.first_visit_inspections(inspector_email);
CREATE INDEX IF NOT EXISTS idx_first_visit_inspections_deal
  ON onboarding.first_visit_inspections(deal_id);

ALTER TABLE onboarding.first_visit_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read first_visit_inspections"
  ON onboarding.first_visit_inspections FOR SELECT TO authenticated
  USING (onboarding.is_staff());
CREATE POLICY "Staff insert first_visit_inspections"
  ON onboarding.first_visit_inspections FOR INSERT TO authenticated
  WITH CHECK (onboarding.is_staff());
CREATE POLICY "Staff update first_visit_inspections"
  ON onboarding.first_visit_inspections FOR UPDATE TO authenticated
  USING (onboarding.is_staff());
