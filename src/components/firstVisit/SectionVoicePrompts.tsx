'use client';
import { VoiceDictationButton } from '@/components/firstVisit/VoiceDictationButton';
import { useSectionVoiceFill, type VoiceFillSummary } from '@/lib/firstVisit/useSectionVoiceFill';
import { promptsForPhase } from '@/data/section-voice-prompts';
import { VOICE_FILL_ENABLED } from '@/lib/firstVisit/featureFlags';
import type { LocalAnswer } from '@/lib/firstVisit/db';
import type { HubScope } from '@/lib/firstVisit/resolveScope';

export type SectionVoicePromptsProps = {
  phaseId: string;
  inspectionId: string;
  targetId: string;
  scope: HubScope;
  ctx: { location_id?: string; unit_category_id?: string };
  getAnswers: () => Record<string, LocalAnswer>;
  onRowsWritten: (rows: LocalAnswer[]) => void;
};

function summaryLine(s: VoiceFillSummary): string {
  const filled = s.singlesWritten + s.itemsWritten;
  if (filled === 0) return 'Nothing to add from that clip — try again or fill below.';
  const parts: string[] = [];
  if (s.singlesWritten) parts.push(`${s.singlesWritten} field${s.singlesWritten > 1 ? 's' : ''}`);
  if (s.itemsWritten) parts.push(`${s.itemsWritten} item${s.itemsWritten > 1 ? 's' : ''}`);
  return `Filled ${parts.join(' + ')} — review the suggestions below.`;
}

// "Talk about this section" prompts shown at the top of an enabled section. Each
// open prompt records one clip → AI fills its mapped fields as suggestions the
// inspector confirms below. Renders nothing unless the feature is on and the
// phase has authored prompts.
export function SectionVoicePrompts(props: SectionVoicePromptsProps) {
  const { phaseId } = props;
  const prompts = promptsForPhase(phaseId);
  const fill = useSectionVoiceFill({
    inspectionId: props.inspectionId,
    targetId: props.targetId,
    scope: props.scope,
    ctx: props.ctx,
    getAnswers: props.getAnswers,
    onRowsWritten: props.onRowsWritten,
  });

  if (!VOICE_FILL_ENABLED || prompts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-indigo-700">
        <span aria-hidden="true">🎙️</span> Fill by voice
      </div>
      {prompts.map((p) => {
        const active = fill.activePromptId === p.id;
        const btnStatus = active
          ? fill.status === 'thinking'
            ? 'transcribing'
            : fill.status
          : 'idle';
        return (
          <div key={p.id} className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-gray-700">{p.label}</p>
              <div className="shrink-0">
                <VoiceDictationButton
                  status={btnStatus}
                  online={fill.online}
                  elapsedMs={active ? fill.elapsedMs : 0}
                  disabled={fill.status !== 'idle' && !active}
                  transcribingLabel="Thinking…"
                  onStart={() => fill.onStart(p.id, phaseId, p.target_slugs)}
                  onStop={fill.onStop}
                />
              </div>
            </div>
            {active && (fill.status === 'recording' || fill.status === 'thinking') && fill.interim && (
              <p className="text-xs italic text-gray-500">“{fill.interim}”</p>
            )}
            {fill.summary?.promptId === p.id && (
              <div className="flex items-center gap-3">
                <p className="text-xs text-indigo-700">{summaryLine(fill.summary)}</p>
                {fill.canAcceptAll && (
                  <button
                    type="button"
                    onClick={fill.acceptAll}
                    className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Accept all
                  </button>
                )}
                {fill.accepted && <span className="text-xs text-emerald-700">✓ Accepted</span>}
              </div>
            )}
            {fill.error && active && (
              <p className="text-xs text-amber-700">Voice fill failed — try again or add manually.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
