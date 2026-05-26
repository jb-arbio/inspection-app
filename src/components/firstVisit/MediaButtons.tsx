'use client';
import { useRef } from 'react';
import { useMediaCapture } from '@/lib/firstVisit/useMediaCapture';

export function MediaButtons({
  inspectionId, areaKey, questionKey, answerId,
}: {
  inspectionId: string; areaKey: string; questionKey?: string; answerId?: string;
}) {
  const { persist } = useMediaCapture(inspectionId);
  const photoCaptureRef = useRef<HTMLInputElement>(null);
  const photoUploadRef = useRef<HTMLInputElement>(null);
  const videoCaptureRef = useRef<HTMLInputElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);

  const onPick = async (kind: 'photo'|'video', file: File | undefined) => {
    if (!file) return;
    await persist(file, kind, { area_key: areaKey, question_key: questionKey, answer_id: answerId });
  };

  const btn =
    'rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50';

  return (
    <div className="flex flex-wrap gap-2">
      {/* Photo */}
      <button type="button" onClick={() => photoCaptureRef.current?.click()} className={btn}>
        📷 Capture photo
      </button>
      <input
        ref={photoCaptureRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onPick('photo', e.target.files?.[0])}
      />
      <button type="button" onClick={() => photoUploadRef.current?.click()} className={btn}>
        📁 Upload photo
      </button>
      <input
        ref={photoUploadRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => onPick('photo', e.target.files?.[0])}
      />

      {/* Video */}
      <button type="button" onClick={() => videoCaptureRef.current?.click()} className={btn}>
        🎥 Capture video
      </button>
      <input
        ref={videoCaptureRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onPick('video', e.target.files?.[0])}
      />
      <button type="button" onClick={() => videoUploadRef.current?.click()} className={btn}>
        📁 Upload video
      </button>
      <input
        ref={videoUploadRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => onPick('video', e.target.files?.[0])}
      />
    </div>
  );
}
