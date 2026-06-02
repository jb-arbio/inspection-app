'use client';
import type { FirstVisitQuestion } from '@/lib/firstVisit/questions';

export type ConditionalFollowUpProps = {
  question: FirstVisitQuestion;
  parentValue: unknown;
  followUpValue: unknown;
  onFollowUpChange: (next: unknown) => void;
};

// Returns true when the parent's value should trigger the follow-up field.
// - For booleans: strict ===.
// - For multi-select arrays: when the array includes the trigger.
// - For everything else: shallow equality.
function shouldShow(parentValue: unknown, whenValue: unknown): boolean {
  if (parentValue === whenValue) return true;
  if (Array.isArray(parentValue)) {
    return parentValue.some((v) => v === whenValue);
  }
  return false;
}

// Inline follow-up input rendered below a trigger question. Renders nothing
// when the question has no `follow_up` config or the parent value doesn't
// match `when_value`.
export function ConditionalFollowUp({
  question,
  parentValue,
  followUpValue,
  onFollowUpChange,
}: ConditionalFollowUpProps) {
  const cfg = question.follow_up;
  if (!cfg) return null;
  if (!shouldShow(parentValue, cfg.when_value)) return null;

  const id = `q-${question.slug}__follow_up`;
  const display = followUpValue == null ? '' : String(followUpValue);

  return (
    <div className="ml-4 mt-1 flex flex-col gap-1 border-l-2 border-gray-200 pl-3">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {cfg.label}
        {cfg.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {cfg.type === 'number' ? (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
          value={display}
          onChange={(e) =>
            onFollowUpChange(e.target.value === '' ? null : Number(e.target.value))
          }
        />
      ) : (
        <input
          id={id}
          type="text"
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
          value={display}
          onChange={(e) => onFollowUpChange(e.target.value)}
        />
      )}
    </div>
  );
}
