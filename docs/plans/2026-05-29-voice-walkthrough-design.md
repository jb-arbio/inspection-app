# Voice Walkthrough — Design Doc

**Date:** 2026-05-29
**Status:** Draft, approval-only. No code yet.
**Owner:** First Visit Survey app

## 1. Problem & Shape

Inspectors walking ~10–30 questions per phase can't type fast on a phone. Naive STT dumps free text into one field. Solution: a **per-phase voice walkthrough** that records once, transcribes, and uses an LLM to extract structured answers, one per question, each one shown as a "🤖 Suggested" badge with Accept / Edit / Decline. The flow is defined in the brief and is **not** being redesigned here — this doc only resolves the open decisions.

## 2. Decisions (defaults — pick a row, move on)

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | Audio capture | **Local `MediaRecorder` → webm/opus, upload after Stop.** No streaming. | Streaming buys nothing for a 5–15 min batch flow and triples complexity. webm/opus is iOS Safari 17+ and Android Chrome compatible. |
| 2 | Transcription provider | **OpenAI Whisper API direct** (`whisper-1`), server-side from a Next route. Not via AI Gateway. | Gateway adds latency + a second key without giving us routing/failover value for a single-provider audio call. Anthropic has no first-party audio endpoint. |
| 3 | Structuring LLM | **Claude Haiku 4.5** as default. Sonnet 4.6 fallback only if Haiku eval shows >5% field-level error rate against a labelled set of 20 walkthroughs. | Extraction is a constrained JSON task with a tight schema — Haiku is plenty. Sonnet would 5–10× cost for marginal gain. |
| 4 | Languages | **Whisper auto-detect.** No per-visit setting. | Whisper handles DE↔EN code-switching natively; inspectors will mix mid-sentence ("Smoke detector ist da"). Forcing a language hurts more than it helps. We pass detected `language` to Claude so it knows which option labels to match (DE/EN dictionaries already in the question config where needed). |
| 5 | Owner privacy disclosure | **Yes, one-tap modal before record starts** with a "Don't show again this visit" toggle. Wording: *"This walkthrough will be recorded for accuracy. Audio is stored privately for Arbio internal use only and never shared with guests or third parties. Please let the owner know before you begin."* | Berlin / DSGVO. Owner consent is the inspector's job; we just surface it. We do **not** record consent itself — putting that burden on the app is scope creep. |
| 6 | Confidence threshold | **Claude returns `confidence: 'high' \| 'medium' \| 'low' \| 'unknown'` per answer.** UI: `high` + `medium` → "🤖 Suggested" with Accept. `low` → "🤖 Low confidence — review" (same UI, different colour, no auto-accept-all). `unknown` → "Not mentioned — answer manually." | One field, four buckets, no thresholds to tune. The model self-reports — calibration is cheap to eyeball in eval and re-prompt if drifty. |
| 7 | Offline | **Record offline OK** (MediaRecorder is local). Audio blob queues through the existing **outbox** pattern that already handles `first_visit_media`. Transcription + extraction are server-side and fire **when the audio POST lands**, not on the client. UI shows "Queued — will process when online." | Reuses the answer/media outbox we already have. No new offline machinery. |
| 8 | Cost ceiling | **Hard cap 15 min per walkthrough** (UI stops recording, shows Stop & Process). **Soft cap 60 min/day per inspector** (toast warning, still allowed). | At Whisper $0.006/min + Haiku tokens, a 15-min walkthrough is ~$0.12. 60 min/day/inspector = ~$0.50 — well under any sane budget. The hard cap protects against a forgotten Record button in someone's pocket. |
| 9 | Architecture | See §3. | Three new routes, all under `src/app/api/first-visit/walkthrough/`. Writes funnel into the existing `POST /api/first-visit/answers` path — voice never gets a separate write surface. |
| 10 | Prompt design | See §4. | — |

## 3. Architecture

New routes, all auth-gated by `getHubRouteContext` like the existing media routes:

```
src/app/api/first-visit/walkthrough/
  upload-url/route.ts    POST → signed upload URL for first-visit-audio bucket
                                (reuses media/upload-url logic with kind='audio')
  transcribe/route.ts    POST { walkthrough_id, storage_path, language? }
                                → calls Whisper, returns { transcript, language, duration_s }
                                → persists transcript on first_visit_walkthroughs row
  extract/route.ts       POST { walkthrough_id, phase_id, transcript, language, target_id }
                                → loads phase questions via phasesForScope/questionsForScope
                                → calls Claude Haiku 4.5 with prompt in §4
                                → returns { answers: [{ question_key, value, confidence, evidence_quote }] }
                                → does NOT write — client decides Accept/Edit/Decline,
                                  then POSTs each to existing /api/first-visit/answers
                                  with hub_suggestion_snapshot=<extracted value>,
                                  was_prefilled=true, was_accepted_as_is per user action.
```

