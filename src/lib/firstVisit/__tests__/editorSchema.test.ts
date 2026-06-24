import { describe, it, expect } from 'vitest';
import {
  questionEditorSchema,
  type QuestionEditorValues,
} from '../editorSchema';

// A minimal valid text question we can spread + tweak per case.
const baseText: QuestionEditorValues = {
  slug: 'fv_some_field',
  label: 'Some field',
  description: null,
  type: 'text',
  scope: 'unit_category',
  options: [],
  required: true,
  phase_id: 'phase_1',
  phase_label: 'Phase 1',
};

describe('questionEditorSchema', () => {
  it('accepts a valid text question', () => {
    const result = questionEditorSchema.safeParse(baseText);
    expect(result.success).toBe(true);
  });

  it('accepts a camelCase dotted slug', () => {
    const result = questionEditorSchema.safeParse({
      ...baseText,
      slug: 'appliance.availabilityType',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid select question with options', () => {
    const result = questionEditorSchema.safeParse({
      ...baseText,
      type: 'select',
      options: ['Yes', 'No'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a select question with empty options (options path)', () => {
    const result = questionEditorSchema.safeParse({
      ...baseText,
      type: 'select',
      options: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('options');
    }
  });

  it('rejects a multi_select text question with empty options (options path)', () => {
    const result = questionEditorSchema.safeParse({
      ...baseText,
      type: 'text',
      multi_select: true,
      options: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('options');
    }
  });

  it('accepts a multi_select question that has options', () => {
    const result = questionEditorSchema.safeParse({
      ...baseText,
      multi_select: true,
      options: ['A', 'B'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed slug', () => {
    const result = questionEditorSchema.safeParse({
      ...baseText,
      slug: 'Bad Slug!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('slug');
    }
  });

  it('rejects an empty label', () => {
    const result = questionEditorSchema.safeParse({ ...baseText, label: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('label');
    }
  });

  it('rejects an unknown field type', () => {
    const result = questionEditorSchema.safeParse({
      ...baseText,
      type: 'rainbow',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('type');
    }
  });

  it('rejects an unknown scope', () => {
    const result = questionEditorSchema.safeParse({
      ...baseText,
      scope: 'galaxy',
    });
    expect(result.success).toBe(false);
  });
});
