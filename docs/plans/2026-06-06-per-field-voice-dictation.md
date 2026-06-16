# Per-Field Voice Dictation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an inline 🎙️ button to every free-text field (and the findings note) that records in-app, transcribes via Whisper, cleans the text with `gpt-4o-mini`, and appends the result at the cursor — audio discarded, online-only.

**Architecture:** A presentational `VoiceDictationButton` driven by a `useVoiceDictation` hook (wraps the existing `useAudioRecorder`, POSTs the clip, manages status/online/timer). The hook calls `POST /api/first-visit/transcribe`, which runs Whisper then a `gpt-4o-mini` cleanup pass and returns `{ text }` — no DB write, no storage. The button is wired into the `text` branches of `PrefilledField`, so all `text`-type questions (including `finding_notes`) get it for free. New text is merged with `appendDictation`.

**Tech Stack:** Next.js App Router (route handlers), React client components, `openai` SDK (`whisper-1` + `gpt-4o-mini`, already a dependency, `OPENAI_API_KEY` already wired), Vitest + jsdom + @testing-library/react.

**Design doc:** `docs/plans/2026-06-06-per-field-voice-dictation-design.md`

**Conventions for the implementer (read first):**
- Run tests with `npx vitest run <path>` (single file) or `npm test` (all). Type-check with `npx tsc --noEmit`.
- The `openai` SDK is imported as `import OpenAI, { toFile } from 'openai'`.
- Auth in first-visit routes is `getHubRouteContext(getHubSupabase())` → `null` means 401. Copy the exact pattern from `src/app/api/first-visit/[inspectionId]/findings.csv/route.ts:53-54`.
- `loadOpenAIKey()` (lazy `.env.local` reader) lives in `src/app/api/inspections/[id]/recordings/route.ts:41-59`. We will extract it to a shared module in Task 2 rather than duplicate it.
- Commit after every task. Branch is `feat/fv-question-refactor`'s successor — create a fresh branch in Task 0.

---

### Task 0: Branch setup

**Step 1: Create the feature branch off the current fork tip**

```bash
cd /Users/Joshua/Documents/01_Projects/inspection-app-fork
git checkout -b feat/voice-dictation
git log --oneline -1   # expect: 91712d2 docs(fv): per-field voice dictation design (or later)
```

No commit needed — the design doc is already committed.

---

### Task 1: `appendDictation` text-merge helper

The pure rule for stacking dictations onto whatever is already in the field. Append at the end, with exactly one space between the old text and the new, trimming stray whitespace. Empty existing → just the addition. Empty addition → existing unchanged.

**Files:**
- Create: `src/lib/firstVisit/appendDictation.ts`
- Test: `src/lib/firstVisit/__tests__/appendDictation.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { appendDictation } from '../appendDictation';

describe('appendDictation', () => {
  it('returns the addition when existing is empty', () => {
    expect(appendDictation('', 'Smoke detector present.')).toBe('Smoke detector present.');
    expect(appendDictation('   ', 'Hello.')).toBe('Hello.');
  });

  it('returns existing unchanged when addition is blank', () => {
    expect(appendDictation('Walls are clean.', '')).toBe('Walls are clean.');
    expect(appendDictation('Walls are clean.', '   ')).toBe('Walls are clean.');
  });

  it('joins existing and addition with a single space', () => {
    expect(appendDictation('Walls are clean.', 'No cracks.')).toBe(
      'Walls are clean. No cracks.',
    );
  });

  it('does not double spaces when existing has trailing whitespace', () => {
    expect(appendDictation('Walls are clean. ', 'No cracks.')).toBe(
      'Walls are clean. No cracks.',
    );
  });

  it('trims leading/trailing whitespace on the addition', () => {
    expect(appendDictation('A.', '  B.  ')).toBe('A. B.');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/firstVisit/__tests__/appendDictation.test.ts`
Expected: FAIL — `appendDictation` not found.

**Step 3: Write minimal implementation**

