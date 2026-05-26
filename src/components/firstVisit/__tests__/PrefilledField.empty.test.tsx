import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrefilledField } from '../PrefilledField';

describe('PrefilledField — empty', () => {
  it('renders empty input when no hub value', async () => {
    const onChange = vi.fn();
    render(
      <PrefilledField
        question={{
          question_key: 'wifi',
          area_key: 'a',
          label: 'WiFi',
          field_type: 'text',
          order: 1,
        }}
        hubValue={undefined}
        value=""
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText('WiFi')).toHaveValue('');
    expect(screen.queryByText(/Pre-filled/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Accept/i })).toBeNull();
    await userEvent.type(screen.getByLabelText('WiFi'), 'foo');
    expect(onChange).toHaveBeenCalled();
  });
});
