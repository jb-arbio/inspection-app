'use client';
import { useOnlineStatus } from '@/lib/firstVisit/useSyncEngine';

// Quiet background signal. Syncing to the hub's outbox happens continuously and
// the inspector never acts on it, so we deliberately DON'T render an in-flight
// "Syncing…" badge — its changing width made the header buttons (Edit / Sync
// now / Export) jump every time a sync started or finished. The only state
// worth surfacing is being offline with unsynced work, which reassures the
// inspector their data is safe on the device. It appears rarely and never shows
// an alarming backlog number.
export function SyncBadge({ pending }: { pending: number }) {
  const online = useOnlineStatus();
  if (online || pending <= 0) return null;
  return (
    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
      Offline — changes saved on device
    </span>
  );
}
