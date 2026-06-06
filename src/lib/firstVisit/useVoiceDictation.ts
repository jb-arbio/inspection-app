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
