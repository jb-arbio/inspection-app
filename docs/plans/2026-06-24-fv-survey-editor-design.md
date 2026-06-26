# First-Visit Survey In-App Editor — Design

> Status: approved design (2026-06-24). Next step: implementation plan via the writing-plans skill.

## Goal

Let a non-technical editor (PM/GX) iterate the **existing first-visit survey** — wording,
descriptions, options, required, order, and adding/removing questions — directly in the app,
publish safely, and have changes reach inspectors without breaking inspections already in
progress or the offline experience.

This is **iteration of one survey**, not a multi-template form-builder. Multiple template
types are explicitly out of scope for v1 (see Deferred).

## Non-goals (deliberately deferred — YAGNI)

- Multiple template types / "build a new survey from scratch."
- Self-serve editing of **conditional branches** (`visible_when`) — stays engineer-owned in
  v1; a guided branch editor is a possible fast-follow.
- Self-serve **PMS mapping** — wiring a new field to a PMS target stays a dev + hub task.
- Adopting an off-the-shelf form-builder library (SurveyJS / Form.io / JSONForms). Rejected:
  they own the *renderer*, and this app's value is its custom renderer (offline Dexie sync,
  repeater groups, anchored media, voice-fill, hub prefill/Accept, scope, PMS mapping,
  progress ring). Adopting their runtime is a rewrite; using only their builder means an
  adapter to a foreign schema — both more work than a plain CRUD editor over our own schema.

## Architecture: three layers

1. **Editable content** — versioned, stored in Supabase. The safe, non-technical attributes:
   `slug, label, description, type, scope, phase, options, required, multi_select,
   allow_custom_options, order`.
2. **Code overlay** (`src/lib/firstVisit/questionStructure.ts`) — reviewed, engineer-owned.
   The risky/structural attributes keyed by slug: `visible_when` (branching), repeater group
   membership (`group_id`), `follow_up` / `per_option_follow_up`, `anchor_to`, `pms_target`,
   `mode`. Merged onto the content at load.
3. **Validator** (shared `zod` schema + `validateSurveyConfig`) — gates every editor save and
   every publish; also runs as a test.

Runtime composition: `published content (active/pinned version) + code overlay (by slug)
→ validate → PHASES / ALL_QUESTIONS`.

## Phase 0 — Foundation refactor (do first, zero behavior change)

The current `questions.ts` (591 lines) mutates an XLSX-derived JSON through an imperative
transform chain (`DROPPED_SLUGS`, `DROP_PROPOSED_DUP_SLUGS`, `injectFindings`,
`injectBucket2Questions`, `BUCKET2_OVERRIDES`, description/verify strippers, dedupe). Those
transforms exist only because the source didn't match the real survey.

Steps:
1. Snapshot today's post-transform `ALL_QUESTIONS` as a fixture.
2. Bake the current result into a clean **content config** (safe fields) + extract the
   structural bits into `questionStructure.ts` (the overlay).
3. Replace the transform chain with **load content → apply overlay → validate → export**.
4. **Parity test**: new `ALL_QUESTIONS` deep-equals the snapshot. No behavioral change ships
   until this is green.
5. The clean content config doubles as the **offline seed** and **published version 1**.

## The runtime-config ripple (the real cost driver)

Today `ALL_QUESTIONS` / `PHASES` are static module-level constants imported across the
renderer, `progress.ts`, and the voice-fill `extractionSchema.ts`. Making config versioned +
runtime-loaded means they can no longer be module constants — they become per-inspection
(depends on the pinned version). Mitigation:

- **Pure helpers take questions as input** — `progress`, `extractionSchema`, scope/anchor
  helpers accept the active question set instead of importing the constant.
- **A `SurveyConfigProvider` React context** loads the active/pinned version and supplies it
  to components; components read from context.
- The bundled seed remains importable for the offline fallback and for tests.

This consumer refactor — not the editor screens — is the largest chunk of work.

## Data model (Supabase)

- `survey_versions(template_key, version, status['draft'|'published'|'archived'],
  content_json, created_by, published_at, created_at)`.
  - One live `draft` row per template; N `published` versions.
- Each **inspection pins** the published `version` it started on (column on the inspection
  record, mirrored in Dexie). A new publish never alters an inspection already underway.

## Loading & offline

- On load (online): fetch the active (or the inspection's pinned) version → cache in Dexie
  (`localDb.config` keyed by `template_key + version`).
- Offline with no cache → fall back to the **bundled seed JSON**. Inspectors are never blocked.

## Editor UI

- **Entry point:** an **admin-only "Edit survey" button** on the first-visit survey screen
  (header/landing). Clicking opens the editor.
- **Route:** dedicated page (e.g. `/first-visit/edit`), auth-gated to an admin role. Loads or
  clones the current draft.
- **Editing surface:** a validated **table/list grouped by phase** (not a drag-drop builder).
  Per question: dropdowns for `type` / `scope` / `phase`, an options chip editor,
  `required` / `multi_select` / `allow_custom_options` toggles, reorder (order field), add,
  remove/hide.
- **Engineer-owned fields** (branch, `pms_target`, repeater group) render as **read-only
  badges** — visible for context, not editable.
- **Edit-time validation** via the shared `zod` schema (with `react-hook-form`): a broken
  question cannot be saved.
- **Publish:** validates the whole config including overlay compatibility (every overlay slug
  still exists; no branch controller orphaned; every repeater member has a group) → creates a
  new published version.
- **Libraries:** `zod` + `react-hook-form` only (form plumbing/validation). No form-builder
  dependency. Reuse existing UI primitives (chips, dropdowns).

## Validation rules (shared editor + publish + CI test)

Fail on: duplicate slug; select/multi_select with empty options; unknown `type` / `scope` /
`phase`; overlay entry referencing a missing slug; branch controller slug missing; repeater
member without a group definition; malformed slug.

## Free wins

Voice-fill extraction and progress derive from the question set. Once they take the active
config (via the parameterization above), they **stay correct automatically** when an editor
changes options or adds/removes a field.

## Testing

- Parity test (Phase 0): new `ALL_QUESTIONS` == pre-refactor snapshot.
- Validator unit tests (each failure rule).
- Version-pinning test: publishing a new version does not change an in-flight inspection's
  resolved config.
- Offline fallback test: no cache → bundled seed used.
- Editor zod schema test: invalid question rejected; valid accepted.
- Existing suite + build stay green.

## Rough sizing

- Phase 0 refactor: ~2 days.
- Runtime-config ripple (parameterize helpers + context): ~2–3 days.
- Supabase versioning + offline cache + version pinning: ~2 days.
- Editor UI (entry button, page, table editor, validation, publish): ~3–5 days.
- **~1.5–2 weeks for a solid v1.**

## Sequencing

Phase 0 (refactor + parity) → runtime-config ripple → Supabase versioning/offline →
editor UI + entry point. Each phase is independently shippable and test-gated.
