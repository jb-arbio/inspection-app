'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Live interim captions via the browser's Web Speech API — a disposable preview
// of what's being said, for responsiveness only. The authoritative transcript
// that drives the field fill comes from gpt-4o-transcribe on the recorded audio
// (see useSectionVoiceFill). Feature-detected and fully defensive: if Web Speech
// is unavailable or errors, this no-ops and the fill flow is unaffected.

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
}

function getCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useInterimCaptions() {
  const [interim, setInterim] = useState('');
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const supported = getCtor() !== null;

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0]?.transcript ?? '';
        }
        setInterim(text.trim());
      };
      rec.onerror = () => {};
      rec.start();
      recRef.current = rec;
      setInterim('');
    } catch {
      /* ignore — preview is best-effort */
    }
  }, []);

  const reset = useCallback(() => setInterim(''), []);

  useEffect(
    () => () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  return { supported, interim, start, stop, reset };
}
