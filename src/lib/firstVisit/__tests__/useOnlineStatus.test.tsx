import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../useOnlineStatus';

describe('useOnlineStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Restore the navigator.onLine getter to a known state for the next test.
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  it('returns true on initial render (SSR-safe default)', () => {
    const { result } = renderHook(() => useOnlineStatus());
    // The mount effect runs synchronously in jsdom, but since navigator.onLine
    // defaults to true in jsdom, the value is true either way.
    expect(result.current).toBe(true);
  });

  it('reflects navigator.onLine === false after mount', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('updates to false on a window "offline" event', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });

  it('updates to true on a window "online" event after going offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });

  it('removes its window listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());
    const addedOnline = addSpy.mock.calls.filter((c) => c[0] === 'online').length;
    const addedOffline = addSpy.mock.calls.filter((c) => c[0] === 'offline').length;
    expect(addedOnline).toBeGreaterThan(0);
    expect(addedOffline).toBeGreaterThan(0);
    unmount();
    const removedOnline = removeSpy.mock.calls.filter((c) => c[0] === 'online').length;
    const removedOffline = removeSpy.mock.calls.filter((c) => c[0] === 'offline').length;
    expect(removedOnline).toBeGreaterThan(0);
    expect(removedOffline).toBeGreaterThan(0);
  });
});
