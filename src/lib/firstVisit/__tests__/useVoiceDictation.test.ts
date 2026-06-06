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
});
