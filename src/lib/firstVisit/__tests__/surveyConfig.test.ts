import { describe, it, expect } from 'vitest';
import { buildSurveyConfig } from '../surveyConfig';
import type { ContentConfig, StructureOverlay } from '../surveyConfig';

const content: ContentConfig = {
  phases: [
    { id: '9d', label: 'Unit walkthrough', questions: [
      { slug: 'q_simple', label: 'Simple', description: null, scope: 'unit_category', type: 'text', options: [], required: true, phase_id: '9d', phase_label: 'Unit walkthrough' },
      { slug: 'finding_item_name', label: 'Item', description: null, scope: 'unit_category', type: 'text', options: [], required: true, phase_id: '9d', phase_label: 'Unit walkthrough' },
    ] },
  ],
};
const overlay: StructureOverlay = {
  finding_item_name: { group_id: 'finding', repeater: true, mode: 'observe', status: 'proposed' },
};

describe('buildSurveyConfig', () => {
  it('merges overlay onto content by slug and fills structural defaults', () => {
    const phases = buildSurveyConfig(content, overlay);
    const q = phases[0].questions.find((x) => x.slug === 'finding_item_name')!;
    expect(q.group_id).toBe('finding');
    expect(q.repeater).toBe(true);
    expect(q.mode).toBe('observe');
    const simple = phases[0].questions.find((x) => x.slug === 'q_simple')!;
    expect(simple.repeater).toBe(false);
    expect(simple.mode).toBe('data');
    expect(simple.pms_target).toBeNull();
  });
});
