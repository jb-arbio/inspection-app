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

// Harness that models a SLOW, BACKLOGGED autosave: each onChange queues its echo
// but the echoes flush later, in order, AFTER several keystrokes have landed.
// This reproduces fast typing where a stale intermediate echo (e.g. "a") arrives
// while the DOM already shows the newer text ("ab"). flush() drains the queue.
let pendingEchoes: Array<() => void> = [];
function BackloggedEchoHarness({ initial }: { initial: string }) {
  const [value, setValue] = useState<unknown>(initial);
  const q = makeQuestion({ type: 'text', slug: 'wifi', label: 'WiFi' });
  return (
    <PrefilledField
      question={q}
      hubValue={undefined}
      value={value}
      onChange={({ value: next }) => {
        // Queue the echo instead of firing it; the test drains it later so a
        // STALE value can arrive after a newer keystroke has updated the DOM.
        pendingEchoes.push(() => setValue(next));
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

  it('does not revert to a stale echo when typing faster than autosave', async () => {
    pendingEchoes = [];
    const user = userEvent.setup();
    render(<BackloggedEchoHarness initial="" />);
    const input = screen.getByLabelText('WiFi') as HTMLInputElement;

    // userEvent.type focuses the input, then types "a" and "b". Both echoes are
    // queued (deferred), so the DOM reaches "ab" before ANY echo flushes.
    await user.type(input, 'ab');
    expect(input.value).toBe('ab');
    expect(pendingEchoes.length).toBe(2);

    // Now flush the BACKLOG in order: the first (stale) echo is "a", arriving
    // while the DOM already shows "ab". A naive value-compare guard would write
    // "a" back, reverting the text and jumping the caret. The focus guard must
    // ignore it because the field is still focused.
    await act(async () => {
      pendingEchoes.shift()!(); // stale "a"
      await Promise.resolve();
    });
    expect(input.value).toBe('ab'); // never visibly reverted to "a"

    await act(async () => {
      pendingEchoes.shift()!(); // current "ab"
      await Promise.resolve();
    });
    expect(input.value).toBe('ab');
    expect(input.selectionStart).toBe(2); // caret stayed at end
  });

  it('shows the new question value after switching to a different question', () => {
    const qWifi = makeQuestion({ type: 'text', slug: 'wifi', label: 'WiFi' });
    const { rerender } = render(
      <PrefilledField question={qWifi} hubValue={undefined} value="netgear" onChange={() => {}} />,
    );
    expect((screen.getByLabelText('WiFi') as HTMLInputElement).value).toBe('netgear');

    // Rerender with a DIFFERENT question (different slug → different DOM id and
    // label) and a different value. The uncontrolled defaultValue must not leak
    // stale text from the previous question; the new field shows the new value.
    const qDoor = makeQuestion({ type: 'text', slug: 'door_code', label: 'Door Code' });
    rerender(
      <PrefilledField question={qDoor} hubValue={undefined} value="1234" onChange={() => {}} />,
    );
    expect((screen.getByLabelText('Door Code') as HTMLInputElement).value).toBe('1234');
  });
});
