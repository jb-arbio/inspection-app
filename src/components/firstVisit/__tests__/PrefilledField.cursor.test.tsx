import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrefilledField } from '../PrefilledField';
import { makeQuestion } from './_fixtures';

// Harness that mimics the real autosave round-trip: each onChange schedules an
// ASYNCHRONOUS re-render with the new value (microtask), the way the parent's
// async persistence echoes the value back into the controlled input. This is
// what reproduces the caret-jump bug against a naively-controlled input.
function AsyncEchoHarness({ initial }: { initial: string }) {
  const [value, setValue] = useState<unknown>(initial);
  const q = makeQuestion({ type: 'text', slug: 'wifi', label: 'WiFi' });
  return (
    <PrefilledField
      question={q}
      hubValue={undefined}
      value={value}
      onChange={({ value: next }) => {
        // Defer the echo to a microtask, mimicking async autosave/parent state.
        void Promise.resolve().then(() => setValue(next));
      }}
    />
  );
}

describe('PrefilledField — caret stability on mid-text edits', () => {
  it('keeps the caret in place when typing in the middle of existing text', async () => {
    const user = userEvent.setup();
    render(<AsyncEchoHarness initial="helloworld" />);
    const input = screen.getByLabelText('WiFi') as HTMLInputElement;

    // Place caret between "hello" and "world", then type one char there.
    // initialSelectionStart/End makes userEvent honour the mid-string caret
    // (a bare setSelectionRange is ignored once userEvent seats its own cursor).
    input.setSelectionRange(5, 5);
    await user.type(input, 'X', {
      initialSelectionStart: 5,
      initialSelectionEnd: 5,
    });
    // Flush the async autosave echo (the parent's deferred setValue).
    await act(async () => {
      await Promise.resolve();
    });

    // The character landed mid-string and the caret advanced to index 6 —
    // it did NOT jump to 0 (start) or 11 (end).
    expect(input.value).toBe('helloXworld');
    expect(input.selectionStart).toBe(6);
  });

  it('adopts an EXTERNAL value change (e.g. voice-append) into the field', () => {
    const q = makeQuestion({ type: 'text', slug: 'wifi', label: 'WiFi' });
    const { rerender } = render(
      <PrefilledField question={q} hubValue={undefined} value="Walls clean." onChange={() => {}} />,
    );
    const input = screen.getByLabelText('WiFi') as HTMLInputElement;
    expect(input.value).toBe('Walls clean.');

    // External source pushes a new value (voice dictation appended text).
    rerender(
      <PrefilledField
        question={q}
        hubValue={undefined}
        value="Walls clean. No cracks."
        onChange={() => {}}
      />,
    );
    expect(input.value).toBe('Walls clean. No cracks.');
  });
});
