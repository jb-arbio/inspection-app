import { localDb } from './db';
import type { JobHandlers } from './sync';

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${await res.text()}`);
  return res.json();
}

export function createHandlers(): JobHandlers {
  return {
    inspection_upsert: async (p) => {
      await postJSON('/api/first-visit/inspections', p);
    },
    target_upsert: async (p) => {
      await postJSON('/api/first-visit/targets', p);
    },
    target_delete: async () => {
      // TODO: Hub-side deletion of target/location/unit_category rows. For now
      // we only remove from Dexie locally; the server is a no-op so the job
      // simply succeeds and is dropped from the outbox.
    },
    answer_upsert: async (p) => {
      // Only forward step_index when it is meaningfully set (non-null /
      // non-undefined). Keeping the wire payload minimal means existing
      // single-instance answers don't gain a noisy null column over the
      // network and the API route can still accept the field when present.
      const src = p as Record<string, unknown>;
      const body: Record<string, unknown> = { ...src };
      if (src.step_index === null || src.step_index === undefined) {
        delete body.step_index;
      }
      await postJSON('/api/first-visit/answers', body);
      const a = p as { id: string };
      await localDb.answers.update(a.id, { synced_at: new Date().toISOString() });
    },
    media_upload: async (p) => {
      const { media_id, inspection_id, kind, content_hash, size_bytes } = p as {
        media_id: string;
        inspection_id: string;
        kind: 'photo' | 'video' | 'audio';
        content_hash: string;
        size_bytes: number;
      };
      const local = await localDb.media.get(media_id);
      if (!local) return;
      const { signed_url, storage_path } = await postJSON(
        '/api/first-visit/media/upload-url',
        { inspection_id, kind, content_hash },
      );
      const put = await fetch(signed_url, { method: 'PUT', body: local.blob });
      if (!put.ok) throw new Error(`PUT failed ${put.status}`);
      await postJSON('/api/first-visit/media', {
        id: media_id,
        inspection_id,
        target_id: local.target_id,
        answer_id: local.answer_id,
        area_key: local.area_key,
        question_key: local.question_key,
        kind,
        storage_path,
        content_hash,
        size_bytes,
        captured_at: local.captured_at,
      });
      await localDb.media.update(media_id, {
        uploaded_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      });
    },
    media_metadata: async () => {
      /* handled inside media_upload */
    },
    media_delete: async (p) => {
      const { id } = p as { id: string };
      const res = await fetch(
        `/api/first-visit/media?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        throw new Error(
          `/api/first-visit/media DELETE -> ${res.status} ${await res.text()}`,
        );
      }
    },
    submit: async (p) => {
      await postJSON('/api/first-visit/submit', p);
    },
    discard: async () => {
      /* future */
    },
  };
}
