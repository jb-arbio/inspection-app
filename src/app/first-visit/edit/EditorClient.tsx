'use client';

import { useCallback, useEffect, useState } from 'react';
import { QuestionEditorRow } from '@/components/firstVisit/QuestionEditorRow';
import { QUESTION_STRUCTURE } from '@/lib/firstVisit/questionStructure';
import { questionEditorSchema } from '@/lib/firstVisit/editorSchema';
import { validateSurveyContent } from '@/lib/firstVisit/validateSurveyContent';
import type {
  ContentConfig,
  ContentPhase,
  ContentQuestion,
} from '@/lib/firstVisit/surveyConfig';
import { PHASES } from '@/lib/firstVisit/questions';

type LoadState = 'loading' | 'forbidden' | 'ready' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';
type PublishState = 'idle' | 'publishing' | 'published' | 'failed';

// Derive a starting ContentConfig from the bundled PHASES, stripping each
// question down to the editable ContentQuestion keys (the overlay fields are
// engineer-owned and shown read-only, never persisted as content).
function contentFromPhases(): ContentConfig {
  return {
    phases: PHASES.map((phase) => ({
      id: phase.id,
      label: phase.label,
      questions: phase.questions.map(
        (q): ContentQuestion => ({
          slug: q.slug,
          label: q.label,
          description: q.description,
          scope: q.scope,
          type: q.type,
          options: q.options,
          required: q.required,
          multi_select: q.multi_select,
          allow_custom_options: q.allow_custom_options,
          phase_id: q.phase_id,
          phase_label: q.phase_label,
        }),
      ),
    })),
  };
}

function isContentEmpty(content: ContentConfig | null | undefined): boolean {
  return !content || !Array.isArray(content.phases) || content.phases.length === 0;
}

// Generate a slug of the form `fv_new_field_<n>` that doesn't collide with any
// existing slug across the whole config.
function uniqueNewSlug(content: ContentConfig): string {
  const existing = new Set(
    content.phases.flatMap((p) => p.questions.map((q) => q.slug)),
  );
  let n = 1;
  while (existing.has(`fv_new_field_${n}`)) n += 1;
  return `fv_new_field_${n}`;
}

// True when any draft question's slug has no entry in the structural overlay.
function hasUnmappedField(content: ContentConfig): boolean {
  return content.phases.some((p) =>
    p.questions.some((q) => !(q.slug in QUESTION_STRUCTURE)),
  );
}

