'use client';
import { useEffect, useState } from 'react';
import { localDb, type LocalTarget } from '@/lib/firstVisit/db';

// Lets the inspector copy every answer from a previously-filled unit onto the
// current unit. Skips media, hub-suggestion snapshots, and the unit's own
// label. Hub pre-fills on the target are NOT silently overwritten — the copy
// asks for explicit confirm if the target already has any answers.

export function CopyFromUnitPicker({
  inspectionId,
  currentUnitId,
  onCopy,
}: {
  inspectionId: string;
  currentUnitId: string;
  onCopy: (sourceUnitId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<Array<LocalTarget & { answerCount: number }>>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const allUnits = await localDb.targets
        .where('inspection_id')
        .equals(inspectionId)
        .toArray();
      const otherUnits = allUnits.filter(
        (t) => t.kind === 'unit' && t.id !== currentUnitId,
      );
      const enriched = await Promise.all(
        otherUnits.map(async (u) => {
          const answers = await localDb.answers
            .where('target_id')
            .equals(u.id)
            .toArray();
          const meaningful = answers.filter(
            (a) => a.value !== null && a.value !== undefined && a.value !== '',
          ).length;
          return { ...u, answerCount: meaningful };
        }),
      );
      // Sort by answerCount desc — the fullest source is the best one to copy.
      enriched.sort((a, b) => b.answerCount - a.answerCount);
      setUnits(enriched);
    })();
  }, [open, inspectionId, currentUnitId]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
      >
        📋 Copy from another unit
      </button>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Copy answers from…</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
      {units.length === 0 ? (
        <p className="text-xs text-gray-500">No other units in this visit yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {units.map((u) => {
            const empty = u.answerCount === 0;
            return (
              <li key={u.id}>
                <button
                  type="button"
                  disabled={empty || busyId !== null}
                  onClick={async () => {
                    setBusyId(u.id);
                    try {
                      await onCopy(u.id);
                      setOpen(false);
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-left text-sm ${
                    empty
                      ? 'border-gray-200 text-gray-400'
                      : 'border-gray-300 hover:bg-gray-50'
                  } ${busyId === u.id ? 'opacity-60' : ''}`}
                >
                  <span className="truncate">{u.label}</span>
                  <span className="text-xs text-gray-500">
                    {empty ? 'empty' : `${u.answerCount} answer${u.answerCount === 1 ? '' : 's'}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-[11px] italic text-gray-500">
        Copies answer values and notes. Photos, videos, and hub pre-fills are not copied.
      </p>
    </div>
  );
}
