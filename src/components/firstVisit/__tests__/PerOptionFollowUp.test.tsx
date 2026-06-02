import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PerOptionFollowUp } from '../PerOptionFollowUp';
import { makeQuestion } from './_fixtures';

describe('PerOptionFollowUp', () => {
  it('renders nothing when no per_option_follow_up config', () => {
    const q = makeQuestion();
    const { container } = render(
      <PerOptionFollowUp
        question={q}
        selectedOptions={['Wifi']}
        perOptionValues={{}}
        onPerOptionChange={vi.fn()}
      />,
    );
    expect(container.querySelectorAll('input').length).toBe(0);
  });

  it('renders one input per selected option with templated labels', () => {
    const q = makeQuestion({
      slug: 'extras',
      per_option_follow_up: {
        label_template: "How can guests book '{option}'?",
        type: 'text',
      },
    });
    render(
      <PerOptionFollowUp
        question={q}
        selectedOptions={['Parking', 'Sauna']}
        perOptionValues={{ Parking: 'On request' }}
        onPerOptionChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/How can guests book 'Parking'/)).toBeInTheDocument();
    expect(screen.getByLabelText(/How can guests book 'Sauna'/)).toBeInTheDocument();
    const parkingInput = screen.getByLabelText(
      /How can guests book 'Parking'/,
    ) as HTMLInputElement;
    expect(parkingInput.value).toBe('On request');
  });

  it('a deselected option no longer renders its input', () => {
    const q = makeQuestion({
      per_option_follow_up: { label_template: 'For {option}', type: 'text' },
    });
    const { rerender } = render(
      <PerOptionFollowUp
        question={q}
        selectedOptions={['Parking', 'Sauna']}
        perOptionValues={{}}
        onPerOptionChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('For Sauna')).toBeInTheDocument();
    rerender(
      <PerOptionFollowUp
        question={q}
        selectedOptions={['Parking']}
        perOptionValues={{}}
        onPerOptionChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('For Sauna')).toBeNull();
    expect(screen.getByLabelText('For Parking')).toBeInTheDocument();
  });
});
