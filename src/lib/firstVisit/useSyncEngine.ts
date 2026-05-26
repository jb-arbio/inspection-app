'use client';
import { useEffect, useState, useCallback } from 'react';
import { drainOutbox, outboxCount, type JobHandlers } from './sync';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
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

export function useSyncEngine(handlers: JobHandlers): {
  pending: number;
  syncNow: () => Promise<void>;
  syncing: boolean;
} {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const online = useOnlineStatus();

  const refresh = useCallback(async () => {
    setPending(await outboxCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await drainOutbox(handlers);
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [handlers, syncing, refresh]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (online) syncNow().catch(() => {});
  }, [online, syncNow]);

  useEffect(() => {
    const id = setInterval(() => {
      if (navigator.onLine) syncNow().catch(() => {});
    }, 30_000);
    const onFocus = () => {
      if (navigator.onLine) syncNow().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncNow]);

  return { pending, syncNow, syncing };
}
