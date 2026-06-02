import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrefilledField } from '../PrefilledField';
import { makeQuestion } from './_fixtures';

describe('PrefilledField — skipped rendering', () => {
  const q = makeQuestion({
    slug: 'wifi',
    label: 'WiFi name',
    type: 'text',
    required: true,
  });

  it('renders the strike-through label, N/A pill, and reason text', () => {
    render(
      <PrefilledField
        question={q}
        hubValue={undefined}
        value={{ __skipped: true, reason: 'Locked door' }}
        onChange={() => {}}
      />,
    );
    const label = screen.getByText('WiFi name');
    expect(label).toBeInTheDocument();
    // strike-through is via the line-through class
    expect(label.className).toMatch(/line-through/);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText(/Locked door/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Undo/i })).toBeInTheDocument();
  });

  it('does not render the editable input when skipped', () => {
    render(
      <PrefilledField
        question={q}
        hubValue={undefined}
        value={{ __skipped: true, reason: 'Locked door' }}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByLabelText('WiFi name')).toBeNull();
  });

  it('Undo calls onChange with value=null and wasAcceptedAsIs=false', async () => {
    const onChange = vi.fn();
    render(
      <PrefilledField
        question={q}
        hubValue={undefined}
        value={{ __skipped: true, reason: 'Locked door' }}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Undo/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ value: null, wasAcceptedAsIs: false });
  });

  it('renders the N/A pill without a reason when none is provided', () => {
    render(
      <PrefilledField
        question={q}
        hubValue={undefined}
        value={{ __skipped: true }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Undo/i })).toBeInTheDocument();
  });
});
