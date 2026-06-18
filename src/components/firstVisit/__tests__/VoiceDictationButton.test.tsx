import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceDictationButton } from '../VoiceDictationButton';

const base = {
  status: 'idle' as const,
  online: true,
  elapsedMs: 0,
  onStart: vi.fn(),
  onStop: vi.fn(),
};

describe('VoiceDictationButton', () => {
  it('idle: shows a record button and calls onStart', async () => {
    const onStart = vi.fn();
    render(<VoiceDictationButton {...base} onStart={onStart} />);
    const btn = screen.getByRole('button', { name: /record|dictate|voice/i });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('offline: record button is disabled and a hint is shown', () => {
    render(<VoiceDictationButton {...base} online={false} />);
    expect(screen.getByRole('button', { name: /record|dictate|voice/i })).toBeDisabled();
    expect(screen.getByText(/needs a connection/i)).toBeInTheDocument();
  });

  it('recording: shows timer and a Stop button that calls onStop', async () => {
    const onStop = vi.fn();
    render(
      <VoiceDictationButton {...base} status="recording" elapsedMs={67000} onStop={onStop} />,
    );
    expect(screen.getByText('1:07')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('transcribing: shows a transcribing indicator and no record/stop action', () => {
    render(<VoiceDictationButton {...base} status="transcribing" />);
    expect(screen.getByText(/transcribing/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /stop/i })).toBeNull();
  });

  it('transcribing: exposes a status live-region', () => {
    render(<VoiceDictationButton {...base} status="transcribing" />);
    expect(screen.getByRole('status')).toHaveTextContent(/transcribing/i);
  });

  it('error: shows a retry affordance and calls onStart when tapped', async () => {
    const onStart = vi.fn();
    render(<VoiceDictationButton {...base} status="error" onStart={onStart} />);
    expect(screen.getByRole('status')).toHaveTextContent(/failed|retry/i);
    const btn = screen.getByRole('button', { name: /retry|failed|record|voice/i });
    await userEvent.click(btn);
    expect(onStart).toHaveBeenCalledOnce();
  });
});