```typescript
// Merge a freshly transcribed snippet onto the existing field text. Dictations
// stack at the end with a single separating space; blanks are no-ops. Never
// overwrites — the inspector's prior text (typed or dictated) is preserved.
export function appendDictation(existing: string, addition: string): string {
  const add = addition.trim();
  if (!add) return existing;
  const base = existing.trimEnd();
  if (!base) return add;
  return `${base} ${add}`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/firstVisit/__tests__/appendDictation.test.ts`
Expected: PASS (5 tests).

**Step 5: Commit**

```bash
git add src/lib/firstVisit/appendDictation.ts src/lib/firstVisit/__tests__/appendDictation.test.ts
git commit -m "feat(fv): appendDictation text-merge helper for voice input"
```

---

### Task 2: `POST /api/first-visit/transcribe` route

Accepts a multipart audio blob, auth-gates it, runs Whisper, then a `gpt-4o-mini` cleanup pass, returns `{ text }`. No DB write, no storage. If cleanup fails, fall back to the raw transcript (never lose the inspector's words). If the transcript is empty/whitespace, return `{ text: '' }`.

First, **extract `loadOpenAIKey`** into a shared module so the route doesn't duplicate it.

**Files:**
- Create: `src/lib/openaiKey.ts`
- Create: `src/lib/firstVisit/cleanupPrompt.ts`
- Create: `src/app/api/first-visit/transcribe/route.ts`
- Test: `src/app/api/first-visit/transcribe/__tests__/route.test.ts`
- Modify: `src/app/api/inspections/[id]/recordings/route.ts` (import the shared `loadOpenAIKey`, delete the local copy) — do this in Step 7, only after the new route's tests pass, to avoid touching the legacy route mid-task.

**Step 1: Create the shared key loader**

```typescript
// src/lib/openaiKey.ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Lazily populate process.env.OPENAI_API_KEY from a local .env.local when the
// platform hasn't injected it (dev / some CI). No-op if already set. Extracted
// verbatim from the legacy recordings route so both transcription paths share it.
export function loadOpenAIKey(): void {
  if (process.env.OPENAI_API_KEY) return;
  const cwd = process.cwd();
  const possiblePaths = [
    resolve(cwd, '.env.local'),
    resolve(cwd, 'inspection-app', '.env.local'),
  ];
  for (const envPath of possiblePaths) {
    if (!existsSync(envPath)) continue;
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
    if (match) {
      process.env.OPENAI_API_KEY = match[1].trim();
      return;
    }
  }
}
```

**Step 2: Create the cleanup prompt module**

```typescript
// src/lib/firstVisit/cleanupPrompt.ts
// System prompt for the gpt-4o-mini cleanup pass. Tidy ONLY — never summarize.
export const CLEANUP_SYSTEM_PROMPT = [
  'You clean up dictated inspection notes. The text is a raw speech-to-text',
  'transcript from a property inspector. Return the same content, tidied:',
  '- Fix punctuation and capitalization.',
  '- Remove filler ("um", "äh", "you know", false starts, repeated words).',
  '- Correct obvious transcription errors using context.',
  '- Keep the inspector\'s exact meaning and every concrete detail (numbers,',
  '  locations, object names). Do NOT summarize, shorten, or omit anything.',
  '- Keep the original language (German, English, or mixed — as spoken).',
  '- Return only the cleaned text, no preamble, no quotes.',
].join('\n');

export const CLEANUP_MODEL = 'gpt-4o-mini';
export const TRANSCRIBE_MODEL = 'whisper-1';
```

**Step 3: Write the failing route test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firstVisit/hubSupabase', () => ({ getHubSupabase: vi.fn() }));
vi.mock('@/lib/firstVisit/hubSupabaseAdmin', () => ({ getHubRouteContext: vi.fn() }));

// Mock the OpenAI SDK: transcriptions.create + chat.completions.create.
const transcribe = vi.fn();
const chat = vi.fn();
vi.mock('openai', () => ({
  default: class {
    audio = { transcriptions: { create: transcribe } };
    chat = { completions: { create: chat } };
  },
  toFile: vi.fn(async () => ({ name: 'audio.webm' })),
}));

import { POST } from '../route';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';

const asMock = (fn: unknown) => fn as never as ReturnType<typeof vi.fn>;

function makeRequest(file: Blob | null) {
  const form = new FormData();
  if (file) form.append('audio', file, 'clip.webm');
  return new Request('http://test/api/first-visit/transcribe', {
    method: 'POST',
    body: form,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = 'sk-test';
  asMock(getHubRouteContext).mockResolvedValue({ supabase: {}, email: 'a@arbio.com' });
});

describe('POST /api/first-visit/transcribe', () => {
  it('401 when unauthenticated', async () => {
    asMock(getHubRouteContext).mockResolvedValue(null);
    const res = await POST(makeRequest(new Blob(['x'], { type: 'audio/webm' })));
    expect(res.status).toBe(401);
  });

  it('400 when no audio file is provided', async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(400);
  });

  it('transcribes then cleans, returning the cleaned text', async () => {
    transcribe.mockResolvedValue({ text: 'um the walls are uh clean no cracks' });
    chat.mockResolvedValue({
      choices: [{ message: { content: 'The walls are clean, no cracks.' } }],
    });
    const res = await POST(makeRequest(new Blob(['x'], { type: 'audio/webm' })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'The walls are clean, no cracks.' });
    expect(transcribe).toHaveBeenCalledOnce();
    expect(chat).toHaveBeenCalledOnce();
  });

  it('returns empty text and skips cleanup when Whisper transcript is blank', async () => {
    transcribe.mockResolvedValue({ text: '   ' });
    const res = await POST(makeRequest(new Blob(['x'], { type: 'audio/webm' })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: '' });
    expect(chat).not.toHaveBeenCalled();
  });

  it('falls back to the raw transcript when cleanup fails', async () => {
    transcribe.mockResolvedValue({ text: 'walls are clean' });
    chat.mockRejectedValue(new Error('cleanup down'));
    const res = await POST(makeRequest(new Blob(['x'], { type: 'audio/webm' })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'walls are clean' });
  });

  it('500 when transcription throws', async () => {
    transcribe.mockRejectedValue(new Error('whisper down'));
    const res = await POST(makeRequest(new Blob(['x'], { type: 'audio/webm' })));
    expect(res.status).toBe(500);
  });
});
```

**Step 4: Run test to verify it fails**

Run: `npx vitest run src/app/api/first-visit/transcribe/__tests__/route.test.ts`
Expected: FAIL — `../route` has no `POST` export.

**Step 5: Write the route**

```typescript
// src/app/api/first-visit/transcribe/route.ts
import OpenAI, { toFile } from 'openai';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';
import { loadOpenAIKey } from '@/lib/openaiKey';
import {
  CLEANUP_SYSTEM_PROMPT,
  CLEANUP_MODEL,
  TRANSCRIBE_MODEL,
} from '@/lib/firstVisit/cleanupPrompt';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export async function POST(req: Request): Promise<Response> {
  const ctx = await getHubRouteContext(getHubSupabase());
  if (!ctx) return json({ error: 'unauth' }, 401);

  const form = await req.formData();
  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return json({ error: 'no audio' }, 400);
  }

  loadOpenAIKey();
  if (!process.env.OPENAI_API_KEY) return json({ error: 'no key' }, 500);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let raw: string;
  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const file = await toFile(buffer, 'clip.webm', { type: 'audio/webm' });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: TRANSCRIBE_MODEL,
    });
    raw = (transcription.text ?? '').trim();
  } catch (err) {
    console.error('Whisper transcription failed:', err);
    return json({ error: 'transcription failed' }, 500);
  }

  if (!raw) return json({ text: '' });

  // Cleanup pass. On any failure, fall back to the raw transcript so the
  // inspector never loses what they said.
  let cleaned = raw;
  try {
    const completion = await openai.chat.completions.create({
      model: CLEANUP_MODEL,
      messages: [
        { role: 'system', content: CLEANUP_SYSTEM_PROMPT },
        { role: 'user', content: raw },
      ],
    });
    const out = completion.choices[0]?.message?.content?.trim();
    if (out) cleaned = out;
  } catch (err) {
    console.error('Cleanup pass failed, returning raw transcript:', err);
  }

  return json({ text: cleaned });
}
```

**Step 6: Run test to verify it passes**

Run: `npx vitest run src/app/api/first-visit/transcribe/__tests__/route.test.ts`
Expected: PASS (6 tests).

**Step 7: De-duplicate `loadOpenAIKey` in the legacy route**

In `src/app/api/inspections/[id]/recordings/route.ts`: delete the local `loadOpenAIKey` function (lines ~41-59) and its `existsSync/readFileSync/resolve` imports if now unused, and add `import { loadOpenAIKey } from '@/lib/openaiKey';`. Then:

Run: `npx vitest run` (full suite) and `npx tsc --noEmit`
Expected: all green — the legacy recordings route still has its tests passing and types clean.

**Step 8: Commit**

```bash
git add src/lib/openaiKey.ts src/lib/firstVisit/cleanupPrompt.ts \
  src/app/api/first-visit/transcribe/ \
  src/app/api/inspections/[id]/recordings/route.ts
