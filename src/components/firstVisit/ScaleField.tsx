'use client';
import type { FirstVisitQuestion } from '@/lib/firstVisit/questions';

export type ScaleFieldProps = {
  question: FirstVisitQuestion;
  value: unknown;
  // Mirrors PrefilledField's onChange contract so the call site stays uniform
  // across field types. Selecting an option is never an "accept as-is" of a
  // pre-filled value, so wasAcceptedAsIs is always false here.
  onChange: (next: { value: unknown; wasAcceptedAsIs: boolean }) => void;
  // Saved-pulse trigger; PrefilledField passes pulseImmediate so a tap shows
  // the "✓ Saved" confirmation, matching the boolean/select branches.
  onSelected?: () => void;
};

// Segmented single-select rendered as a horizontal row of buttons — same
// interaction as a <select>, but tap-friendly on mobile and visually
// consistent with the boolean Yes/No toggle. Selection is sticky: re-tapping
// the active option keeps it set (select semantics, never toggles off).
export function ScaleField({ question, value, onChange, onSelected }: ScaleFieldProps) {
  const id = `q-${question.slug}`;
  return (
    <div className="flex flex-wrap gap-2">
      {/* Hidden input keeps the label htmlFor target resolvable for a11y/tests,
          mirroring the boolean branch in PrefilledField. */}
      <input type="hidden" id={id} aria-label={question.label} />
      {question.options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            className={`flex-1 rounded-md px-4 py-3 text-base font-medium transition active:scale-[0.98] ${
              active
                ? 'bg-black text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => {
              onChange({ value: opt, wasAcceptedAsIs: false });
              onSelected?.();
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
