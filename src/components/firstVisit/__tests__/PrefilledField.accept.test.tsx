import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrefilledField } from '../PrefilledField';
import { makeQuestion } from './_fixtures';

describe('PrefilledField — accept', () => {
  const wifi = makeQuestion({ slug: 'wifi', label: 'WiFi', type: 'text' });

  it('renders hub value as a "Pre-filled" badge with Accept', () => {
    render(
      <PrefilledField
        question={wifi}
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
        question={wifi}
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

  it('hides the Pre-filled banner once the field has a value (accepted/edited)', () => {
    render(
      <PrefilledField
        question={wifi}
        hubValue="HelloRouter"
        value="HelloRouter"
        onChange={() => {}}
      />,
    );
    expect(screen.queryByText(/Pre-filled/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accept/i })).not.toBeInTheDocument();
  });

  it('typing a different value calls onChange with wasAcceptedAsIs=false', async () => {
    const onChange = vi.fn();
    render(
      <PrefilledField
        question={wifi}
        hubValue="HelloRouter"
        value=""
        onChange={onChange}
      />,
    );
    await userEvent.type(screen.getByLabelText('WiFi'), 'x');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ wasAcceptedAsIs: false }));
  });
});
