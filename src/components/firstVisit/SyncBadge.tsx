'use client';
import { useOnlineStatus } from '@/lib/firstVisit/useSyncEngine';

export function SyncBadge({ pending, syncing }: { pending: number; syncing: boolean }) {
  const online = useOnlineStatus();
  if (syncing) return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Syncing…</span>;
  if (!online) return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-900">Offline — {pending} pending</span>;
  if (pending > 0) return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-900">{pending} pending</span>;
  return <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Synced</span>;
}
