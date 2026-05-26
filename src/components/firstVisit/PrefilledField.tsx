'use client';
import type { FirstVisitQuestion } from '@/lib/firstVisit/questions';

export type PrefilledFieldProps = {
  question: FirstVisitQuestion;
  hubValue: unknown | undefined;
  value: unknown;
  onChange: (next: { value: unknown; wasAcceptedAsIs: boolean }) => void;
};

export function PrefilledField({ question, hubValue, value, onChange }: PrefilledFieldProps) {
  const hasHub = hubValue !== undefined && hubValue !== null && hubValue !== '';
  const id = `q-${question.question_key}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{question.label}</label>
      {hasHub && (
        <div className="flex items-center gap-2 rounded bg-yellow-50 px-2 py-1 text-xs">
          <span className="rounded bg-yellow-200 px-1 py-0.5">Pre-filled</span>
          <span className="text-yellow-900">{String(hubValue)}</span>
          <button
            type="button"
            className="ml-auto rounded bg-yellow-200 px-2 py-0.5"
            onClick={() => onChange({ value: hubValue, wasAcceptedAsIs: true })}
          >
            Accept
          </button>
        </div>
      )}
      <input
        id={id}
        className="rounded border border-gray-300 px-2 py-1"
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange({ value: e.target.value, wasAcceptedAsIs: false })}
      />
    </div>
  );
}
