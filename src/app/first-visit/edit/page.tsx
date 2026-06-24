import { EditorClient } from './EditorClient';

// Survey content editor route. Thin client wrapper around <EditorClient/>.
// The whole app is behind login and any authenticated user may edit the survey,
// so there is no per-user gate here; the API routes the client calls still
// require a valid session (401 otherwise).
export default function EditSurveyPage() {
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold">Edit first-visit survey</h1>
      <EditorClient />
    </main>
  );
}
