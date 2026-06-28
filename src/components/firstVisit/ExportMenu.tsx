'use client';
import { useEffect, useRef, useState } from 'react';
import { downloadInspectionZip } from '@/lib/firstVisit/export';

// Single "Export ▾" entry point replacing the two bare buttons (Export + the
// confusingly-named "Findings CSV"). Two clear choices:
//   • Everything (ZIP)  — full inspection: all answers + media files, for archive
//   • Issues only (CSV) — just the issue log, with media links, for sharing
// "Issues" matches the survey's renamed Issue log (formerly "findings").
export function ExportMenu({ inspectionId }: { inspectionId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape so the menu doesn't linger.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        tabIndex={-1}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded border border-gray-300 px-2 py-0.5"
      >
        Export ▾
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              void downloadInspectionZip(inspectionId);
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left hover:bg-gray-50"
          >
            Everything (ZIP)
            <span className="block text-[11px] text-gray-400">All answers + media files</span>
          </button>
          <a
            role="menuitem"
            tabIndex={-1}
            href={`/api/first-visit/${inspectionId}/findings.csv`}
            download
            onClick={() => setOpen(false)}
            className="block w-full border-t border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
          >
            Issues only (CSV)
            <span className="block text-[11px] text-gray-400">Issue log + media links</span>
          </a>
        </div>
      )}
    </div>
  );
}
