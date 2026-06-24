import { EditorClient } from './EditorClient';

// Survey content editor route. This page is a thin client wrapper around
// <EditorClient/>. The REAL access enforcement is server-side in the API
// routes the client calls: GET/PUT /api/first-visit/survey-config/draft and
// POST /api/first-visit/survey-config (publish) all gate on isAdminEmail and
// return 403 to non-admins. EditorClient renders a no-access message when the
// draft GET comes back 403, so non-admins cannot load or save anything even if
// they reach this URL directly.
export default function EditSurveyPage() {
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold">Edit first-visit survey</h1>
      <EditorClient />
    </main>
  );
}
