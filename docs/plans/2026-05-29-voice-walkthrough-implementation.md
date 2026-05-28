# Voice Walkthrough — Implementation Plan

**Date:** 2026-05-29
**Input:** `docs/plans/2026-05-29-voice-walkthrough-design.md`
**Status:** Sequenced, ready to execute.

Reuse, do not duplicate: `first-visit-audio` bucket (migration 004), `POST /api/first-visit/answers`, the outbox sync engine, `questionsForScope` / `phasesForScope`, and the `media/upload-url` signed-URL pattern.

---

## Phase 1 — Schema & storage (S)

**Goal:** Persist walkthroughs (audio + transcript + extraction) as an audit row, independent of answers.

**Files (created):**
- `supabase/migrations/first_visit_006_walkthroughs.sql` — new table `onboarding.first_visit_walkthroughs` per design §3; RLS staff-only mirroring `first_visit_media`; index on `inspection_id`. Include `NOTIFY pgrst, 'reload schema';` reminder in header comment.

**Acceptance:**
- Table exists in Supabase (Studio paste); RLS policies match other FV tables; PostgREST sees the table.

**Depends on:** none. **Parallelisable with:** Phases 3, 5 (different surfaces).

---

## Phase 2 — Server routes (M)

**Goal:** Three POST routes, all auth-gated by `getHubRouteContext`.

**Files (created):**
- `src/app/api/first-visit/walkthrough/upload-url/route.ts` — thin wrapper that calls into the same signed-URL helper used by media; returns `{ walkthrough_id, storage_path, signed_url, token }`. Bucket hardcoded to `first-visit-audio`.
- `src/app/api/first-visit/walkthrough/transcribe/route.ts` — server-side OpenAI Whisper call (`whisper-1`); downloads audio via service-role from storage, posts to Whisper, persists `transcript`, `language`, `duration_s` on the row; returns the same.
- `src/app/api/first-visit/walkthrough/extract/route.ts` — loads phase questions via `phasesForScope(scope)` filtered to the requested `phase_id`; calls Claude Haiku 4.5 with the prompt in design §4 via Anthropic SDK structured output (tool-use); persists `extraction_result` JSONB on the row; returns `{ answers: [...] }`. Does NOT write to `first_visit_answers`.
- `src/lib/firstVisit/walkthroughExtract.ts` — pure-ish module exporting `buildExtractionPrompt(questions, transcript, language)` and `parseExtractionResponse(raw)` so we can unit-test prompt assembly and JSON parsing without hitting the API.

**Files (modified):**
- `.env.example` — add `OPENAI_API_KEY` (server-only). Anthropic key already present from scraper.

**Acceptance:**
- `curl` upload-url returns a signed URL; PUT to it succeeds.
- `transcribe` against a 10s sample webm returns plausible text and writes to the row.
- `extract` against a fixture transcript returns a `{ answers: [...] }` JSON matching design §4 schema, one entry per question slug.
- All three routes return 401 without hub session.

**Depends on:** Phase 1. **Parallelisable internally:** the three routes can be written by separate agents — they share only the auth helper.

**Risks / decision points:**
- OpenAI key sourcing: confirm we don't proxy through AI Gateway (design §2 row 2).
- Whisper download path: do we stream from storage to Whisper, or fetch into a buffer? **Decision:** buffer; 15-min cap × opus ≈ <30 MB.
- Anthropic structured output: use tool-use with JSON schema, not free-form parse, to avoid markdown-fenced responses.

---

## Phase 3 — Local capture + Dexie extension (M)

**Goal:** Record audio locally, store the blob in Dexie, queue the upload.

**Files (modified):**
- `src/lib/firstVisit/db.ts` — bump Dexie to `version(3)`; add a `walkthroughs` table `id, inspection_id, target_id, phase_id, area_key, blob, duration_s, status, transcript?, extraction_result?, created_at`. Extend `OutboxJob['kind']` with `walkthrough_upload`, `walkthrough_transcribe`, `walkthrough_extract`.

