'use client';
import { useMemo, useState } from 'react';
import type { FirstVisitQuestion } from '@/lib/firstVisit/questions';
import { isExclusiveOption, toggleOption } from '@/lib/firstVisit/multiSelect';

export type MultiSelectChipsProps = {
  id: string;
  question: FirstVisitQuestion;
  value: string[];
  onChange: (next: string[]) => void;
};

// Chip-list picker for multi-select questions. None/N/A chips are exclusive
// (selecting them drops everything else; selecting anything else drops them).
// When `question.allow_custom_options` is true, a "+ Add custom" input lets
// the inspector append a free-text chip. Custom chips persist in a UI-only
// list for the session so they remain toggleable even after deselect.
export function MultiSelectChips({ id, question, value, onChange }: MultiSelectChipsProps) {
  // Memoise the selected-array view so the useMemo below has a stable dep
  // identity when `value` itself hasn't changed structurally.
  const selected = useMemo(
    () => (Array.isArray(value) ? value : []),
    [value],
  );
  // Standard options come from the question config. Custom-added options live
  // in component-local state so the chip stays clickable after a deselect.
  // We seed it from any selected values that aren't in the standard list so
  // a reload of the survey still surfaces previously-typed custom chips.
  const [customSeen, setCustomSeen] = useState<string[]>(() =>
    selected.filter((v) => !question.options.includes(v)),
  );
  const [draft, setDraft] = useState('');

  const allOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const opt of question.options) {
      if (!seen.has(opt)) {
        seen.add(opt);
        out.push(opt);
      }
    }
    for (const opt of customSeen) {
      if (!seen.has(opt)) {
        seen.add(opt);
        out.push(opt);
      }
    }
    // Selected values that haven't made it into either list yet (defensive).
    for (const v of selected) {
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    return out;
  }, [question.options, customSeen, selected]);

  const handleToggle = (opt: string) => {
    onChange(toggleOption(selected, opt));
  };

  const handleAddCustom = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (question.options.includes(trimmed) || customSeen.includes(trimmed)) {
      // Already exists; just select it.
      setDraft('');
      if (!selected.includes(trimmed)) onChange(toggleOption(selected, trimmed));
      return;
    }
    setCustomSeen((cs) => [...cs, trimmed]);
    // Custom options are non-exclusive — toggle them onto the value array,
    // dropping any exclusive that was set.
    onChange(toggleOption(selected, trimmed));
    setDraft('');
  };

  return (
    <div id={id} className="flex flex-wrap gap-1.5" role="group" aria-label={question.label}>
      {allOptions.map((opt) => {
        const active = selected.includes(opt);
        const exclusive = isExclusiveOption(opt);
        return (
          <button
            key={opt}
            type="button"
            tabIndex={-1}
            aria-pressed={active}
            onClick={() => handleToggle(opt)}
            className={`rounded-full px-3 py-1.5 text-sm transition active:scale-[0.98] ${
              active
                ? exclusive
                  ? 'bg-gray-800 text-white'
                  : 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {opt}
          </button>
        );
      })}
      {question.allow_custom_options && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={draft}
            placeholder="+ Add custom"
            aria-label={`Add custom option for ${question.label}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            className="w-32 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
          />
          {draft.trim().length > 0 && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleAddCustom}
              className="rounded-full bg-black px-2 py-1 text-xs text-white"
            >
              Add
            </button>
          )}
        </div>
      )}
    </div>
  );
}
