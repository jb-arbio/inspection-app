'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
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

  // Keep the handlers and the in-flight flag in refs so the public
  // `syncNow` identity is stable across renders. Without this, every
  // setSyncing(true) rebuilds syncNow → effects that depend on syncNow
  // refire → call syncNow again → infinite "syncing…" flicker.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    setPending(await outboxCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSyncing(true);
    try {
      await drainOutbox(handlersRef.current);
    } finally {
      inFlight.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  // Initial + periodic count refresh.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Trigger a sync when we come online.
  useEffect(() => {
    if (online) syncNow().catch(() => {});
  }, [online, syncNow]);

  // Periodic background drain + on-focus drain.
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
