'use client';

export type DictationStatus = 'idle' | 'recording' | 'transcribing';

export type VoiceDictationButtonProps = {
  status: DictationStatus;
  online: boolean;
  elapsedMs: number;
  onStart: () => void;
  onStop: () => void;
};

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VoiceDictationButton({
  status,
  online,
  elapsedMs,
  onStart,
  onStop,
}: VoiceDictationButtonProps) {
  if (status === 'transcribing') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <span className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-gray-600" />
        Transcribing…
      </span>
    );
  }

  if (status === 'recording') {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
          <span className="tabular-nums">{fmt(elapsedMs)}</span>
        </span>
        <button
          type="button"
          onClick={onStop}
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
        >
          Stop
        </button>
      </span>
    );
  }

  // idle
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="Record voice note"
        disabled={!online}
        onClick={onStart}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        🎙️
      </button>
      {!online && (
        <span className="text-[10px] text-gray-400">Voice needs a connection — type for now</span>
      )}
    </span>
  );
}