git commit -m "feat(fv): transcribe route (whisper + gpt-4o-mini cleanup), shared OpenAI key loader"
```

---

### Task 3: `postTranscription` client network helper

The browser-side call that uploads a blob and returns the cleaned text. Pure-ish (only `fetch`), so it's unit-testable with a mocked `fetch`.

**Files:**
- Create: `src/lib/firstVisit/postTranscription.ts`
- Test: `src/lib/firstVisit/__tests__/postTranscription.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postTranscription } from '../postTranscription';

beforeEach(() => vi.restoreAllMocks());

describe('postTranscription', () => {
  it('POSTs the blob as multipart and returns the text', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ text: 'Clean text.' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const blob = new Blob(['x'], { type: 'audio/webm' });
    const text = await postTranscription(blob);

    expect(text).toBe('Clean text.');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/first-visit/transcribe');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
  });

  it('throws on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await expect(postTranscription(new Blob(['x']))).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/firstVisit/__tests__/postTranscription.test.ts`
Expected: FAIL — `postTranscription` not found.

**Step 3: Write minimal implementation**

```typescript
// src/lib/firstVisit/postTranscription.ts
// Upload a recorded clip and return the cleaned transcript. Throws on failure
// so the caller can surface an error toast and leave the field untouched.
export async function postTranscription(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'clip.webm');
  const res = await fetch('/api/first-visit/transcribe', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`transcribe failed: ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return data.text ?? '';
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/firstVisit/__tests__/postTranscription.test.ts`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add src/lib/firstVisit/postTranscription.ts src/lib/firstVisit/__tests__/postTranscription.test.ts
git commit -m "feat(fv): postTranscription client helper"
```

---

### Task 4: `VoiceDictationButton` presentational component

Pure presentational — all state comes in via props, all actions go out via callbacks. This keeps it fully testable in jsdom (no MediaRecorder/getUserMedia). The hook in Task 5 supplies the props.

States: `idle` (🎙️ button), `recording` (● red + `m:ss` timer + Stop), `transcribing` (spinner + "Transcribing…"). When `online` is false: disabled 🎙️ + hint.

**Files:**
- Create: `src/components/firstVisit/VoiceDictationButton.tsx`
- Test: `src/components/firstVisit/__tests__/VoiceDictationButton.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceDictationButton } from '../VoiceDictationButton';

const base = {
  status: 'idle' as const,
  online: true,
  elapsedMs: 0,
  onStart: vi.fn(),
  onStop: vi.fn(),
};

describe('VoiceDictationButton', () => {
  it('idle: shows a record button and calls onStart', async () => {
    const onStart = vi.fn();
    render(<VoiceDictationButton {...base} onStart={onStart} />);
    const btn = screen.getByRole('button', { name: /record|dictate|voice/i });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('offline: record button is disabled and a hint is shown', () => {
    render(<VoiceDictationButton {...base} online={false} />);
    expect(screen.getByRole('button', { name: /record|dictate|voice/i })).toBeDisabled();
    expect(screen.getByText(/needs a connection/i)).toBeInTheDocument();
  });

  it('recording: shows timer and a Stop button that calls onStop', async () => {
    const onStop = vi.fn();
    render(
      <VoiceDictationButton {...base} status="recording" elapsedMs={67000} onStop={onStop} />,
    );
    expect(screen.getByText('1:07')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('transcribing: shows a transcribing indicator and no record/stop action', () => {
    render(<VoiceDictationButton {...base} status="transcribing" />);
    expect(screen.getByText(/transcribing/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /stop/i })).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/firstVisit/__tests__/VoiceDictationButton.test.tsx`
Expected: FAIL — component not found.

**Step 3: Write minimal implementation**

```tsx
// src/components/firstVisit/VoiceDictationButton.tsx
'use client';

export type DictationStatus = 'idle' | 'recording' | 'transcribing';

export type VoiceDictationButtonProps = {
  status: DictationStatus;
  online: boolean;
  elapsedMs: number;
  onStart: () => void;
  onStop: () => void;
};

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VoiceDictationButton({
  status,
  online,
  elapsedMs,
  onStart,
  onStop,
}: VoiceDictationButtonProps) {
  if (status === 'transcribing') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <span className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-gray-600" />
        Transcribing…
      </span>
    );
  }

  if (status === 'recording') {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
          <span className="tabular-nums">{fmt(elapsedMs)}</span>
        </span>
        <button
          type="button"
          onClick={onStop}
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
        >
          Stop
        </button>
      </span>
    );
  }

  // idle
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="Record voice note"
        disabled={!online}
        onClick={onStart}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        🎙️
      </button>
      {!online && (
        <span className="text-[10px] text-gray-400">Voice needs a connection — type for now</span>
      )}
    </span>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/firstVisit/__tests__/VoiceDictationButton.test.tsx`
Expected: PASS (4 tests).

**Step 5: Commit**

```bash
git add src/components/firstVisit/VoiceDictationButton.tsx src/components/firstVisit/__tests__/VoiceDictationButton.test.tsx
git commit -m "feat(fv): VoiceDictationButton presentational component"
```

---

### Task 5: `useVoiceDictation` hook

Wires the recorder + network + status + online detection + elapsed timer, and emits the cleaned text via an `onResult` callback. Wraps the existing `useAudioRecorder`. Tested by mocking `useAudioRecorder` and `postTranscription`.

**Files:**
- Create: `src/lib/firstVisit/useVoiceDictation.ts`
- Test: `src/lib/firstVisit/__tests__/useVoiceDictation.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const start = vi.fn();
const stop = vi.fn(async () => new Blob(['x'], { type: 'audio/webm' }));
vi.mock('../useVoiceRecorder', () => ({
  useAudioRecorder: () => ({ recording: false, start, stop }),
}));

const post = vi.fn(async () => 'Cleaned text.');
vi.mock('../postTranscription', () => ({ postTranscription: (b: Blob) => post(b) }));

import { useVoiceDictation } from '../useVoiceDictation';

beforeEach(() => vi.clearAllMocks());

describe('useVoiceDictation', () => {
  it('starts idle and online', () => {
    const { result } = renderHook(() => useVoiceDictation(vi.fn()));
    expect(result.current.status).toBe('idle');
    expect(result.current.online).toBe(true);
  });

  it('start → status recording', async () => {
    const { result } = renderHook(() => useVoiceDictation(vi.fn()));
    await act(async () => { await result.current.onStart(); });
    expect(start).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('recording');
  });

  it('stop → transcribing → emits result → back to idle', async () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useVoiceDictation(onResult));
    await act(async () => { await result.current.onStart(); });
    await act(async () => { await result.current.onStop(); });
    expect(post).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(onResult).toHaveBeenCalledWith('Cleaned text.');
  });

  it('does not emit when transcription returns empty', async () => {
    post.mockResolvedValueOnce('');
    const onResult = vi.fn();
    const { result } = renderHook(() => useVoiceDictation(onResult));
    await act(async () => { await result.current.onStart(); });
    await act(async () => { await result.current.onStop(); });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(onResult).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/firstVisit/__tests__/useVoiceDictation.test.ts`
Expected: FAIL — hook not found.

**Step 3: Write minimal implementation**

```typescript
// src/lib/firstVisit/useVoiceDictation.ts
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRecorder } from './useVoiceRecorder';
import { postTranscription } from './postTranscription';
import type { DictationStatus } from '@/components/firstVisit/VoiceDictationButton';

// Drives one field's mic: record → transcribe → emit cleaned text. onResult is
// called with the cleaned snippet; the field decides how to merge it
// (appendDictation). Audio is never persisted — the blob lives only for the POST.
export function useVoiceDictation(onResult: (text: string) => void) {
  const { start, stop } = useAudioRecorder();
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [online, setOnline] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const onStart = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      await start();
      startedAt.current = Date.now();
      setElapsedMs(0);
      setStatus('recording');
      clearTimer();
      timer.current = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 250);
    } catch {
      setStatus('idle');
    }
  }, [start, clearTimer]);

  const onStop = useCallback(async () => {
    clearTimer();
    const blob = await stop();
    setStatus('transcribing');
    try {
      if (blob && blob.size > 0) {
        const text = await postTranscription(blob);
        if (text.trim()) onResult(text.trim());
      }
    } catch {
      // swallow — the field is left untouched; a toast can be added later.
    } finally {
      setStatus('idle');
    }
  }, [stop, clearTimer, onResult]);

  return { status, online, elapsedMs, onStart, onStop };
}
```

> Note: `Date.now()` is fine in app/runtime code — the no-`Date.now()` rule is workflow-script-only. The hook needs a wall clock for the timer.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/firstVisit/__tests__/useVoiceDictation.test.ts`
Expected: PASS (4 tests).

**Step 5: Commit**

```bash
git add src/lib/firstVisit/useVoiceDictation.ts src/lib/firstVisit/__tests__/useVoiceDictation.test.ts
git commit -m "feat(fv): useVoiceDictation hook"
```

---

### Task 6: Wire the mic into `PrefilledField` text fields

Add a `VoiceDictation` wrapper that combines the hook + button, and render it next to the `text` input and the `text`/observe textarea in `PrefilledField`. On result, append via `appendDictation` and pulse "Saved". Only `text`-type fields get it (covers `finding_notes` automatically). Number/select/date/boolean must NOT get it.

**Files:**
- Modify: `src/components/firstVisit/PrefilledField.tsx`
- Test: `src/components/firstVisit/__tests__/PrefilledField.voice.test.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrefilledField } from '../PrefilledField';
import { makeQuestion } from './_fixtures';

// Stub the hook so we can drive onResult and assert the append behaviour without
// touching MediaRecorder. Capture the latest onResult passed in.
let lastOnResult: ((t: string) => void) | null = null;
vi.mock('@/lib/firstVisit/useVoiceDictation', () => ({
  useVoiceDictation: (onResult: (t: string) => void) => {
    lastOnResult = onResult;
    return { status: 'idle', online: true, elapsedMs: 0, onStart: vi.fn(), onStop: vi.fn() };
  },
}));

describe('PrefilledField voice', () => {
  it('renders a mic for text fields', () => {
    const q = makeQuestion({ type: 'text', slug: 'finding_notes', label: 'Notes' });
    render(<PrefilledField question={q} hubValue={undefined} value="" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /record voice/i })).toBeInTheDocument();
  });

  it('does NOT render a mic for number/select/date/boolean', () => {
    for (const type of ['number', 'select', 'date', 'boolean'] as const) {
      const q = makeQuestion({ type, slug: `q_${type}`, options: ['a', 'b'] });
      const { unmount } = render(
        <PrefilledField question={q} hubValue={undefined} value={null} onChange={vi.fn()} />,
      );
      expect(screen.queryByRole('button', { name: /record voice/i })).toBeNull();
      unmount();
    }
  });

  it('appends the transcribed text to the existing field value', () => {
    const onChange = vi.fn();
    const q = makeQuestion({ type: 'text', slug: 'fv_notes', label: 'Notes', mode: 'observe' });
    render(
      <PrefilledField question={q} hubValue={undefined} value="Walls clean." onChange={onChange} />,
    );
    lastOnResult!('No cracks.');
    expect(onChange).toHaveBeenCalledWith({
      value: 'Walls clean. No cracks.',
      wasAcceptedAsIs: false,
    });
  });
});
```

(If `makeQuestion` in `_fixtures` doesn't accept `mode`, extend the fixture's defaults to pass through overrides — check `src/components/firstVisit/__tests__/_fixtures.ts` first.)

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/firstVisit/__tests__/PrefilledField.voice.test.tsx`
Expected: FAIL — no mic rendered.

