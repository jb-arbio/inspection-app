# Per-Field Voice Dictation — Design Doc

**Date:** 2026-06-06
**Status:** Approved. Implementation plan next.
**Owner:** First Visit Survey app

## 1. Problem & Shape

Inspectors walking a property can't type fast on a phone. They need to **dictate into individual free-text fields and notes** and get clean, ready-to-edit text inserted in place — without ever leaving the survey.

This is deliberately **narrower** than the `2026-05-29-voice-walkthrough-design.md` doc (a per-phase "record once → Whisper → Claude extracts every answer" batch flow, never built). That batch design stays out of scope. This is per-field, on-demand dictation: tap 🎙️ in a field, speak a sentence or two, get cleaned text in that field.

## 2. Decisions (locked)

| # | Question | Decision | Why |
|---|----------|----------|-----|
| 1 | Output style | **Cleaned transcript** — Whisper, then a cheap LLM pass that only fixes punctuation, removes filler, corrects obvious transcription errors. **No summarizing.** | Detail is the point of inspection notes (summary loses "third drawer handle is loose"); raw STT reads sloppy in a report. Cleanup is the sweet spot. |
| 2 | Capture engine | **In-page `getUserMedia` + `MediaRecorder`** (webm/opus). Not Web Speech API, not a native `capture` file input. | User stays in the app. Web Speech API is unreliable on iPhone, ships audio to Apple/Google anyway, and can't be controlled. A `capture` input yanks the user out to the OS voice-memo app. |
| 3 | Transcription provider | **OpenAI Whisper (`whisper-1`)**, server-side. | Already wired and keyed in the legacy `inspections` recordings route. Zero new setup. |
| 4 | Cleanup provider | **OpenAI `gpt-4o-mini`**, same key. | Trivial tidy task. No reason to add a second AI provider (Anthropic) + a new secret. Reuse what's wired. |
| 5 | Insert behaviour | **Append at cursor, fully editable, dictations stack.** Never overwrite. | Lets the inspector dictate, hand-tweak, dictate again. Replace-each-time would nuke prior text. |
| 6 | Audio retention | **Discard immediately after transcription.** Persist nothing but the resulting answer text. | DSGVO: no stored recording = nothing to govern/secure/delete. Nothing to re-extract later (unlike the batch design), so keeping it is pure liability. |
| 7 | Offline | **Online-only, graceful.** No signal → 🎙️ disabled with hint "Voice needs a connection — type for now." Typed answers still save offline via the existing outbox. | Discard + review-on-the-spot makes offline transcription contradictory (record into a dead zone, get nothing back). |
| 8 | Field scope | **All `text`-type questions + the findings repeater note field.** Type-driven, one render branch. No mic on boolean/select/number/date. | Matches the "questions are config, not hardcoded" principle — future text questions get voice for free. |

## 3. Architecture

```
src/app/api/first-visit/transcribe/route.ts   POST (multipart audio blob)
  → getHubRouteContext auth (401 otherwise), like every first-visit route
  → OpenAI whisper-1 transcription (reuse loadOpenAIKey + toFile pattern
    from src/app/api/inspections/[id]/recordings/route.ts)
  → OpenAI gpt-4o-mini cleanup pass (system prompt in §4)
  → returns { text }
  → NO database write, NO storage upload. Audio lives only in the request.
```

```
src/lib/firstVisit/useVoiceDictation.ts   (new hook)
  → wraps the existing useAudioRecorder (src/lib/firstVisit/useVoiceRecorder.ts)
  → state machine: idle → recording → transcribing → (idle | error)
  → on stop: POST the blob to /api/first-visit/transcribe, return cleaned text
  → exposes: { state, start, stop, error, online }
```

```
src/components/firstVisit/VoiceDictationButton.tsx   (new component)
  → idle:        🎙️ corner button (disabled + hint when offline)
  → recording:   inline row — red dot + running timer + Stop
  → transcribing: "Transcribing…" spinner
  → calls onTranscript(text) so the parent appends at cursor
  → wired into the `text` branch of QuestionRow in StepGroup.tsx,
    next to where the `file` branch was added
```

**Reused surfaces (do not duplicate):**
- `useAudioRecorder` — dormant hook, already present, records webm blob.
- `loadOpenAIKey` + `toFile` + `whisper-1` call — crib from the legacy recordings route.
- `POST /api/first-visit/answers` — final write path; voice never gets its own write surface. The appended text is saved exactly like typed text.
- The existing outbox — unchanged; only *typed* answers queue offline. Voice is online-only.

**No new env, no new bucket, no new table.**

## 4. Cleanup Prompt (draft)

**Model:** `gpt-4o-mini`.
**System prompt:**

> You clean up dictated inspection notes. The text is a raw speech-to-text transcript from a property inspector. Return the same content, tidied:
> - Fix punctuation and capitalization.
> - Remove filler ("um", "äh", "you know", false starts, repeated words).
> - Correct obvious transcription errors using context.
> - Keep the inspector's exact meaning and every concrete detail (numbers, locations, object names). Do NOT summarize, shorten, or omit anything substantive.
> - Keep the original language (German, English, or mixed — leave it as spoken).
> - Return only the cleaned text, no preamble, no quotes.

**User message:** the raw Whisper transcript.

## 5. UX States (the field)

1. **Idle** — normal text box, small 🎙️ button in the corner.
2. **Offline** — 🎙️ disabled (greyed) + hint "Voice needs a connection — type for now." Typing still works and saves offline.
3. **Recording** — button row becomes: ● (red) + `0:07` running timer + **Stop**.
4. **Transcribing** — "Transcribing…" spinner; field not editable for the ~1–2 s round-trip.
5. **Done** — cleaned text appended at cursor; back to Idle; field editable; can dictate again to stack.
6. **Error** — toast "Couldn't transcribe — try again or type"; field unchanged; back to Idle.

## 6. Out of Scope (V1)

- The per-phase batch extraction flow (`2026-05-29` design).
- Dictating into select / number / date with AI mapping to an option.
- Audio retention or playback / audit.
- Offline transcription (queue clips, transcribe later).
- Live-as-you-speak streaming transcription.

## 7. Risks

- **Whisper hallucination on silence / very short clips** — mitigate with a minimum-duration guard (ignore clips under ~0.5 s) and the cleanup prop defaulting to passing text through unchanged.
- **Mic permission denied** — surface a clear one-time message; fall back to typing.
- **`gpt-4o-mini` over-trimming** — the prompt explicitly forbids summarizing; eyeball a handful of real dictations before sign-off.

— end —
