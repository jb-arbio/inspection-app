# First Visit Survey — Design

**Date:** 2026-05-22
**Status:** Approved, awaiting implementation plan
**Source repo:** Fork of `iuliia-arbio/inspection-app` (Next.js + Supabase)
**Supabase topology:** Two clients. Inspection mode keeps the upstream's own Supabase project (anon access, untouched). First Visit reads/writes the Onboarding_tool's Supabase project (`onboarding` schema, authenticated sessions).

## Purpose

Add a parallel mode to the existing inspection app for **pre-takeover staff visits**. Staff visit a newly onboarded property, walk it area-by-area, and verify or correct the data the owner already submitted through the Onboarding_tool. Findings flow back into the onboarding hub as a new data source (`staff_first_visit`) so the hub's existing conflict-resolution UI surfaces divergence between sources.

The inspection mode is **not modified** in behavior or flow beyond the addition of a mode-selection landing page and a shared auth gate.

## Scope of this design

Build the **scaffolding only** — the empty shell, reusable primitives, sync engine, data model, and storage. No actual question content. The question list and data-point mapping will be supplied later and dropped into a config file.

## 1. Fork model

- Fork `iuliia-arbio/inspection-app` under the team's GitHub org.
- Add `upstream` remote for periodic `git pull upstream main`.
- All new code lives in dedicated directories so upstream merges stay conflict-free:
  - `src/app/first-visit/**` (routes)
  - `src/lib/firstVisit/**` (questions config, data layer, prompts, export)
  - `src/components/firstVisit/**` (primitives)
  - `supabase/migrations/first_visit_*.sql`
- Only one shared file is touched: the new root page (mode picker).

## 2. Entry & navigation

- `/` — two-card picker: **Inspection** | **First Visit**. (Current root content moves to `/inspect`.)
- `/first-visit` — landing page with **Start a new visit** + **My visits** list.
- `/first-visit/new` — deal picker (online required).
- `/first-visit/[dealId]` — unit picker.
- `/first-visit/[dealId]/[inspectionId]` — survey flow (works offline after first load).
- `/inspect/**` — existing inspection app routes, behavior unchanged.

## 3. Auth

- Google SSO via the **hub's** Supabase project, `arbio.com` email allow-list (per project memory `allowed_email_domain.md`). Any signed-in `@arbio.com` user satisfies the hub's `is_staff()` RLS function, so hub writes go through cleanly.
- One middleware file gates the entire app. Inspection mode flow is otherwise unchanged (its anon-access Supabase client continues to work after the login wall).
- Session token cached so offline sessions remain authenticated. Sign-in itself requires online.

## 4. Data model

All new First Visit tables live in the **hub's** Supabase project, `onboarding` schema. Inspection mode's tables (`ins_*`) stay in upstream's own Supabase project — untouched.

```sql
onboarding.first_visit_inspections (
  id uuid pk,
  deal_id uuid references onboarding.deals,
  location_id uuid references onboarding.locations,
  unit_category_id uuid references onboarding.unit_categories null,
  status text check (status in ('draft','submitted')),
  inspector_email text,
  started_at timestamptz,
  submitted_at timestamptz
)

onboarding.first_visit_answers (
  id uuid pk,
  inspection_id uuid references onboarding.first_visit_inspections,
  question_key text,
  area_key text,
  value jsonb,
  notes text,
  source_data_point_id uuid references onboarding.data_points null,
  hub_suggestion_snapshot jsonb,  -- prefill value shown at answer time (audit)
  was_prefilled boolean default false,
  was_accepted_as_is boolean default false,
  created_at timestamptz,
  updated_at timestamptz,
  synced_at timestamptz
)

onboarding.first_visit_media (
  id uuid pk,
  inspection_id uuid references onboarding.first_visit_inspections,
  answer_id uuid references onboarding.first_visit_answers null,
  area_key text,
  question_key text null,
  kind text check (kind in ('photo','video','audio')),
  storage_path text,
  content_hash text,
  size_bytes bigint,
  captured_at timestamptz,
  uploaded_at timestamptz,
  verified_at timestamptz
)
```

