'use client';
import { useEffect, useState } from 'react';

/**
 * SSR-safe hook returning the current online status.
 * Defaults to `true` until mounted on the client, then reflects
 * `navigator.onLine` and updates on `online` / `offline` events.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    // Sync to the real value on mount (SSR returns true above).
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);

    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}
