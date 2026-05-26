import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrefilledField } from '../PrefilledField';

describe('PrefilledField — accept', () => {
  it('renders hub value as a "Pre-filled" badge with Accept', () => {
    render(
      <PrefilledField
        question={{
          question_key: 'wifi',
          area_key: 'a',
          label: 'WiFi',
          field_type: 'text',
          order: 1,
        }}
        hubValue="HelloRouter"
        value=""
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/Pre-filled/i)).toBeInTheDocument();
    expect(screen.getByText('HelloRouter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
  });

  it('calls onChange with wasAcceptedAsIs=true when Accept clicked', async () => {
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
        hubValue="HelloRouter"
        value=""
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Accept/i }));
    expect(onChange).toHaveBeenCalledWith({
      value: 'HelloRouter',
      wasAcceptedAsIs: true,
    });
  });

  it('typing a different value calls onChange with wasAcceptedAsIs=false', async () => {
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
        hubValue="HelloRouter"
        value=""
        onChange={onChange}
      />,
    );
    await userEvent.type(screen.getByLabelText('WiFi'), 'x');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ wasAcceptedAsIs: false }));
  });
});
