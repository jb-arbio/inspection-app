'use client';
import { useRef } from 'react';
import { useMediaCapture } from '@/lib/firstVisit/useMediaCapture';

export function MediaButtons({
  inspectionId, areaKey, questionKey, answerId,
}: {
  inspectionId: string; areaKey: string; questionKey?: string; answerId?: string;
}) {
  const { persist } = useMediaCapture(inspectionId);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const onPick = async (kind: 'photo'|'video', file: File | undefined) => {
    if (!file) return;
    await persist(file, kind, { area_key: areaKey, question_key: questionKey, answer_id: answerId });
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => photoRef.current?.click()}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      >
        📷 Photo
      </button>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onPick('photo', e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => videoRef.current?.click()}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      >
        🎥 Video
      </button>
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onPick('video', e.target.files?.[0])}
      />
    </div>
  );
}
