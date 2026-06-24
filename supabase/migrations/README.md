# Inspector-App Migrations — DEPRECATED

⚠ **These files are reference-only as of 2026-06-01.**

The first-visit-inspector tables live in the **hub project**, not in inspection-app-fork's own DB. The hub project is owned by the `Onboarding_tool` repo, which is the **source of truth** for these table definitions.

## Where the migrations actually live now

```
Onboarding_tool/supabase/migrations/053_first_visit_inspector_tables.sql
```

That file consolidates everything from this directory (001 inspections, 002 answers, 003 media, 005 answer_scope) plus the 2026-06-01 `step_index` column for the block-repeater refactor. It is idempotent.

> **Pending:** `first_visit_006_survey_versions` (versioned survey content + `survey_version` pin on inspections) must be applied in the hub repo (`Onboarding_tool`) before the in-app survey editor ships.

Auto-apply via `Onboarding_tool/.github/workflows/db-migrate.yml` (GitHub Actions, runs on push to `main`).

## What to do if you need to change the schema

Open a PR against `Onboarding_tool` — **not here.** Adding migrations in this directory will not apply them to the live hub.

## Why these files still exist

Historical reference + grep targets. They document the per-step evolution of the schema. Don't expect them to match the live DB exactly any more — the consolidated `053_*.sql` in the hub repo is authoritative.