export function EditorClient() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [config, setConfig] = useState<ContentConfig | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [publishState, setPublishState] = useState<PublishState>('idle');
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);

  // On mount: try the draft, fall back to published, then to bundled PHASES.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draftRes = await fetch('/api/first-visit/survey-config/draft');
        if (draftRes.status === 403) {
          if (!cancelled) setLoadState('forbidden');
          return;
        }
        const draft = await draftRes.json();
        if (!isContentEmpty(draft?.content)) {
          if (!cancelled) {
            setConfig(draft.content as ContentConfig);
            setLoadState('ready');
          }
          return;
        }
        // No draft → latest published.
        const pubRes = await fetch('/api/first-visit/survey-config');
        const pub = pubRes.ok ? await pubRes.json() : null;
        if (!isContentEmpty(pub?.content)) {
          if (!cancelled) {
            setConfig(pub.content as ContentConfig);
            setLoadState('ready');
          }
          return;
        }
        // Nothing persisted yet → seed from the bundled config.
        if (!cancelled) {
          setConfig(contentFromPhases());
          setLoadState('ready');
        }
      } catch {
        if (!cancelled) setLoadState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset transient publish/save feedback after any structural mutation.
  const markDirty = useCallback(() => {
    setSaveState('idle');
    setPublishState('idle');
    setPublishMessage(null);
    setPublishErrors([]);
  }, []);

  // Immutable replace of one question by slug within its phase.
  const updateQuestion = useCallback(
    (phaseId: string, updated: ContentQuestion) => {
      markDirty();
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          phases: prev.phases.map((phase) =>
            phase.id !== phaseId
              ? phase
              : {
                  ...phase,
                  questions: phase.questions.map((q) =>
                    q.slug === updated.slug ? updated : q,
                  ),
                },
          ),
        };
      });
    },
    [markDirty],
  );

  // Append a fresh, editable question to a phase, inheriting that phase's scope.
  const addQuestion = useCallback(
    (phaseId: string) => {
      markDirty();
      setConfig((prev) => {
        if (!prev) return prev;
        const slug = uniqueNewSlug(prev);
        return {
          phases: prev.phases.map((phase) => {
            if (phase.id !== phaseId) return phase;
            const scope =
              phase.questions[0]?.scope ?? ('unit_category' as const);
            const newQuestion: ContentQuestion = {
              slug,
              label: 'New question',
              description: null,
              scope,
              type: 'text',
              options: [],
              required: false,
              phase_id: phase.id,
              phase_label: phase.label,
            };
            return { ...phase, questions: [...phase.questions, newQuestion] };
          }),
        };
      });
    },
    [markDirty],
  );

  // Remove a question from its phase by slug (immutably).
  const removeQuestion = useCallback(
    (phaseId: string, slug: string) => {
      markDirty();
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          phases: prev.phases.map((phase) =>
            phase.id !== phaseId
              ? phase
              : {
                  ...phase,
                  questions: phase.questions.filter((q) => q.slug !== slug),
                },
          ),
        };
      });
    },
    [markDirty],
  );

  // Move a question within its phase by one position (no cross-phase moves).
  const moveQuestion = useCallback(
    (phaseId: string, index: number, direction: -1 | 1) => {
      markDirty();
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          phases: prev.phases.map((phase) => {
            if (phase.id !== phaseId) return phase;
            const target = index + direction;
            if (target < 0 || target >= phase.questions.length) return phase;
            const questions = [...phase.questions];
            [questions[index], questions[target]] = [
              questions[target],
              questions[index],
            ];
            return { ...phase, questions };
          }),
        };
      });
    },
    [markDirty],
  );

  // Whole-config validity: every question must pass the per-row schema.
  const allValid =
    !!config &&
    config.phases.every((phase) =>
      phase.questions.every(
        (q) => questionEditorSchema.safeParse(q).success,
      ),
    );

  async function saveDraft() {
    if (!config) return;
    setSaveState('saving');
    try {
      const res = await fetch('/api/first-visit/survey-config/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: config }),
      });
      setSaveState(res.ok ? 'saved' : 'failed');
    } catch {
      setSaveState('failed');
    }
  }

  async function publish() {
    if (!config) return;
    // Client-side validation FIRST — never POST an invalid config.
    const { ok, errors } = validateSurveyContent(config, QUESTION_STRUCTURE);
    if (!ok) {
      setPublishState('failed');
      setPublishMessage(null);
      setPublishErrors(errors);
      return;
    }
    setPublishState('publishing');
    setPublishMessage(null);
    setPublishErrors([]);
    try {
      const res = await fetch('/api/first-visit/survey-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: config }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setPublishState('published');
        setPublishMessage(`Published version ${body?.version}`);
      } else {
        setPublishState('failed');
        if (Array.isArray(body?.errors)) {
          setPublishErrors(body.errors as string[]);
        } else {
          setPublishMessage(
            typeof body?.error === 'string' ? body.error : 'Publish failed',
          );
        }
      }
    } catch {
      setPublishState('failed');
      setPublishMessage('Publish failed');
    }
  }

  if (loadState === 'loading') return <p>Loading…</p>;
  if (loadState === 'forbidden')
    return <p>You don&apos;t have access to edit the survey.</p>;
  if (loadState === 'error' || !config)
    return <p>Could not load the survey config.</p>;

  const showNewFieldBanner = hasUnmappedField(config);
  const busy = saveState === 'saving' || publishState === 'publishing';

  return (
    <div className="mt-4 space-y-6">
      {showNewFieldBanner && (
        <p
          role="status"
          className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          New fields aren&apos;t PMS-mapped or wired into branching until an
          engineer adds them to the structure overlay.
        </p>
      )}

      {config.phases.map((phase: ContentPhase) => (
        <section key={phase.id}>
          <h2 className="text-lg font-medium">{phase.label}</h2>
          <div className="mt-2 space-y-3">
            {phase.questions.map((q, index) => (
              <div key={q.slug}>
                <div className="mb-1 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Move ${q.slug} up`}
                    onClick={() => moveQuestion(phase.id, index, -1)}
                    disabled={index === 0}
                    className="rounded border px-2 py-0.5 text-sm disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${q.slug} down`}
                    onClick={() => moveQuestion(phase.id, index, 1)}
                    disabled={index === phase.questions.length - 1}
                    className="rounded border px-2 py-0.5 text-sm disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${q.slug}`}
                    onClick={() => removeQuestion(phase.id, q.slug)}
                    className="rounded border px-2 py-0.5 text-sm text-red-600"
                  >
                    Remove
                  </button>
                </div>
                <QuestionEditorRow
                  question={q}
                  overlay={QUESTION_STRUCTURE[q.slug]}
                  onChange={(updated) => updateQuestion(phase.id, updated)}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addQuestion(phase.id)}
            className="mt-2 rounded border px-3 py-1 text-sm"
          >
            + Add question
          </button>
        </section>
      ))}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-white py-3">
        <button
          type="button"
          onClick={saveDraft}
          disabled={!allValid || busy}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {saveState === 'saving' ? 'Saving…' : 'Save draft'}
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={!allValid || busy}
          className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
        >
          {publishState === 'publishing' ? 'Publishing…' : 'Publish'}
        </button>
        {saveState === 'saved' && (
          <span className="text-green-700">Saved</span>
        )}
        {saveState === 'failed' && (
          <span className="text-red-600">Save failed</span>
        )}
        {publishMessage && (
          <span
            className={
              publishState === 'published' ? 'text-green-700' : 'text-red-600'
            }
          >
            {publishMessage}
          </span>
        )}
      </div>

      {publishErrors.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-red-600">
          {publishErrors.map((err, i) => (
            <li key={`${err}-${i}`}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