**Files (created):**
- `src/lib/firstVisit/walkthroughRecorder.ts` — wraps `MediaRecorder`, enforces 15-min hard cap, emits Stop event with `Blob` (webm/opus) + duration. Soft-cap 60 min/day counter persisted in `localStorage`.
- `src/components/firstVisit/WalkthroughRecorder.tsx` — Record / Stop UI, mm:ss timer, level meter, disabled-state on permission denied, privacy-modal gate.
- `src/components/firstVisit/PrivacyModal.tsx` — one-tap modal, "Don't show again this visit" stored on the `LocalInspection` row in Dexie (new optional field `walkthrough_privacy_ack_at`).

**Acceptance:**
- Recording works in iOS Safari 17 and Android Chrome (manual smoke).
- Hard cap auto-stops at 15:00.
- Blob lands in Dexie; outbox row enqueued.
- Privacy modal shows once per visit when toggled off.

**Depends on:** none structurally; can be built against mock server. **Parallelisable with:** Phase 2.

---

## Phase 4 — Outbox handlers + sync chaining (M)

**Goal:** Three-step pipeline runs offline-tolerant through existing outbox.

**Files (modified):**
- `src/lib/firstVisit/handlers.ts` — add three handlers:
  - `walkthrough_upload`: get signed URL → PUT blob → enqueue `walkthrough_transcribe`.
  - `walkthrough_transcribe`: POST transcribe → store transcript on Dexie row → enqueue `walkthrough_extract`.
  - `walkthrough_extract`: POST extract → store `extraction_result` on Dexie row → set `status = 'ready_for_review'`.
- `src/lib/firstVisit/sync.ts` — no structural change; relies on existing drain loop.

**Acceptance:**
- Going offline mid-record, then online, runs all three steps in order.
- Failures in step 2 or 3 retry without re-uploading audio.
- A unit test (Vitest) drains a stubbed outbox through all three handlers using mocked `fetch`.

**Depends on:** Phases 2 + 3.

---

## Phase 5 — Review UI (Accept / Edit / Decline) (M)

**Goal:** After extraction lands, each suggested answer appears as a "🤖 Suggested" / "🤖 Low confidence — review" badge inline with the question. Accept and Edit write through the existing answer path; Decline does nothing.

**Files (created):**
- `src/components/firstVisit/WalkthroughReviewPanel.tsx` — given a `walkthroughs` Dexie row, renders one row per question with `confidence` colour, `evidence_quote` tooltip, and Accept / Edit / Decline buttons. Edit opens the question's existing input. "Accept all high+medium" bulk button.
- `src/lib/firstVisit/walkthroughAccept.ts` — helper that takes one extracted answer and calls the existing `answer_upsert` enqueue path with `was_prefilled: true`, `hub_suggestion_snapshot: <extracted value>`, `was_accepted_as_is: <true|false>`.

**Files (modified):**
- The phase-page UI shell (existing first-visit form page; identify exact path at implementation time — likely `src/app/first-visit/[inspection_id]/...`) — mount `WalkthroughRecorder` button at phase top, render `WalkthroughReviewPanel` when a walkthrough exists for the current `(target_id, phase_id)`.

**Acceptance:**
- Accept writes one row to `first_visit_answers` with `was_prefilled=true, was_accepted_as_is=true`.
- Edit then Accept writes with `was_accepted_as_is=false` and the edited value, `hub_suggestion_snapshot` still the original extraction.
- Decline writes nothing and the badge disappears for that question.
- Re-recording the same phase replaces `extraction_result` on the same `first_visit_walkthroughs` row (per design §5).

**Depends on:** Phases 3 + 4. Can start UI shell against fixtures earlier in parallel with Phase 2.

---

## Phase 6 — Eval harness + Claude prompt iteration (L, risk-bearing)

**Goal:** 20 labelled walkthroughs, run extraction, measure field-level error rate. Trigger Sonnet fallback only if Haiku > 5 % per design §2 row 3.

**Files (created):**
- `scripts/eval-walkthrough-extraction.ts` — loads `evals/walkthroughs/*.json` (transcript + gold answers + phase_id + scope), runs `walkthroughExtract` against Haiku, diffs, emits a CSV with per-question correct / wrong / unknown.
- `evals/walkthroughs/README.md` — labelling instructions.
- `evals/walkthroughs/fixtures/*.json` — 20 hand-labelled transcripts (EN, DE, mixed; include the German technical vocab risk from design §6).

