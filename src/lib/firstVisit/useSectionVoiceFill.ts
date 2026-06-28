'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRecorder } from './useVoiceRecorder';
import { useInterimCaptions } from './useInterimCaptions';
import { postTranscribeAccurate, postVoiceExtraction } from './postVoiceExtraction';
import { buildExtractionSchema } from './extractionSchema';
import { writeAiSuggestions, acceptAiRows, type AiFillResult } from './aiFill';
import type { LocalAnswer } from './db';
import type { HubScope } from './resolveScope';

const MIN_AUDIO_BYTES = 1024;

export type VoiceFillStatus = 'idle' | 'recording' | 'thinking';

export type VoiceFillSummary = {
  promptId: string;
  singlesWritten: number;
  itemsWritten: number;
  /** Slugs of the single (non-repeater) fields filled, so the hint can NAME
   *  them ("Pre-filled: Room size") rather than just count them. */
  filledSlugs: string[];
};

type Options = {
  inspectionId: string;
  targetId: string;
  scope: HubScope;
  ctx: { location_id?: string; unit_category_id?: string };
  /** Reads the latest answers map at write time (for step_index alloc). */
  getAnswers: () => Record<string, LocalAnswer>;
  /** Called with the rows written so the survey can merge them into state. */
  onRowsWritten: (rows: LocalAnswer[]) => void;
};

// Drives one section's voice-fill: record a clip for a chosen prompt → accurate
// transcript → scoped extraction → write suggestions. Only one prompt records at
// a time (activePromptId). Mirrors useVoiceDictation's online/elapsed/serial
// guards; per-word live captions can layer on later via Web Speech.
export function useSectionVoiceFill(opts: Options) {
  const { start, stop } = useAudioRecorder();
  const captions = useInterimCaptions();
  const [status, setStatus] = useState<VoiceFillStatus>('idle');
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [summary, setSummary] = useState<VoiceFillSummary | null>(null);
  const [error, setError] = useState(false);
  // Which prompt's fill errored. Kept separate from `activePromptId` (which is
  // reset to null the moment recording stops) so the failure message can still
  // render against the right prompt AFTER the clip is processed. Without this,
  // a transcribe/extract failure was silently swallowed — the user saw nothing.
  const [errorPromptId, setErrorPromptId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const areaKeyRef = useRef('');
  const slugsRef = useRef<string[]>([]);
  const lastRows = useRef<LocalAnswer[]>([]);

  useEffect(() => () => { mounted.current = false; }, []);
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
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
  useEffect(() => clearTimer, [clearTimer]);

  const onStart = useCallback(
    async (promptId: string, areaKey: string, targetSlugs: string[]) => {
      if (status !== 'idle') return;
      if (!navigator.onLine) return;
      setError(false);
      setErrorPromptId(null);
      setSummary(null);
      setAccepted(false);
      lastRows.current = [];
      areaKeyRef.current = areaKey;
      slugsRef.current = targetSlugs;
      try {
        await start();
        captions.start();
        startedAt.current = Date.now();
        setElapsedMs(0);
        setActivePromptId(promptId);
        setStatus('recording');
        clearTimer();
        timer.current = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 250);
      } catch {
        setStatus('idle');
        setActivePromptId(null);
      }
    },
    [start, captions, clearTimer, status],
  );

  const onStop = useCallback(async () => {
    clearTimer();
    captions.stop();
    const promptId = activePromptId;
    const blob = await stop();
    if (!mounted.current) return;
    setStatus('thinking');
    let result: AiFillResult | null = null;
    try {
      if (blob && blob.size >= MIN_AUDIO_BYTES) {
        const text = await postTranscribeAccurate(blob);
        if (text.trim()) {
          const targetSlugs = slugsRef.current;
          const extraction = await postVoiceExtraction(text.trim(), targetSlugs);
          const { groupSlugsByGroup } = buildExtractionSchema(targetSlugs);
          result = await writeAiSuggestions({
            inspectionId: opts.inspectionId,
            targetId: opts.targetId,
            areaKey: areaKeyRef.current,
            scope: opts.scope,
            ctx: opts.ctx,
            extraction,
            answers: opts.getAnswers(),
            groupSlugsByGroup,
          });
          if (mounted.current) {
            lastRows.current = result.writtenRows;
            opts.onRowsWritten(result.writtenRows);
          }
        }
      }
      if (mounted.current && promptId) {
        const filledSlugs = result
          ? Array.from(
              new Set(
                result.writtenRows
                  .filter((r) => r.step_index == null)
                  .map((r) => r.question_key),
              ),
            )
          : [];
        setSummary({
          promptId,
          singlesWritten: result?.singlesWritten ?? 0,
          itemsWritten: result?.itemsWritten ?? 0,
          filledSlugs,
        });
      }
    } catch {
      if (mounted.current) {
        setError(true);
        setErrorPromptId(promptId);
      }
    } finally {
      if (mounted.current) {
        setStatus('idle');
        setActivePromptId(null);
      }
    }
  }, [stop, captions, clearTimer, activePromptId, opts]);

  const acceptAll = useCallback(async () => {
    const updated = await acceptAiRows(lastRows.current);
    if (updated.length && mounted.current) {
      opts.onRowsWritten(updated);
      setAccepted(true);
    }
  }, [opts]);

  const canAcceptAll =
    status === 'idle' && !accepted && summary !== null && summary.singlesWritten + summary.itemsWritten > 0;

  return {
    status,
    activePromptId,
    online,
    elapsedMs,
    summary,
    error,
    errorPromptId,
    accepted,
    canAcceptAll,
    interim: captions.interim,
    onStart,
    onStop,
    acceptAll,
  };
}

// The full fill controller returned by useSectionVoiceFill. Consumers (the
// inline VoicePromptCard) receive this so a single phase-level hook can drive
// every prompt card co-located with its fields.
export type SectionVoiceFill = ReturnType<typeof useSectionVoiceFill>;