**New table** `first_visit_walkthroughs` (one row per recording):

```
id uuid pk, inspection_id, target_id, phase_id, area_key,
storage_path, duration_s, language,
transcript text, extraction_result jsonb,
created_by, created_at, processed_at
```

Audit trail. Lets us re-run extraction with a new prompt without losing audio.

**Reused surfaces (do not duplicate):**
- `first-visit-audio` storage bucket (already provisioned, migration `first_visit_004_storage.md`).
- Outbox/sync layer for offline queueing.
- `POST /api/first-visit/answers` for all final writes.

**Telemetry hook:** `extraction_result` includes per-question `confidence`; we can later compute Accept-as-is rate by confidence band to validate the threshold rule in §6.

## 4. Claude Extraction Prompt (draft)

**Model:** `claude-haiku-4-5-20251015` (latest at writing).
**Inputs to the API call:**
- `transcript` (string)
- `language` ("en" | "de" | other from Whisper)
- `questions`: array of `FirstVisitQuestion` objects (slug, label, description, type, options, repeater) — only the current phase, only the current scope.

**System prompt:**

> You are an inspection-data extractor for short-term-rental property visits. The inspector spoke a free-form walkthrough covering some or all of a list of questions. Extract a structured answer per question.
>
> Rules:
> 1. Return exactly one entry per input question, keyed by `slug`.
> 2. Respect `type` and `options`:
>    - `boolean` → `true` / `false`
>    - `select` → one of `options` exactly (case-insensitive match; if the inspector said it in German/English mixed, map to the canonical option string)
>    - `number` → numeric
>    - `date` → ISO `YYYY-MM-DD`
>    - `text` → concise factual phrase, max 20 words, in the same language the inspector used
>    - `repeater` → array of objects, one per item mentioned
> 3. Set `confidence`:
>    - `high` — the inspector clearly and unambiguously answered this exact question.
>    - `medium` — the inspector gave an answer but it required minor interpretation (synonym, partial phrasing).
>    - `low` — the inspector said something related but the mapping to this question is uncertain.
>    - `unknown` — the inspector did not address this question, or explicitly skipped it.
> 4. Never guess. Silence = `unknown`. "Skipping that" = `unknown`.
> 5. `evidence_quote` is the shortest verbatim transcript span that supports the answer (≤ 15 words). For `unknown`, set `null`.
> 6. Do not invent options that aren't in the question's `options` list. If the inspector said something close but not exact, prefer `confidence: low` over a forced match.
>
> Transcript language: `{language}`.

**User message:**

```
Questions:
<JSON array of {slug, label, description, type, options, repeater}>

Transcript:
"""
<transcript>
"""

Respond with JSON only, no prose.
```

**Output JSON schema** (enforced via Claude tool-use / structured output):

```json
{
  "answers": [
    {
      "slug": "fv_unit_walls_condition",
      "value": "Good",                 // typed per question.type, or null if unknown
      "confidence": "high",            // 'high'|'medium'|'low'|'unknown'
      "evidence_quote": "walls clean, no cracks"  // string|null
    }
  ]
}
```

The client maps `slug → question_key` (they're the same in the current config) and POSTs accepted/edited entries to `/api/first-visit/answers` with `was_prefilled: true`, `hub_suggestion_snapshot: <original extracted value>`, and `was_accepted_as_is: <true if Accept untouched, false if Edit>`. Declined = no write.

## 5. Out of Scope (V1)

- No real-time / streaming transcription UI. Transcript appears after Stop.
- No multi-recording-per-phase merge. One walkthrough per phase per session; re-recording replaces the prior `extraction_result` on the same `first_visit_walkthroughs` row.
- No speaker diarisation. Whisper output is single-track.
- No on-device transcription fallback. Offline = queued, not local-transcribed.
- No automatic re-run of extraction when the question config changes. We keep the transcript; manual re-run only.

## 6. Risks & Open Eval Items

- **Haiku quality on German technical vocabulary** ("Rauchmelder", "Wasserschaden") — run a 20-walkthrough eval before merging.
- **Whisper hallucination on silence** — known issue; mitigate by trimming silence client-side before upload, and by Claude defaulting to `unknown` when evidence is thin.
- **Battery / heat on long recordings** — 15-min cap is partly a thermal guard for mid-summer Berlin walk-throughs in hot apartments.

— end —