**Step 3: Implement**

Add near the top of `PrefilledField.tsx`:

```tsx
import { VoiceDictationButton } from '@/components/firstVisit/VoiceDictationButton';
import { useVoiceDictation } from '@/lib/firstVisit/useVoiceDictation';
import { appendDictation } from '@/lib/firstVisit/appendDictation';
```

Add a small inline subcomponent (bottom of file, with the other helpers):

```tsx
// Mic + recorder glue for one text field. Appends cleaned dictation to the
// current value; never overwrites. Rendered only for text-type fields.
function VoiceDictation({
  current,
  onAppended,
}: {
  current: string;
  onAppended: (next: string) => void;
}) {
  const currentRef = useRef(current);
  currentRef.current = current;
  const { status, online, elapsedMs, onStart, onStop } = useVoiceDictation((text) =>
    onAppended(appendDictation(currentRef.current, text)),
  );
  return (
    <div className="flex justify-end">
      <VoiceDictationButton
        status={status}
        online={online}
        elapsedMs={elapsedMs}
        onStart={onStart}
        onStop={onStop}
      />
    </div>
  );
}
```

Then render it right after the two `text` input/textarea blocks (after line ~176, still inside the returned container). Wrap both text branches so the mic appears once for either:

```tsx
{question.type === 'text' && (
  <VoiceDictation
    current={value == null ? '' : String(value)}
    onAppended={(next) => {
      onChange({ value: next, wasAcceptedAsIs: false });
      pulseDebounced();
    }}
  />
)}
```

