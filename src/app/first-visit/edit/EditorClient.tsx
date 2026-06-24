'use client';

import { useCallback, useEffect, useState } from 'react';
import { QuestionEditorRow } from '@/components/firstVisit/QuestionEditorRow';
import { QUESTION_STRUCTURE } from '@/lib/firstVisit/questionStructure';
import { questionEditorSchema } from '@/lib/firstVisit/editorSchema';
import type {
  ContentConfig,
  ContentPhase,
  ContentQuestion,
} from '@/lib/firstVisit/surveyConfig';
import { PHASES } from '@/lib/firstVisit/questions';

type LoadState = 'loading' | 'forbidden' | 'ready' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

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

export function EditorClient() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [config, setConfig] = useState<ContentConfig | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

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

  // Immutable replace of one question by slug within its phase.
  const updateQuestion = useCallback(
    (phaseId: string, updated: ContentQuestion) => {
      setSaveState('idle');
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
    [],
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

  if (loadState === 'loading') return <p>Loading…</p>;
  if (loadState === 'forbidden')
    return <p>You don&apos;t have access to edit the survey.</p>;
  if (loadState === 'error' || !config)
    return <p>Could not load the survey config.</p>;

  return (
    <div className="mt-4 space-y-6">
      {config.phases.map((phase: ContentPhase) => (
        <section key={phase.id}>
          <h2 className="text-lg font-medium">{phase.label}</h2>
          <div className="mt-2 space-y-3">
            {phase.questions.map((q) => (
              <QuestionEditorRow
                key={q.slug}
                question={q}
                overlay={QUESTION_STRUCTURE[q.slug]}
                onChange={(updated) => updateQuestion(phase.id, updated)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 flex items-center gap-3 border-t bg-white py-3">
        <button
          type="button"
          onClick={saveDraft}
          disabled={!allValid || saveState === 'saving'}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {saveState === 'saving' ? 'Saving…' : 'Save draft'}
        </button>
        {saveState === 'saved' && (
          <span className="text-green-700">Saved</span>
        )}
        {saveState === 'failed' && (
          <span className="text-red-600">Save failed</span>
        )}
      </div>
    </div>
  );
}
