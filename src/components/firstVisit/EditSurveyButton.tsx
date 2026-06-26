'use client';
import Link from 'next/link';

// Jump to the survey editor. The whole app is behind login and any authenticated
// user may edit the survey, so this is shown unconditionally; the editor's API
// routes still require a valid session.
export function EditSurveyButton() {
  return (
    <Link
      href="/first-visit/edit"
      tabIndex={-1}
      className="rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-50"
    >
      Edit survey
    </Link>
  );
}
