import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const start = vi.fn();
const stop = vi.fn(async () => new Blob(['x'], { type: 'audio/webm' }));
vi.mock('../useVoiceRecorder', () => ({
  useAudioRecorder: () => ({ recording: false, start, stop }),
}));

const post = vi.fn(async (_b: Blob) => 'Cleaned text.');
vi.mock('../postTranscription', () => ({ postTranscription: (b: Blob) => post(b) }));

import { useVoiceDictation } from '../useVoiceDictation';

beforeEach(() => vi.clearAllMocks());

describe('useVoiceDictation', () => {
  it('starts idle and online', () => {
    const { result } = renderHook(() => useVoiceDictation(vi.fn()));
    expect(result.current.status).toBe('idle');
    expect(result.current.online).toBe(true);
  });

  it('start → status recording', async () => {
    const { result } = renderHook(() => useVoiceDictation(vi.fn()));
    await act(async () => { await result.current.onStart(); });
    expect(start).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('recording');
  });

  it('stop → transcribing → emits result → back to idle', async () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useVoiceDictation(onResult));
    await act(async () => { await result.current.onStart(); });
    await act(async () => { await result.current.onStop(); });
    expect(post).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(onResult).toHaveBeenCalledWith('Cleaned text.');
  });

  it('does not emit when transcription returns empty', async () => {
    post.mockResolvedValueOnce('');
    const onResult = vi.fn();
    const { result } = renderHook(() => useVoiceDictation(onResult));
    await act(async () => { await result.current.onStart(); });
    await act(async () => { await result.current.onStop(); });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(onResult).not.toHaveBeenCalled();
  });

  it('does not emit after unmount mid-transcription', async () => {
    let resolvePost: (v: string) => void = () => {};
    post.mockImplementationOnce(
      () => new Promise<string>((r) => { resolvePost = r; }),
    );
    const onResult = vi.fn();
    const { result, unmount } = renderHook(() => useVoiceDictation(onResult));
    await act(async () => { await result.current.onStart(); });
    // Fire onStop but do NOT await it — postTranscription is a pending deferred
    // promise, so onStop won't resolve until we release it below.
    let stopped: Promise<void> = Promise.resolve();
    await act(async () => {
      stopped = result.current.onStop();
      await Promise.resolve();
    });
    // transcription is pending now
    unmount();
    await act(async () => {
      resolvePost('Late text.');
      await stopped;
    });
    expect(onResult).not.toHaveBeenCalled();
  });
});
