import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConditionalFollowUp } from '../ConditionalFollowUp';
import { makeQuestion } from './_fixtures';

describe('ConditionalFollowUp', () => {
  it('renders nothing when the question has no follow_up config', () => {
    const q = makeQuestion();
    render(
      <ConditionalFollowUp
        question={q}
        parentValue={true}
        followUpValue={undefined}
        onFollowUpChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('hidden when parentValue does not match when_value', () => {
    const q = makeQuestion({
      follow_up: { when_value: true, label: 'Where?', type: 'text' },
    });
    render(
      <ConditionalFollowUp
        question={q}
        parentValue={false}
        followUpValue={undefined}
        onFollowUpChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('visible and functional when parentValue matches when_value', async () => {
    const onChange = vi.fn();
    const q = makeQuestion({
      follow_up: { when_value: true, label: 'Where?', type: 'text' },
    });
    render(
      <ConditionalFollowUp
        question={q}
        parentValue={true}
        followUpValue=""
        onFollowUpChange={onChange}
      />,
    );
    expect(screen.getByLabelText(/Where\?/)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Where\?/), 'A');
    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('matches when when_value is in a multi-select array', () => {
    const q = makeQuestion({
      follow_up: { when_value: 'Other', label: 'Please specify', type: 'text' },
    });
    render(
      <ConditionalFollowUp
        question={q}
        parentValue={['Wifi', 'Other']}
        followUpValue=""
        onFollowUpChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Please specify/)).toBeInTheDocument();
  });
});
