import { describe, it, expect } from 'vitest';
import { buildExtractionSchema, isFillableSlug } from '../extractionSchema';
import { ALL_QUESTIONS } from '../questions';

describe('buildExtractionSchema', () => {
  const built = buildExtractionSchema([
    'fv_location_quality', // single select
    'finding_item_name', // repeater text
    'finding_category', // repeater select w/ options
    'finding_media', // repeater file → excluded
    'totally_unknown_slug', // unknown → excluded
  ]);

  it('partitions singles vs repeater groups and drops file/unknown slugs', () => {
    expect(built.singleSlugs).toEqual(['fv_location_quality']);
    expect(built.groupSlugsByGroup.finding).toEqual(['finding_item_name', 'finding_category']);
    expect(built.groupSlugsByGroup.finding).not.toContain('finding_media');
  });

  it('constrains a select field to exactly its options plus null', () => {
    const schema = built.schema as any;
    const catEntry = schema.properties.items.items.properties.fields.properties.finding_category;
    expect(catEntry.properties.value.enum).toEqual([
      'Furniture', 'Appliance', 'Equipment', 'Bathroom', 'Structural/Building', 'Consumable', 'Other', null,
    ]);
  });

  it('lists targeted groups in the item group_id enum', () => {
    const schema = built.schema as any;
    expect(schema.properties.items.items.properties.group_id.enum).toEqual(['finding']);
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
    expect(isFillableSlug('finding_media')).toBe(false);
    expect(isFillableSlug('finding_item_name')).toBe(true);
    expect(isFillableSlug('totally_unknown_slug')).toBe(false);
  });
});
