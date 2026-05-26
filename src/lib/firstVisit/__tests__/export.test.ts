import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { localDb } from '../db';
import { exportInspection } from '../export';

describe('exportInspection', () => {
  it('produces a zip containing answers.csv and manifest.json', async () => {
    await localDb.inspections.clear();
    await localDb.answers.clear();
    await localDb.media.clear();
    await localDb.inspections.put({
      id: 'i', deal_id: 'd', status: 'draft',
      inspector_email: 'a@arbio.com', started_at: '2026-05-22T00:00:00Z',
    });
    await localDb.answers.put({
      id: 'a', inspection_id: 'i', question_key: 'q', area_key: 'r',
      value: 'v', was_prefilled: false, was_accepted_as_is: false,
      created_at: '', updated_at: '',
    });
    const blob = await exportInspection('i');
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file('answers.csv')).not.toBeNull();
    expect(zip.file('manifest.json')).not.toBeNull();
    const csv = await zip.file('answers.csv')!.async('string');
    expect(csv).toContain('q,r,v');
  });
});
