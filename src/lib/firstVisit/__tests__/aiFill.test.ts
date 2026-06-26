import { describe, it, expect, beforeEach } from 'vitest';
import { writeAiSuggestions, acceptAiRows, maxStepIndexForGroup, isAiSnapshot, unwrapAiSnapshot } from '../aiFill';
import { localDb, type LocalAnswer } from '../db';
import type { ValidatedExtraction } from '../validateExtraction';

const base = {
  inspectionId: 'insp1',
  targetId: 'unit1',
  areaKey: '9d',
  scope: 'unit_category' as const,
  ctx: { unit_category_id: 'uc1' },
  groupSlugsByGroup: { finding: ['finding_item_name', 'finding_category', 'finding_cost_estimate_eur'] },
};

beforeEach(async () => {
  await localDb.answers.clear();
  await localDb.outbox.clear();
});

describe('writeAiSuggestions', () => {
  it('writes a single field as an unconfirmed AI suggestion', async () => {
    const extraction: ValidatedExtraction = {
      singles: { fv_furniture_status: { value: 'Mostly', confidence: 0.8 } },
      items: [],
      warnings: [],
    };
    const res = await writeAiSuggestions({ ...base, extraction, answers: {} });
    expect(res.singlesWritten).toBe(1);
    const row = res.writtenRows[0];
    expect(row.value).toBeNull();
    expect(row.was_prefilled).toBe(true);
    expect(row.was_accepted_as_is).toBe(false);
    expect(isAiSnapshot(row.hub_suggestion_snapshot)).toBe(true);
    expect(unwrapAiSnapshot(row.hub_suggestion_snapshot)).toBe('Mostly');
    // persisted + enqueued
    expect(await localDb.answers.count()).toBe(1);
    expect(await localDb.outbox.count()).toBe(1);
  });

  it('does not clobber an already-answered field', async () => {
    const answers: Record<string, LocalAnswer> = {
      'unit1::9d::fv_furniture_status': {
        id: 'x', inspection_id: 'insp1', target_id: 'unit1', scope: 'unit_category',
        question_key: 'fv_furniture_status', area_key: '9d', step_index: null,
        value: 'Yes fully', was_prefilled: false, was_accepted_as_is: true,
        created_at: 'now', updated_at: 'now',
      },
    };
    const extraction: ValidatedExtraction = {
      singles: { fv_furniture_status: { value: 'Mostly', confidence: 0.8 } }, items: [], warnings: [],
    };
    const res = await writeAiSuggestions({ ...base, extraction, answers });
    expect(res.singlesWritten).toBe(0);
  });

  it('appends repeater items at fresh step indices', async () => {
    const extraction: ValidatedExtraction = {
      singles: {},
      items: [
        { group_id: 'finding', fields: { finding_item_name: { value: 'Broken oven', confidence: 0.9 }, finding_category: { value: 'Appliance', confidence: 0.8 } } },
        { group_id: 'finding', fields: { finding_item_name: { value: 'Stained sofa', confidence: 0.7 } } },
      ],
      warnings: [],
    };
    const res = await writeAiSuggestions({ ...base, extraction, answers: {} });
    expect(res.itemsWritten).toBe(2);
    const steps = res.writtenRows.filter((r) => r.question_key === 'finding_item_name').map((r) => r.step_index).sort();
    expect(steps).toEqual([0, 1]);
  });

  it('acceptAiRows confirms suggestions into their snapshot value', async () => {
    const extraction: ValidatedExtraction = {
      singles: { fv_furniture_status: { value: 'Mostly', confidence: 0.8 } }, items: [], warnings: [],
    };
    const { writtenRows } = await writeAiSuggestions({ ...base, extraction, answers: {} });
    const updated = await acceptAiRows(writtenRows);
    expect(updated).toHaveLength(1);
    expect(updated[0].value).toBe('Mostly');
    expect(updated[0].was_accepted_as_is).toBe(true);
    // persisted
    const stored = await localDb.answers.get(updated[0].id);
    expect(stored?.value).toBe('Mostly');
  });

  it('allocates step_index above existing blocks', () => {
    const answers: Record<string, LocalAnswer> = {
      'unit1::9d::finding_item_name::0': {
        id: 'a', inspection_id: 'insp1', target_id: 'unit1', scope: 'unit_category',
        question_key: 'finding_item_name', area_key: '9d', step_index: 0,
        value: 'x', was_prefilled: false, was_accepted_as_is: false, created_at: 'n', updated_at: 'n',
      },
    };
    expect(maxStepIndexForGroup(answers, base.groupSlugsByGroup.finding, 'unit1', '9d')).toBe(0);
  });
});
