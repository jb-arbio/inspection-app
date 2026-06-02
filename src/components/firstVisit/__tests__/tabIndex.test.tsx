import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrefilledField } from '../PrefilledField';
import { makeQuestion } from './_fixtures';

// WS-E: Tab traverses only inputs and the Yes/No boolean toggles. Every
// action button is removed from the tab order via tabIndex={-1}. These tests
// pin the contract for the most-touched widgets so a future "fix" doesn't
// silently restore default tab order on action buttons.

describe('Tab-index restriction (WS-E)', () => {
  it('Accept button on a pre-filled field is tabIndex=-1; input keeps default', () => {
    render(
      <PrefilledField
        question={makeQuestion({ slug: 'wifi', label: 'WiFi', type: 'text' })}
        hubValue="HelloRouter"
        value=""
        onChange={() => {}}
      />,
    );

    const accept = screen.getByRole('button', { name: /Accept/i });
    expect(accept.getAttribute('tabindex')).toBe('-1');

    // The actual text input is an input-surrogate and stays tabbable: no
    // tabindex attribute means the browser default (0) applies.
    const input = screen.getByLabelText('WiFi');
    expect(input.hasAttribute('tabindex')).toBe(false);
  });

  it('Yes/No buttons on boolean questions are NOT tabIndex=-1 (still tabbable)', () => {
    render(
      <PrefilledField
        question={makeQuestion({
          slug: 'has_wifi',
          label: 'Has WiFi',
          type: 'boolean',
        })}
        hubValue={undefined}
        value={null}
        onChange={() => {}}
      />,
    );

    const yes = screen.getByRole('button', { name: /^Yes$/ });
    const no = screen.getByRole('button', { name: /^No$/ });
    // Yes/No are input surrogates — they must stay in the natural tab order.
    expect(yes.getAttribute('tabindex')).not.toBe('-1');
    expect(no.getAttribute('tabindex')).not.toBe('-1');
  });
});
