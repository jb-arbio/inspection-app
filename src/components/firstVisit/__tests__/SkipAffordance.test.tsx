import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkipAffordance } from '../SkipAffordance';
import { makeQuestion } from './_fixtures';

describe('SkipAffordance', () => {
  it('renders nothing when question is not required', () => {
    const { container } = render(
      <SkipAffordance
        question={makeQuestion({ required: false })}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the value is already a skip sentinel', () => {
    const { container } = render(
      <SkipAffordance
        question={makeQuestion({ required: true })}
        value={{ __skipped: true, reason: 'X' }}
        onChange={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the "Mark as N/A" trigger for required questions', () => {
    render(
      <SkipAffordance
        question={makeQuestion({ required: true })}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Mark as N\/A/i }),
    ).toBeInTheDocument();
  });

  it('opens the reason picker on click and emits the skip sentinel when a common reason is tapped', async () => {
    const onChange = vi.fn();
    render(
      <SkipAffordance
        question={makeQuestion({ required: true })}
        value={null}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Mark as N\/A/i }));
    // One of the predefined common reasons is "Owner not present".
    const reasonBtn = screen.getByRole('button', { name: /Owner not present/i });
    await userEvent.click(reasonBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      value: { __skipped: true, reason: 'Owner not present' },
      wasAcceptedAsIs: false,
    });
  });
});
