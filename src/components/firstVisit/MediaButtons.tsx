'use client';
import { useRef } from 'react';
import { useMediaCapture } from '@/lib/firstVisit/useMediaCapture';
import type { FirstVisitQuestion } from '@/lib/firstVisit/questions';

type MediaKind = 'photo' | 'video';

export function MediaButtons({
  inspectionId,
  areaKey,
  questionKey,
  answerId,
  evidence,
}: {
  inspectionId: string;
  areaKey: string;
  questionKey?: string;
  answerId?: string;
  evidence?: FirstVisitQuestion['evidence'];
}) {
  const { persist } = useMediaCapture(inspectionId);

  const onPick = async (kind: MediaKind, file: File | undefined) => {
    if (!file) return;
    await persist(file, kind, { area_key: areaKey, question_key: questionKey, answer_id: answerId });
  };

  const kinds: MediaKind[] = [];
  if (evidence?.photo) kinds.push('photo');
  if (evidence?.video) kinds.push('video');
  if (kinds.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {kinds.map((kind) => (
        <MediaRow
          key={kind}
          kind={kind}
          required={evidence?.[kind] === 'required'}
          onPick={(f) => onPick(kind, f)}
        />
      ))}
    </div>
  );
}

function MediaRow({
  kind,
  required,
  onPick,
}: {
  kind: MediaKind;
  required: boolean;
  onPick: (file: File | undefined) => void;
}) {
  const captureRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const accept = kind === 'photo' ? 'image/*' : 'video/*';
  const captureLabel = kind === 'photo' ? '📷 Take photo' : '🎥 Record video';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => captureRef.current?.click()}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
      >
        {captureLabel}
      </button>
      {required && <span className="text-[10px] uppercase text-red-500">required</span>}

      {/* small, secondary upload affordance */}
      <button
        type="button"
        onClick={() => uploadRef.current?.click()}
        title={`Upload ${kind} from device`}
        aria-label={`Upload ${kind} from device`}
        className="ml-auto rounded p-1 text-gray-400 hover:text-gray-700"
      >
        ⤓
      </button>

      <input
        ref={captureRef}
        type="file"
        accept={accept}
        capture="environment"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <input
        ref={uploadRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </div>
  );
}
