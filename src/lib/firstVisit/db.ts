import Dexie, { type Table } from 'dexie';

export type LocalInspection = {
  id: string;
  deal_id: string;
  location_id?: string;
  unit_category_id?: string;
  status: 'draft' | 'submitted' | 'discarded';
  inspector_email: string;
  started_at: string;
  submitted_at?: string;
  synced_at?: string;
};

export type LocalAnswer = {
  id: string;
  inspection_id: string;
  question_key: string;
  area_key: string;
  value: unknown;
  notes?: string;
  data_point_slug?: string;
  hub_suggestion_snapshot?: unknown;
  was_prefilled: boolean;
  was_accepted_as_is: boolean;
  created_at: string;
  updated_at: string;
  synced_at?: string;
};

export type LocalMedia = {
  id: string;
  inspection_id: string;
  answer_id?: string;
  area_key: string;
  question_key?: string;
  kind: 'photo' | 'video' | 'audio';
  blob: Blob;
  content_hash: string;
  size_bytes: number;
  captured_at: string;
  uploaded_at?: string;
  verified_at?: string;
};

export type OutboxJob = {
  id?: number;
  kind: 'inspection_upsert' | 'answer_upsert' | 'media_upload' | 'media_metadata' | 'submit' | 'discard';
  payload: unknown;
  created_at: number;
  attempts: number;
  last_error?: string;
  last_attempt_at?: number;
};

class FirstVisitDexie extends Dexie {
  inspections!: Table<LocalInspection, string>;
  answers!: Table<LocalAnswer, string>;
  media!: Table<LocalMedia, string>;
  outbox!: Table<OutboxJob, number>;

  constructor() {
    super('first_visit');
    this.version(1).stores({
      inspections: 'id, deal_id, status, synced_at',
      answers: 'id, inspection_id, [inspection_id+question_key+area_key], synced_at',
      media: 'id, inspection_id, answer_id, verified_at',
      outbox: '++id, kind, created_at',
    });
  }
}

export const localDb = new FirstVisitDexie();
