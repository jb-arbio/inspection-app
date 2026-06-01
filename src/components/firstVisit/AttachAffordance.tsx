'use client';
import { useEffect, useRef, useState } from 'react';
import { useMediaCapture } from '@/lib/firstVisit/useMediaCapture';
import { localDb } from '@/lib/firstVisit/db';

// Per-question "+ Attach" affordance: lets the inspector add a free-text note,
// a photo, or a video to any question. None are required. Photo/video reuse
// the same MediaCapture pipeline as type='file' questions. Note writes to the
// existing LocalAnswer.notes column via the parent's onNotesChange callback.

export function AttachAffordance({
  inspectionId,
  targetId,
  areaKey,
  questionKey,
  answerId,
  notes,
  onNotesChange,
}: {
  inspectionId: string;
  targetId: string;
  areaKey: string;
  questionKey?: string;
  answerId?: string;
  notes?: string;
  onNotesChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [mediaCount, setMediaCount] = useState(0);
  // Bumped by Dexie table hooks so the count effect re-runs when any sibling
  // (e.g. a type='file' MediaButtons) writes/deletes a media row.
  const [mediaRev, setMediaRev] = useState(0);

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const photoUploadRef = useRef<HTMLInputElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);
  const { persist } = useMediaCapture(inspectionId);

  // Subscribe to Dexie media-table writes so mediaCount auto-refreshes when a
  // sibling component mutates the table. Avoids adding dexie-react-hooks.
  useEffect(() => {
    const bump = () => setMediaRev((r) => r + 1);
    localDb.media.hook('creating', bump);
    localDb.media.hook('deleting', bump);
    return () => {
      localDb.media.hook('creating').unsubscribe(bump);
      localDb.media.hook('deleting').unsubscribe(bump);
    };
  }, []);

  // Count any media already attached to this question for a "2 attached" cue.
  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await localDb.media
        .where('inspection_id')
        .equals(inspectionId)
        .toArray();
      if (!alive) return;
      const n = all.filter(
        (m) =>
          m.target_id === targetId &&
          m.area_key === areaKey &&
          (questionKey ? m.question_key === questionKey : true),
      ).length;
      setMediaCount(n);
    })();
    return () => {
      alive = false;
    };
  }, [inspectionId, targetId, areaKey, questionKey, mediaRev]);

  const onPick = async (kind: 'photo' | 'video', file: File | undefined) => {
    if (!file) return;
    await persist(file, kind, {
      target_id: targetId,
      area_key: areaKey,
      question_key: questionKey,
      answer_id: answerId,
    });
    setMediaCount((n) => n + 1);
  };

  const hasNote = (notes ?? '').trim().length > 0;
  const summaryCount = mediaCount + (hasNote ? 1 : 0);

  if (!open && !hasNote && mediaCount === 0) {
    return (
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen(true)}
        className="self-start text-[11px] text-gray-400 underline-offset-2 hover:text-gray-700 hover:underline"
      >
        + Attach note, photo, or video
      </button>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-700">
          Attachments {summaryCount > 0 && <span className="text-gray-500">· {summaryCount}</span>}
        </span>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] text-gray-400 hover:text-gray-700"
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {(open || hasNote) && (
        <div className="flex flex-col gap-1">
          {(hasNote || showNote) && (
            <textarea
              value={notes ?? ''}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Note (optional)"
              rows={2}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowNote((v) => !v)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs hover:bg-gray-100"
            >
              📝 {showNote || hasNote ? 'Hide note' : 'Note'}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => photoRef.current?.click()}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs hover:bg-gray-100"
            >
              📷 Photo
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => videoRef.current?.click()}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs hover:bg-gray-100"
            >
              🎥 Video
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => photoUploadRef.current?.click()}
              title="Upload photo from device"
              className="rounded p-2 text-xs text-gray-400 hover:text-gray-700"
            >
              ⤓ photo
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => videoUploadRef.current?.click()}
              title="Upload video from device"
              className="rounded p-2 text-xs text-gray-400 hover:text-gray-700"
            >
              ⤓ video
            </button>
          </div>
          {mediaCount > 0 && (
            <p className="text-[11px] text-gray-500">
              {mediaCount} file{mediaCount === 1 ? '' : 's'} attached.
            </p>
          )}
        </div>
      )}

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onPick('photo', e.target.files?.[0])}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onPick('video', e.target.files?.[0])}
      />
      <input
        ref={photoUploadRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => onPick('photo', e.target.files?.[0])}
      />
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
