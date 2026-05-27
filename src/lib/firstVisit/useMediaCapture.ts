'use client';
import { useCallback } from 'react';
import { localDb } from './db';
import { enqueue } from './sync';
import { track } from './analytics';

export async function sha256(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function useMediaCapture(inspectionId: string) {
  const persist = useCallback(
    async (blob: Blob, kind: 'photo'|'video'|'audio', meta: { target_id: string; area_key: string; question_key?: string; answer_id?: string }) => {
      const id = crypto.randomUUID();
      const content_hash = await sha256(blob);
      await localDb.media.put({
        id,
        inspection_id: inspectionId,
        target_id: meta.target_id,
        answer_id: meta.answer_id,
        area_key: meta.area_key,
        question_key: meta.question_key,
        kind,
        blob,
        content_hash,
        size_bytes: blob.size,
        captured_at: new Date().toISOString(),
      });
      track('media_captured', { kind, inspection_id: inspectionId });
      await enqueue('media_upload', {
        media_id: id, inspection_id: inspectionId, kind, content_hash, size_bytes: blob.size,
      });
      return id;
    },
    [inspectionId],
  );
  return { persist };
}