**Acceptance:**
- Eval script runs end-to-end against a real Anthropic key and prints aggregate accuracy.
- Decision recorded in `docs/DECISIONS.md`: Haiku vs Sonnet for V1.

**Depends on:** Phase 2 (`walkthroughExtract.ts` is reused). Can run in parallel with Phase 5.

**Human decision points:**
- Sign off on the 20 fixtures before measuring.
- If Haiku fails the bar, switch the model constant — no other code change.

---

## Phase 7 — Cost guardrails + telemetry (S)

**Files (created):**
- `src/lib/firstVisit/walkthroughCost.ts` — soft-cap 60-min/day/inspector tracker (localStorage + a server-side count via a lightweight `usage` view; server-side optional in V1).

**Files (modified):**
- The three server routes (Phase 2) — log `inspection_id`, `duration_s`, model, tokens to console (Vercel logs) for now. No new table.

**Acceptance:** Toast appears past 60 min/day for the same inspector in the same UA.

**Depends on:** Phase 3.

---

## Phase 8 — End-to-end smoke test + docs (S)

**Files (created):**
- `docs/voice-walkthrough.md` — operator runbook: how to trigger, how to re-run extraction, how to read the audit row.

**Files (modified):**
- `docs/DECISIONS.md` — append the model-choice decision from Phase 6.
- `CLAUDE.md` — add a "Voice walkthrough" warning block (OpenAI key is server-only; never `NEXT_PUBLIC_OPENAI_API_KEY`; mirrors Google Places lesson).

**Acceptance:** A second engineer follows the runbook and records → reviews → submits a phase without help.

---

## Parallelism map

- Sequential gates: **Phase 1 → Phase 2**, **Phases 2 + 3 → Phase 4**, **Phase 4 → Phase 5**.
- Fan-out opportunities:
  - Phases 2, 3, 6-fixtures can all start the moment Phase 1 lands.
  - The three routes inside Phase 2 are independent — three sub-agents OK.
  - Phase 6 eval harness runs alongside Phase 5 once Phase 2 is in.

## First-PR recommendation (smallest demoable slice)

**Phases 1 + 2 + a stub UI button** that records 10 seconds locally, uploads via the new `upload-url`, transcribes, extracts against the current phase, and **logs the JSON to console** — no Dexie persistence, no review UI, no outbox. This proves: schema, auth, Whisper, Claude prompt, end-to-end network path. ~1 day of work. Everything after is product, not architecture.

## Risks & decision points (human-required)

1. **Haiku quality on German technical vocab** (design §6). Resolved by Phase 6 eval; fallback to Sonnet 4.6 is a one-line model swap.
2. **Whisper hallucination on silence** — mitigate by client-side silence trim (defer to Phase 3+1 polish if it bites in testing).
3. **OpenAI key procurement** — confirm Arbio has an OpenAI account with billing before Phase 2 lands; otherwise Phase 2 blocks.
4. **Privacy modal wording** — design §2 row 5 wording is final unless Legal pushes back; flag for Joshua at Phase 3 review.
5. **Dexie migration** — bumping to v3 with a new table is non-destructive but should be tested on a device that has v2 data in it before merging Phase 3.

## Decisions pinned (2026-05-29)

- **Recorder button mount point:** at the top of each phase block inside `src/app/first-visit/[dealId]/[inspectionId]/UnitSurvey.tsx`, between the sticky section strip and the questions list. One button per visible phase, scoped to that phase's questions. Phase 5 work doesn't need to relocate.
- **`walkthrough_id` is client-generated.** Created with `crypto.randomUUID()` inside the Dexie `walkthroughs.put` call, identical to how `LocalMedia.id` is generated today. The `upload-url` route accepts it in the request body and echoes it back rather than minting its own. This keeps retry-safety symmetrical with the media outbox and lets the client own causality across `upload → transcribe → extract` without round-tripping the id.
- **Daily quota:** V1 ships localStorage soft-cap only (`fv_walkthrough_minutes_today` reset on date change). No server-side enforcement until Whisper cost shows up in usage logs (revisit at end of Phase 8).
