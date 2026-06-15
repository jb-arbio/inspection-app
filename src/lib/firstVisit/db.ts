import Dexie, { type Table } from 'dexie';
import type { HubScope } from './resolveScope';

export type LocalInspection = {
  id: string;
  deal_id: string;
  status: 'draft' | 'submitted' | 'discarded';
  inspector_email: string;
  started_at: string;
  submitted_at?: string;
  synced_at?: string;
};

// A node in the visit tree: a property (location) or a unit (unit_category).
// Units are children of properties (parent_id points at the property target).
export type LocalTarget = {
  id: string;
  inspection_id: string;
  kind: 'property' | 'unit';
  parent_id?: string; // property target id, for units
  location_id?: string; // hub location id (property)
  unit_category_id?: string; // hub unit_category id (unit)
  label: string;
  created_on_site: boolean; // true if staff added it (not from hub)
  order: number;
};

export type LocalAnswer = {
  id: string;
  inspection_id: string;
  // Which tree node this answer belongs to. Deal-scoped answers use the
  // sentinel target_id === inspection_id (the visit root).
  target_id: string;
  scope: HubScope;
  location_id?: string;
  unit_category_id?: string;
  question_key: string;
  area_key: string;
  // Block-repeater coordinate. When a question belongs to a UI group that the
  // inspector can instantiate multiple times (check-in steps, equipment
  // issues, etc.), step_index disambiguates the rows. Single-instance
  // questions leave it null/undefined. Added in Dexie v3 for Refactor Phase 2.
  step_index?: number | null;
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
  target_id: string;
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
  kind:
    | 'inspection_upsert'
    | 'target_upsert'
    | 'target_delete'
    | 'answer_upsert'
    | 'media_upload'
    | 'media_metadata'
    | 'media_delete'
    | 'submit'
    | 'discard';
  payload: unknown;
  created_at: number;
  attempts: number;
  last_error?: string;
  last_attempt_at?: number;
};

class FirstVisitDexie extends Dexie {
  inspections!: Table<LocalInspection, string>;
  targets!: Table<LocalTarget, string>;
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
    // v2 — visit tree: targets table + answers/media scoped by target_id.
    this.version(2).stores({
      inspections: 'id, deal_id, status, synced_at',
      targets: 'id, inspection_id, parent_id, kind',
      answers:
        'id, inspection_id, target_id, [target_id+question_key+area_key], synced_at',
      media: 'id, inspection_id, target_id, answer_id, verified_at',
      outbox: '++id, kind, created_at',
    });
    // v3 — block-repeater coordinate `step_index` on answers.
    // We KEEP the v2 compound index [target_id+question_key+area_key] so the
    // existing UnitSurvey lookups (and the answers-by-key map keyed on
    // `${target_id}::${area_key}::${question_key}`) continue to work without
    // changes. A SECOND compound index that includes step_index is added so
    // repeater-aware queries (per-group, per-step) can be answered without a
    // full scan. Existing rows have step_index === undefined; Dexie treats
    // them as absent from the new index, which is what we want — they are
    // single-instance answers.
    this.version(3).stores({
      inspections: 'id, deal_id, status, synced_at',
      targets: 'id, inspection_id, parent_id, kind',
      answers:
        'id, inspection_id, target_id, [target_id+question_key+area_key], [target_id+area_key+question_key+step_index], synced_at',
      media: 'id, inspection_id, target_id, answer_id, verified_at',
      outbox: '++id, kind, created_at',
    });
  }
}

export const localDb = new FirstVisitDexie();