Storage buckets: `first-visit-photos`, `first-visit-videos`, `first-visit-audio`.

On submit, every answer with `source_data_point_id` upserts into `onboarding.data_point_values` with `source='staff_first_visit'` and calls `logValueSubmitted` (per project CLAUDE.md rule). The hub's existing conflict UI handles divergence between sources.

## 5. The `<PrefilledField>` primitive

The reusable input wrapper that powers every hub-bound question. Mirrors the Host FAQ UX.

- If the bound `data_point` has a value, the input renders **pre-filled** with that value and a "Pre-filled" badge.
- Two affordances:
  - **Accept** — one tap confirms, answer saved as-is, `was_accepted_as_is=true`.
  - **Edit** — clears the badge, staff types their own value, `was_accepted_as_is=false`.
- If no hub value exists, the input renders empty.
- Snapshots the hub value into `hub_suggestion_snapshot` at first answer for audit.
- Wraps `text`, `number`, `select`, `boolean` field types.
- Photos/videos/audio are separate from this primitive — they're additive evidence attached to answers.

## 6. Sync model — online-by-default with offline fallback

**Online (default)**
- Every answer or media write POSTs directly to a server route handler. UI shows inline "Saved" confirmation.
- No local-first round-trip; the network is the source of truth.

**Offline (detected by failed POST or `navigator.onLine === false`)**
- Writes spill into an IndexedDB outbox (Dexie.js).
- Persistent banner: "Offline — N changes pending sync."
- All UI continues to work; staff can complete the entire visit offline.

**Reconnect**
- Auto-drains outbox on `online` event, app focus, and a 30s polling interval while visible.
- Per-inspection ordering: answers before dependent media.
- Each job retried with exponential backoff.

**Manual sync**
- A **"Sync now"** button in the survey header, always visible, always callable. Drains the outbox on demand.

**iOS-safe choices**
- No Background Sync API (Safari unsupported).
- No File System Access API (Safari unsupported).
- `navigator.storage.persist()` requested on first run to make IndexedDB eviction-resistant.

**Deal snapshot for offline access**
- When a deal is first opened, its record + relevant `data_point_values` are snapshotted into IndexedDB. The pre-filled values in `<PrefilledField>` read from this snapshot when offline.

## 7. Data safety — three independent persistence paths

Re-sending staff is the actual cost driver, so media is over-engineered for durability.

1. **Local — IndexedDB blob** with `navigator.storage.persist()` eviction protection. The capture confirmation UI fires only after the local write resolves.
2. **Server — verified Supabase upload** on reconnect:
   - SHA-256 hash computed locally before upload.
   - Upload to bucket, then `HEAD` the path to confirm bytes + size match.
   - `verified_at` set only after byte-match check.
   - Local blob retained for **7 days post-verification** (configurable). UI shows "Local backup expires in N days."
3. **Manual — zip export** (see §8). Staff can save a full copy off-app at any time.

Quota guard: warn at < 200MB IndexedDB remaining, refuse new capture until outbox drains.

Answers (jsonb) are tiny — every revision retained forever in local DB with timestamps.

## 8. Export

Persistent **"Export"** button in the survey header throughout the visit, and prominently surfaced post-submit and on the past-visits list.

Generates a `.zip` containing:
- `answers.csv` — columns: `question_key, area_key, value, notes, was_prefilled, was_accepted_as_is, hub_suggestion_snapshot, captured_at`
- `/photos/{area}_{question}_{n}.jpg`
- `/videos/{area}_{question}_{n}.{ext}`
- `/audio/{area}_{question}_{n}.{ext}`
- `manifest.json` — inspection metadata, deal info, timestamps, inspector

Built client-side with JSZip from the IndexedDB store (works offline). Triggers a native browser download — staff can save to Files/Photos manually for high-stakes visits.

