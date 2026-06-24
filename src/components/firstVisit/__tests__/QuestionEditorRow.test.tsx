import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionEditorRow } from '../QuestionEditorRow';
import type { ContentQuestion } from '@/lib/firstVisit/surveyConfig';

function makeQuestion(overrides: Partial<ContentQuestion> = {}): ContentQuestion {
  return {
    slug: 'fv_demo',
    label: 'Demo label',
    description: null,
    scope: 'unit_category',
    type: 'text',
    options: [],
    required: false,
    phase_id: 'p1',
    phase_label: 'Phase 1',
    ...overrides,
  };
}

describe('QuestionEditorRow', () => {
  it('fires onChange with the new label when editing the label', () => {
    const onChange = vi.fn();
    render(<QuestionEditorRow question={makeQuestion()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Label'), {
      target: { value: 'Updated' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Updated' }),
    );
  });

  it('fires onChange when choosing a different type', () => {
    const onChange = vi.fn();
    render(<QuestionEditorRow question={makeQuestion()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'number' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'number' }),
    );
  });

  it('renders, adds and removes options for a select question', () => {
    const onChange = vi.fn();
    const q = makeQuestion({ type: 'select', options: ['A', 'B'] });
    render(<QuestionEditorRow question={q} onChange={onChange} />);

    // existing options render
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();

    // Add appends one
    fireEvent.change(screen.getByLabelText('New option'), {
      target: { value: 'C' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ options: ['A', 'B', 'C'] }),
    );

    // remove drops one
    fireEvent.click(screen.getByRole('button', { name: 'Remove option A' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ options: ['B'] }),
    );
  });

  it('shows an inline error + invalid for an empty-options select, then clears', () => {
    const onValidityChange = vi.fn();
    const onChange = vi.fn();
    const q = makeQuestion({ type: 'select', options: [] });
    const { rerender } = render(
      <QuestionEditorRow
        question={q}
        onChange={onChange}
        onValidityChange={onValidityChange}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    // Simulate the parent applying the change: now there is one option.
    rerender(
      <QuestionEditorRow
        question={makeQuestion({ type: 'select', options: ['A'] })}
        onChange={onChange}
        onValidityChange={onValidityChange}
      />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('renders read-only overlay badges with no inputs for them', () => {
    render(
      <QuestionEditorRow
        question={makeQuestion()}
        overlay={{ group_id: 'finding', pms_target: 'profile.x' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('repeater: finding')).toBeInTheDocument();
    expect(screen.getByText('pms: profile.x')).toBeInTheDocument();
    // No editable control exists for these structural fields.
    expect(screen.queryByLabelText(/group/i)).toBeNull();
    expect(screen.queryByLabelText(/pms/i)).toBeNull();
  });
});