Place this block immediately after the `isLongText` textarea block and before the `number` block.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/firstVisit/__tests__/PrefilledField.voice.test.tsx`
Expected: PASS (3 tests).

**Step 5: Full suite + types**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all green.

**Step 6: Commit**

```bash
git add src/components/firstVisit/PrefilledField.tsx src/components/firstVisit/__tests__/PrefilledField.voice.test.tsx
git commit -m "feat(fv): inline voice dictation on all text fields + findings note"
```

---

### Task 7: Manual smoke test (human)

Not automatable — Joshua runs the dev server (`npm run dev`) and verifies on a real device/browser:

1. **Happy path:** open a first-visit survey → a `text` field shows 🎙️ → tap, allow mic, speak "the walls are clean, no cracks" → Stop → "Transcribing…" → cleaned text appears appended; dictate again → second sentence stacks.
2. **Findings note:** the findings repeater's note field shows the mic and behaves the same.
3. **No mic where it shouldn't be:** number/select/date/boolean fields have no mic.
4. **Append, not overwrite:** type some text by hand, then dictate — typed text is preserved, dictation appended.
5. **Offline:** toggle airplane mode / devtools offline → mic disabled with "needs a connection" hint; typing still saves.
6. **Audio discarded:** confirm no new rows in any audio bucket/table and no clip persisted (network tab: only the transcribe POST, no storage upload).

---

### Final review

After Task 6 passes and Task 7 is confirmed, dispatch a holistic code review (superpowers:requesting-code-review), then use superpowers:finishing-a-development-branch to push `feat/voice-dictation` and open a PR to `iuliia-arbio:main`, mirroring the PR #2 flow.
