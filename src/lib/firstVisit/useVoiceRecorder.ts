'use client';
import { useRef, useState, useCallback } from 'react';

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const chunks = useRef<Blob[]>([]);
  const recorder = useRef<MediaRecorder | null>(null);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunks.current = [];
    r.ondataavailable = (e) => chunks.current.push(e.data);
    r.start();
    recorder.current = r;
    setRecording(true);
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const r = recorder.current;
    if (!r) return null;
    return new Promise((resolve) => {
      r.onstop = () => {
        setRecording(false);
        r.stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks.current, { type: 'audio/webm' }));
      };
      r.stop();
    });
  }, []);

  return { recording, start, stop };
}
