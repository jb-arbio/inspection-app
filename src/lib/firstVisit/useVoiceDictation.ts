'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRecorder } from './useVoiceRecorder';
import { postTranscription } from './postTranscription';
import type { DictationStatus } from '@/components/firstVisit/VoiceDictationButton';

// A genuine spoken clip is comfortably larger than this; anything smaller is an
// accidental tap. Drop it silently rather than burn a Whisper call on noise.
const MIN_AUDIO_BYTES = 1024; // 1 KB

// How long the 'error' state lingers before auto-resetting to 'idle', so the
// mic returns to a usable state on its own if the inspector doesn't retry.
const ERROR_AUTO_CLEAR_MS = 4000;

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
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const clearErrorTimer = useCallback(() => {
    if (errorTimer.current) {
      clearTimeout(errorTimer.current);
      errorTimer.current = null;
    }
  }, []);
  // Clear the auto-reset timer on unmount so it can't fire after teardown.
  useEffect(() => clearErrorTimer, [clearErrorTimer]);

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
    // Allow starting from 'idle' or 'error' (retry); recording/transcribing block.
    if (status !== 'idle' && status !== 'error') return;
    if (!navigator.onLine) return;
    // Reset any lingering error state before recording again.
    clearErrorTimer();
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
  }, [start, clearTimer, clearErrorTimer, status]);

  const onStop = useCallback(async () => {
    clearTimer();
    const blob = await stop();
    if (!mounted.current) return;
    setStatus('transcribing');
    try {
      if (blob && blob.size >= MIN_AUDIO_BYTES) {
        const text = await postTranscription(blob);
        // An empty transcript (tiny/silent clip) is NOT an error — fall through
        // to the idle reset below without emitting and without flagging error.
        if (text.trim() && mounted.current) onResult(text.trim());
      }
      // Success (or intentional empty/skip): return the mic to idle.
      if (mounted.current) setStatus('idle');
    } catch {
      // A genuine transcription failure (network/API/500). Surface it: hold the
      // 'error' state so the button can show + announce it, then auto-clear back
      // to idle after a delay so the mic recovers on its own.
      if (mounted.current) {
        setStatus('error');
        clearErrorTimer();
        errorTimer.current = setTimeout(() => {
          if (mounted.current) setStatus('idle');
          errorTimer.current = null;
        }, ERROR_AUTO_CLEAR_MS);
      }
    }
  }, [stop, clearTimer, clearErrorTimer, onResult]);

  return { status, online, elapsedMs, onStart, onStop };
}
