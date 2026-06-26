import { describe, it, expect } from 'vitest';
import { buildExtractionSchema, isFillableSlug } from '../extractionSchema';
import { ALL_QUESTIONS } from '../questions';
import type { FirstVisitQuestion } from '../questions';

describe('buildExtractionSchema', () => {
  const built = buildExtractionSchema([
    'fv_location_quality', // single select
    'issue_name', // repeater text
    'issue_type', // repeater select w/ options
    'issue_media', // repeater file → excluded
    'totally_unknown_slug', // unknown → excluded
  ]);

  it('partitions singles vs repeater groups and drops file/unknown slugs', () => {
    expect(built.singleSlugs).toEqual(['fv_location_quality']);
    expect(built.groupSlugsByGroup.issue).toEqual(['issue_name', 'issue_type']);
    expect(built.groupSlugsByGroup.issue).not.toContain('issue_media');
  });

  it('constrains a select field to exactly its options plus null', () => {
    const schema = built.schema as any;
    const catEntry = schema.properties.items.items.properties.fields.properties.issue_type;
    expect(catEntry.properties.value.enum).toEqual([
      'Furniture', 'Equipment', 'Maintenance', 'Other', null,
    ]);
  });

  it('lists targeted groups in the item group_id enum', () => {
    const schema = built.schema as any;
    expect(schema.properties.items.items.properties.group_id.enum).toEqual(['issue']);
  });

  it('includes a field\'s description in the catalogue when it has one', () => {
    const withDesc = ALL_QUESTIONS.find(
      (q) => q.type !== 'file' && !!q.description?.trim(),
    );
    if (!withDesc) return; // no descriptions survive the transform pipeline — skip
    const { catalogue } = buildExtractionSchema([withDesc.slug]);
    expect(catalogue).toContain(withDesc.description!.trim());
  });

  it('marks media (file) slugs as not fillable', () => {
    expect(isFillableSlug('issue_media')).toBe(false);
    expect(isFillableSlug('issue_name')).toBe(true);
    expect(isFillableSlug('totally_unknown_slug')).toBe(false);
  });

  it('builds the schema against an injected question set, not the global config', () => {
    const customQ: FirstVisitQuestion = {
      slug: 'injected_custom_single',
      label: 'Injected custom single',
      description: null,
      scope: 'location',
      mode: 'observe',
      type: 'select',
      options: ['Alpha', 'Beta'],
      required: true,
      repeater: false,
      pms_target: null,
      status: 'existing',
      verdict: null,
      notes: null,
      phase_id: 'custom_phase',
      phase_label: 'Custom phase',
    };

    const built = buildExtractionSchema(
      ['injected_custom_single', 'fv_location_quality'],
      [customQ],
    );
    const schema = built.schema as any;

    // The custom slug is present and constrained to its custom options.
    expect(built.singleSlugs).toEqual(['injected_custom_single']);
    expect(
      schema.properties.singles.properties.injected_custom_single.properties.value.enum,
    ).toEqual(['Alpha', 'Beta', null]);

    // A real global slug NOT in the injected set is dropped (treated as unknown),
    // proving the injected questions array — not ALL_QUESTIONS — was used.
    expect(built.singleSlugs).not.toContain('fv_location_quality');
    expect(schema.properties.singles.properties.fv_location_quality).toBeUndefined();
  });
});
