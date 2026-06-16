import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScaleField } from '../ScaleField';
import { makeQuestion } from './_fixtures';

const OPTIONS = ['Low', 'Medium', 'High'];

describe('ScaleField', () => {
  it('renders one button per option', () => {
    render(
      <ScaleField
        question={makeQuestion({ label: 'Rating', type: 'scale', options: OPTIONS })}
        value={null}
        onChange={() => {}}
      />,
    );
    for (const opt of OPTIONS) {
      expect(screen.getByRole('button', { name: opt })).toBeInTheDocument();
    }
  });

  it('calls onChange with the clicked option and reflects aria-pressed', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ScaleField
        question={makeQuestion({ label: 'Rating', type: 'scale', options: OPTIONS })}
        value={null}
        onChange={onChange}
      />,
    );
    const mid = screen.getByRole('button', { name: 'Medium' });
    fireEvent.click(mid);
    expect(onChange).toHaveBeenCalledWith({ value: 'Medium', wasAcceptedAsIs: false });

    // Re-render with the selection applied; aria-pressed should follow value.
    rerender(
      <ScaleField
        question={makeQuestion({ label: 'Rating', type: 'scale', options: OPTIONS })}
        value="Medium"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Low' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps selection when an already-selected option is clicked (no toggle-off)', () => {
    const onChange = vi.fn();
    render(
      <ScaleField
        question={makeQuestion({ label: 'Rating', type: 'scale', options: OPTIONS })}
        value="High"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'High' }));
    // Select semantics: re-selecting sets the same value, never clears it.
    expect(onChange).toHaveBeenCalledWith({ value: 'High', wasAcceptedAsIs: false });
  });

  it('exposes a label-resolvable hidden input', () => {
    render(
      <ScaleField
        question={makeQuestion({ slug: 'rate_it', label: 'Rate it', type: 'scale', options: OPTIONS })}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('Rate it')).toBeInTheDocument();
  });
});
