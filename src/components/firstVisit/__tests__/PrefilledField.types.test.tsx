import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrefilledField } from '../PrefilledField';
import { makeQuestion } from './_fixtures';

describe('PrefilledField — field types', () => {
  it('number renders a numeric input', () => {
    render(
      <PrefilledField
        question={makeQuestion({ label: 'Count', type: 'number' })}
        hubValue={undefined}
        value={3}
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText('Count') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.value).toBe('3');
  });

  it('select renders option list', () => {
    render(
      <PrefilledField
        question={makeQuestion({ label: 'Type', type: 'select', options: ['A', 'B'] })}
        hubValue={undefined}
        value=""
        onChange={() => {}}
      />,
    );
    const sel = screen.getByLabelText('Type') as HTMLSelectElement;
    expect(sel.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'A' })).toBeInTheDocument();
  });

  it('boolean renders yes/no toggle', () => {
    render(
      <PrefilledField
        question={makeQuestion({ label: 'Working', type: 'boolean' })}
        hubValue={undefined}
        value={false}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Yes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /No/i })).toBeInTheDocument();
  });

  it('scale renders a segmented button per option', () => {
    render(
      <PrefilledField
        question={makeQuestion({
          label: 'Cleanliness',
          type: 'scale',
          options: ['Good', 'Acceptable', 'Poor'],
        })}
        hubValue={undefined}
        value="Acceptable"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acceptable' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Poor' })).toBeInTheDocument();
    // label/htmlFor target stays resolvable
    expect(screen.getByLabelText('Cleanliness')).toBeInTheDocument();
  });

  it('date renders a date input', () => {
    render(
      <PrefilledField
        question={makeQuestion({ label: 'Visit date', type: 'date' })}
        hubValue={undefined}
        value=""
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText('Visit date') as HTMLInputElement;
    expect(input.type).toBe('date');
  });

});
