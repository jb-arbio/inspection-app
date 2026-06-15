import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrefilledField } from '../PrefilledField';
import { makeQuestion } from './_fixtures';

// Stub the hook so we can drive onResult and assert append behaviour without
// touching MediaRecorder. Capture the latest onResult passed in. `mockStatus` is
// per-test mutable so a test can render the field while "transcribing".
let lastOnResult: ((t: string) => void) | null = null;
let mockStatus: 'idle' | 'recording' | 'transcribing' = 'idle';
vi.mock('@/lib/firstVisit/useVoiceDictation', () => ({
  useVoiceDictation: (onResult: (t: string) => void) => {
    lastOnResult = onResult;
    return { status: mockStatus, online: true, elapsedMs: 0, onStart: vi.fn(), onStop: vi.fn() };
  },
}));

beforeEach(() => {
  mockStatus = 'idle';
});

describe('PrefilledField voice', () => {
  it('renders a mic for text fields', () => {
    const q = makeQuestion({ type: 'text', slug: 'finding_notes', label: 'Notes' });
    render(<PrefilledField question={q} hubValue={undefined} value="" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /record voice/i })).toBeInTheDocument();
  });

  it('does NOT render a mic for number/select/date/boolean', () => {
    for (const type of ['number', 'select', 'date', 'boolean'] as const) {
      const q = makeQuestion({ type, slug: `q_${type}`, options: ['a', 'b'] });
      const { unmount } = render(
        <PrefilledField question={q} hubValue={undefined} value={null} onChange={vi.fn()} />,
      );
      expect(screen.queryByRole('button', { name: /record voice/i })).toBeNull();
      unmount();
    }
  });

  it('appends the transcribed text to the existing field value', () => {
    const onChange = vi.fn();
    const q = makeQuestion({ type: 'text', slug: 'fv_notes', label: 'Notes', mode: 'observe' });
    render(
      <PrefilledField question={q} hubValue={undefined} value="Walls clean." onChange={onChange} />,
    );
    lastOnResult!('No cracks.');
    expect(onChange).toHaveBeenCalledWith({
      value: 'Walls clean. No cracks.',
      wasAcceptedAsIs: false,
    });
  });

  it('disables the text input while transcribing, enables it when idle', () => {
    const q = makeQuestion({ type: 'text', slug: 'finding_notes', label: 'Notes' });

    mockStatus = 'transcribing';
    const { unmount } = render(
      <PrefilledField question={q} hubValue={undefined} value="" onChange={vi.fn()} />,
    );
    expect(screen.getByLabelText('Notes')).toBeDisabled();
    unmount();

    mockStatus = 'idle';
    render(<PrefilledField question={q} hubValue={undefined} value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Notes')).toBeEnabled();
  });
});
