import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrefilledField } from '../PrefilledField';

describe('PrefilledField — field types', () => {
  it('number renders a numeric input', () => {
    render(
      <PrefilledField
        question={{ question_key: 'q', area_key: 'a', label: 'Count', field_type: 'number', order: 1 }}
        hubValue={undefined}
        value={3}
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText('Count') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.value).toBe('3');
  });

  it('select renders option list', async () => {
    render(
      <PrefilledField
        question={{
          question_key: 'q',
          area_key: 'a',
          label: 'Type',
          field_type: 'select',
          choices: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
          order: 1,
        }}
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
        question={{ question_key: 'q', area_key: 'a', label: 'Working', field_type: 'boolean', order: 1 }}
        hubValue={undefined}
        value={false}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Yes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /No/i })).toBeInTheDocument();
  });
});
