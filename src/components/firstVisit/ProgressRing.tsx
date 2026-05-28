'use client';

export function ProgressRing({
  done,
  total,
  size = 40,
  stroke = 3,
}: {
  done: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : Math.min(1, done / total);
  const offset = circumference * (1 - pct);
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`Progress: ${done} of ${total} required answered`}
      title={`${done} / ${total} required`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#111827"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 200ms ease-out' }}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold tabular-nums">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

export type SkippedValue = { __skipped: true; reason?: string };

export function isSkipped(v: unknown): v is SkippedValue {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { __skipped?: unknown }).__skipped === true
  );
}

export function isAnswered(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  // Explicitly skipped with a reason counts as terminal — progress treats it
  // as "the inspector dealt with this question."
  if (isSkipped(v)) return true;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0 && v.some(isAnswered);
  // numbers (including 0) and booleans count as answered once set.
  return true;
}
