-- First Visit Survey — versioned, editable survey content for the in-app editor
-- Reference copy — APPLY IN THE HUB (Onboarding_tool) REPO, not here.
-- Run in Onboarding_tool's Supabase project (Studio SQL editor).
-- After applying: NOTIFY pgrst, 'reload schema';
--
-- Each publish creates a new row; inspections pin the version they started on.
-- Version numbering: the editable DRAFT lives at the reserved version 0; published
-- versions are numbered from 1 upward. The draft route upserts on the primary key
-- (template_key, version=0); the partial index below still guarantees one draft.

create table if not exists onboarding.first_visit_survey_versions (
  template_key text not null default 'first_visit',
  version      integer not null,
  status       text not null check (status in ('draft','published','archived')),
  content_json jsonb not null,
  created_by   text,
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  primary key (template_key, version)
);

-- At most one draft per template.
create unique index if not exists first_visit_survey_versions_one_draft
  on onboarding.first_visit_survey_versions (template_key)
  where status = 'draft';

-- Inspections pin the published version they began on, so a later publish never
-- mutates an in-flight walkthrough.
alter table onboarding.first_visit_inspections
  add column if not exists survey_version integer;