## 9. Video capture

- `useVideoRecorder` hook mirroring the existing `useVoiceRecorder`.
- Primary: `MediaRecorder` with `video/mp4` on Safari, `video/webm; codecs=vp9,opus` on Chromium.
- Fallback: `<input type="file" accept="video/*" capture="environment">` when `MediaRecorder` is unsupported or fails to start.
- Captured blob → IndexedDB → outbox.

## 10. Submit flow

- Marks inspection `submitted` (local + server once synced).
- For each answered question with `source_data_point_id`: upsert `data_point_values` with `source='staff_first_visit'`, emit `logValueSubmitted`.
- Idempotent. Survives an offline submit (queued in outbox, drains on reconnect).
- **No Notion report. No report generation of any kind.** (Deliberately dropped from upstream's design.)

## 11. Past visits

`/first-visit` landing page shows:
- **Start a new visit** — primary CTA → deal picker.
- **My visits** — list of inspections by the signed-in inspector. Columns: deal name, date, status (draft / submitted / sync-pending), pending-changes count.
- Tap a draft → resume editing.
- Tap a submitted → read-only view with Export button.
- No reopen-submitted action in v1.

## 12. Explicit non-goals

- Notion reports (dropped from upstream).
- Real question definitions and data-point mapping (deferred — supplied later by product).
- Multi-inspector concurrent editing.
- Reopening submitted inspections.
- File System Access API (iOS unsupported).
- Background Sync API (iOS unsupported).
- Modifications to inspection mode beyond the shared auth gate and the new root page.

## 13. Testing

- **Unit:** `<PrefilledField>` accept/edit behavior; outbox ordering and retry; media hash verification; CSV/zip export structure.
- **Integration:** full offline survey → reconnect → assert `first_visit_*` rows, `data_point_values` rows with `source='staff_first_visit'`, `activity_log` `value_submitted` entries, verified media uploads.
- **Manual:** airplane-mode walkthrough on iOS Safari and Chrome Android before merge. High-stakes-visit dress rehearsal with one real property.

## 14. Design style

**Match the existing inspection-app.**

- Typography: DM Sans (already loaded in `src/app/layout.tsx`).
- Styling: Tailwind CSS + PostCSS as configured upstream. No shadcn/ui install in this fork — keep dependency surface minimal and avoid drift from upstream.
- Layout: mobile-first, light theme.
- Component patterns: follow the conventions used in `UnitSelectionClient.tsx` and `InspectionFlowClient.tsx` for cards, buttons, and form inputs. Build First Visit components in the same idiom so the two modes feel like siblings in one app.
- No Arbio-brand restyling of inspection mode — that would violate the "don't touch inspection" constraint.

## 15. Users & workflow

**Primary user.** Arbio operations staff conducting a **pre-takeover property visit** — the first physical visit to a newly onboarded property before it goes live.

**Context.** Mobile-first, on-site, frequently in basements, stairwells, and freshly-built units with unreliable connectivity. Inspections take 30–90 minutes; staff carry the device through every room.

**Operational flow.**
1. **Prepare** — staff opens the app, picks a deal from the onboarding hub (online step).
2. **Open the unit** — selects the location + unit category; the app snapshots the deal's existing answers locally so the rest works offline.
3. **Walk the property area-by-area** — for each question, the field is either empty (no hub data) or pre-filled with the owner's value:
   - If pre-filled and correct → **Accept**.
   - If pre-filled and wrong → **Edit** and enter the real measurement.
   - If empty → fill in.
4. **Capture evidence** — photos, videos, audio attached to questions or areas.
5. **Submit** — closes the visit. Findings flow to `data_point_values` as a `staff_first_visit` source.
6. **Review in the hub** — back in the office, ops sees the divergence in the onboarding hub's existing conflict UI and decides what becomes the canonical value.

## 16. Deferred question content & config contract

Question definitions and data-point mappings are **out of scope** for this scaffolding phase. Product owns the list and the mapping; engineering owns the rendering, sync, storage, and export primitives.

**Future config shape** (lives in `src/lib/firstVisit/questions.ts`):

```ts
type FirstVisitQuestion = {
  question_key: string;            // stable identifier
  area_key: string;                // groups questions by physical area (e.g. 'kitchen', 'entry')
  label: string;                   // user-facing label
  field_type: 'text' | 'number' | 'select' | 'boolean';
  choices?: { value: string; label: string }[];
  validation?: { min?: number; max?: number; pattern?: string; required?: boolean };
  source_data_point_id?: string;   // if set, enables Pre-filled / Accept / Edit behavior
  evidence?: {
    photo?: 'required' | 'optional';
    video?: 'required' | 'optional';
    audio?: 'optional';
  };
  order: number;                   // ordering within area_key
  group?: string;                  // optional sub-group within area
};
```

**"Scaffolding complete" means** — a small dev/sample config (3–5 questions covering all four field types) proves end-to-end:
- All supported field types render correctly.
- `<PrefilledField>` Accept/Edit behavior works against a real `data_point_values` row.
- Offline save → reconnect → sync round-trips correctly.
- Photo, video, and audio capture each attach to an answer and upload with verification.
- Submit writes back to `data_point_values` with `source='staff_first_visit'`.
- Export produces a valid `.zip` containing CSV + media + manifest.

Once these are green, swapping in the real question list is a config-only change.

## 17. Visit lifecycle & ownership

**Starting a visit.** Self-service in v1 — any signed-in staff member picks a deal + unit and starts a visit. No manager assignment, no scheduling. (Manager-assigned visits deferred to a later phase.)

**"My visits" scope.** The landing page shows inspections **created by the signed-in inspector only**. No org-wide visibility in v1.

**Status states.**
- **Draft** — in progress, resumable from the landing page.
- **Submitted** — closed, read-only, exportable.
- **Sync-pending** — has unsynced local changes. Visible to the inspector who owns the visit.

**Edge cases.**
- **Wrong deal/unit picked before submit** → inspector deletes the draft from the landing page (soft-delete; local data purged, server row marked `discarded`).
- **Duplicate drafts for the same deal/unit** → allowed but flagged in the list ("2 drafts for this unit"); inspector picks which to continue.
- **Submitted visits** → no edit/reopen in v1.
- **Sync-pending visits** → the owning inspector monitors and is responsible for getting back online. Ops can see sync state in the hub for any inspection (read-only view), but cannot trigger sync on behalf of a staff member.

**v1 correction path for mistakes in submitted visits** — two choices, depending on ops process:
1. **Start a new visit** for the same unit; both visits show as separate `staff_first_visit` sources in the hub's conflict UI (newer wins by default).
2. **Correct directly in the hub** by editing the `data_point_values` row through the existing hub admin UI.

Multi-inspector collaboration on the same visit and reopening submitted visits remain explicit non-goals.

## 18. Failure & recovery UX

Goal: staff always know exactly where their data lives. Three states surfaced consistently:

| State | Indicator | Behavior |
|---|---|---|
| Saved locally only | Yellow dot, "Saved offline" | Data in IndexedDB, queued in outbox. App fully usable. |
| Synced to server | Green dot, "Saved" | Confirmed write to Supabase. |
| Pending (in flight) | Spinner | POST in progress. |

**Scenarios and behaviors:**

- **Offline detected** — banner: "Offline — N changes pending sync." All UI continues working. New writes go to outbox.
- **Failed answer save** — retried automatically with backoff. After 3 failures: per-answer error icon, tap to retry manually. The answer remains in local storage indefinitely.
- **Failed media upload** — local blob retained (does not count against the 7-day retention window until verified). Per-media error icon. Tap to retry.
- **Failed sync (auth lapsed, server error)** — banner: "Sync paused — re-sign in" or "Sync paused — server error." Manual **Sync now** retry always available.
- **Low storage (<200MB free)** — warning toast, new captures blocked until outbox drains. "Sync now" button surfaces prominently.
- **App or browser closed mid-visit** — on next open, draft resumes from the landing page with all local data intact. Sync drains automatically.
- **Logout with pending changes** — confirmation dialog: "You have N unsynced changes. Sync before logging out?" Default action: **Sync first**.
- **Submitted but not synced** — landing page shows "Submitted — sync pending" with a warning color. Inspector should stay online until it flips to "Submitted ✓ Synced".
- **Export as last resort** — the **Export** button is always available whenever local data exists for an inspection, including for failed/stuck submissions. This is the manual escape hatch — staff can always produce a zip and hand it to ops.

## 19. Analytics & instrumentation

Lightweight events fired client-side, posted to the same analytics pipe used by the onboarding tool (or a deferred no-op if pipeline not yet configured).

**Events:**

| Event | When |
|---|---|
| `first_visit_started` | Inspector clicks "Start a new visit" |
| `deal_selected` | Deal chosen from picker |
| `unit_selected` | Location/unit category chosen |
| `question_prefill_accepted` | `<PrefilledField>` Accept tapped |
| `question_prefill_edited` | `<PrefilledField>` Edit tapped (value changed away from hub value) |
| `answer_saved` | Any answer write succeeds (local or server) |
| `media_captured` | Photo/video/audio capture completed |
| `offline_entered` | `navigator.onLine` flips to false, or POST fails |
| `online_returned` | `navigator.onLine` flips to true |
| `sync_started` | Outbox drain begins |
| `sync_completed` | Outbox empty |
| `sync_failed` | Job exhausted retries |
| `submit_clicked` | Inspector taps Submit |
| `submit_synced` | Submission confirmed server-side |
| `export_generated` | Zip download triggered |

**Common event properties:**
- `inspection_id`, `deal_id`, `location_id`, `unit_category_id`
- `inspector_email`
- `question_key`, `area_key` (where applicable)
- `media_kind` (`photo` / `video` / `audio`, where applicable)
- `pending_change_count` (outbox size at event time)
- `connection_state` (`online` / `offline`)
- `error_code` (where applicable)

Events are non-blocking — analytics failures never affect inspection flow.

## 20. Technical clarifications & dependencies

Verified against the live Onboarding_tool schema (`supabase/migrations/007_data_points.sql`, `008_create_hub_tables.sql`, `036_rls_staff_only.sql`) and `src/lib/data-room/activity-log.ts`. These resolve ambiguities flagged during design review.

### 20.1 Two Supabase clients

The fork ships two clients, configured side-by-side:

```ts
// src/lib/supabase.ts — UNCHANGED upstream client (inspection mode)
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

// src/lib/firstVisit/hubSupabase.ts — NEW, hub-pointing client
//   NEXT_PUBLIC_HUB_SUPABASE_URL
//   NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY
```

The hub client uses the user's authenticated session (Google SSO). All First Visit reads/writes go through it. Inspection mode never touches the hub client.

### 20.2 `data_point_values.source` is free-text

The column is `TEXT NOT NULL` with `UNIQUE (data_point_id, scope_id, source)`. No CHECK constraint, no enum migration needed. Writes set `source='staff_first_visit'` directly.

### 20.3 Reference data points by slug, not UUID

`onboarding.data_points` has `slug TEXT NOT NULL UNIQUE`. The question config carries `data_point_slug: string`; the server resolves it to `data_point_id` at write time. UUIDs are not portable across environments — never hardcode them.

Updated config shape:
```ts
type FirstVisitQuestion = {
  question_key: string;
  area_key: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'boolean';
  choices?: { value: string; label: string }[];
  validation?: { min?: number; max?: number; pattern?: string; required?: boolean };
  data_point_slug?: string;  // CHANGED: slug, not UUID
  evidence?: { photo?: 'required' | 'optional'; video?: 'required' | 'optional'; audio?: 'optional' };
  order: number;
  group?: string;
};
```

### 20.4 Polymorphic scope resolution

`data_point_values.scope_id` is a bare UUID — its meaning depends on `data_points.level` (enum: `deal | property | owner | unit | listing | reservation`).

At write time, look up the data point's level and pick the right scope_id from the inspection's context:

| `data_points.level` | scope_id source |
|---|---|
| `deal` | `inspection.deal_id` |
| `property` / `unit` / `listing` | `inspection.unit_category_id` |
| `owner` | TBD — confirm with product if owner-level questions appear in the first-visit list |

The fork stores all three (`deal_id`, `location_id`, `unit_category_id`) on the inspection row so scope resolution is local. Inspection covers all three levels — deal-wide answers, location-wide answers, and unit-specific answers all write back to their correct scope.

### 20.5 `logValueSubmitted` helper copied into the fork

The original lives at `Onboarding_tool/src/lib/data-room/activity-log.ts` (25 lines, never throws). Copy verbatim into `src/lib/firstVisit/activityLog.ts`. Signature:

```ts
logValueSubmitted(hubSupabase, {
  data_point_id: string;     // resolved from slug
  scope_id: string;          // resolved per §20.4
  source: 'staff_first_visit';
  value: unknown;
  actor_name: string;        // inspector email
}): Promise<void>
```

Call once per `data_point_values` upsert on submit. Failures log, do not block the inspection.

### 20.6 Storage — signed upload URLs, private buckets

The three buckets (`first-visit-photos`, `first-visit-videos`, `first-visit-audio`) are **private**. Uploads use signed PUT URLs minted by a server route:

```
POST /api/first-visit/media/upload-url
  body: { inspection_id, kind, content_hash, size_bytes }
  returns: { storage_path, signed_url, expires_at }
```

Client PUTs the blob directly to `signed_url`, then `POST /api/first-visit/media` to record the metadata row. Verified-upload check (§7) runs server-side after the metadata POST.

### 20.7 PWA library

Use **`next-pwa`** for service worker, manifest, and install prompt. Most battle-tested option for Next.js App Router. Config lives in `next.config.ts`; precaches `/first-visit/**` shell.

### 20.8 Migration workflow reminder

Per project memory `migration_workflow.md`: repo migrations are **not auto-applied** to live Supabase. Each new SQL file must be pasted into Supabase Studio's SQL Editor manually, then `NOTIFY pgrst, 'reload schema'` to refresh PostgREST.

### 20.9 Implicit dependencies (to add in `package.json`)

- `dexie` — IndexedDB wrapper for local store + outbox
- `jszip` — client-side zip generation for export
- `next-pwa` — service worker / PWA
- `@supabase/supabase-js` — already present upstream; reused for the hub client

### 20.10 Inspector identity offline

`inspector_email` is read from the cached Supabase session at inspection creation. Sign-in is required before starting a visit, so this is always known. Cached session survives offline.

### 20.11 Multi-device same-inspector

Same inspector opening the same draft on two devices is allowed in v1. Last-write-wins on the server per outbox drain. No locking, no merge. Documented but not engineered around.

## 21. Open items for the implementation phase

- Question list + data-point mapping config (supplied by product).
- Decision on whether the inspection app's existing root content moves to `/inspect` or stays at `/` behind a feature flag during transition.
- Confirm `NEXT_PUBLIC_HUB_SUPABASE_URL` + `NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY` env vars in Vercel for the forked deployment.
- Confirm which analytics pipeline §19 events post to (or whether they're no-op until pipeline exists).
- Confirm owner-level data point handling (§20.4) — likely no first-visit questions land here, but worth verifying with product.

## References

- Onboarding_tool CLAUDE.md (root)
- Onboarding_tool memory: `conflict_resolution_model.md`, `allowed_email_domain.md`, `google_places_env_trap.md`
- Inspection app README: https://github.com/iuliia-arbio/inspection-app
