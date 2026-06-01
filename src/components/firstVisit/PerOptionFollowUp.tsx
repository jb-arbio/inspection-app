'use client';
import type { FirstVisitQuestion } from '@/lib/firstVisit/questions';
import { slugifyOption } from '@/lib/firstVisit/multiSelect';

export type PerOptionFollowUpProps = {
  question: FirstVisitQuestion;
  selectedOptions: string[];
  perOptionValues: Record<string, string>;
  onPerOptionChange: (option: string, next: string) => void;
};

// Inline per-option follow-up inputs rendered below a multi-select picker.
// For every option currently selected we render a labeled text input using
// the parent's `per_option_follow_up.label_template` with `{option}`
// substituted (and, defensively, `{0}` for the same value).
//
// Storage decision: when an option is deselected, the renderer simply stops
// drawing its input — the stored answer row for that option is intentionally
// left untouched so re-selecting later restores any prior text. Cleanup of
// orphaned rows is a server-side concern, not a UI one.
export function PerOptionFollowUp({
  question,
  selectedOptions,
  perOptionValues,
  onPerOptionChange,
}: PerOptionFollowUpProps) {
  const cfg = question.per_option_follow_up;
  if (!cfg) return null;
  if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) return null;

  return (
    <div className="ml-4 mt-2 flex flex-col gap-2 border-l-2 border-gray-200 pl-3">
      {selectedOptions.map((opt) => {
        const id = `q-${question.slug}__per_option__${slugifyOption(opt)}`;
        const label = cfg.label_template
          .replace(/\{option\}/g, opt)
          .replace(/\{0\}/g, opt);
        const display = perOptionValues[opt] ?? '';
        return (
          <div key={opt} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm font-medium text-gray-700">
              {label}
              {cfg.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            <input
              id={id}
              type="text"
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
              value={display}
              onChange={(e) => onPerOptionChange(opt, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
