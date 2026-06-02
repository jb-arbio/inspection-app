'use client';
import { useEffect } from 'react';

export function PersistGate() {
  useEffect(() => {
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);
  return null;
}
