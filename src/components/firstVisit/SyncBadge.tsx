'use client';
import { useOnlineStatus } from '@/lib/firstVisit/useSyncEngine';

// A quiet, technical background signal — NOT a completion indicator. It tells
// the inspector that local changes are being flushed to the hub's outbox; it
// must never shout an alarming backlog number (the field report saw "~1,158
// pending"). So it renders nothing unless a sync is actually in flight, and
// frames the count as "changes" rather than a scary "pending" total. The
// user-facing completion signal lives in the navigator header.
export function SyncBadge({ pending, syncing }: { pending: number; syncing: boolean }) {
  const online = useOnlineStatus();

  // Nothing in flight → say nothing.
  if (!syncing) {
    // Offline with un-synced work still deserves a gentle, non-alarming note.
    if (!online && pending > 0) {
      return (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          Offline — changes saved on device
        </span>
      );
    }
    return null;
  }

  const label =
    pending > 0
      ? `Syncing ${pending} change${pending === 1 ? '' : 's'}…`
      : 'Syncing…';
  return (
    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
      {label}
    </span>
  );
}
