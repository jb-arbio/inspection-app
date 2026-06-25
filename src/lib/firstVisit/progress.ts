import { localDb, type LocalAnswer } from './db';
import {
  PHASES,
  filterPhasesForScope,
  isScopeLevelRequired,
  isVisible,
  type FirstVisitPhase,
} from './questions';
import type { HubScope } from './resolveScope';
import { isAnswered } from '@/components/firstVisit/ProgressRing';

export type ScopeProgress = { done: number; total: number };

// Count required questions for a scope and how many are answered at the given
// target_id. Required-only — optional questions never contribute to the ring.
// `phases` defaults to the bundled PHASES config; injecting a different set
// (e.g. a survey loaded from the hub) lets the same denominator logic run
// against config that isn't the compiled-in module — zero behavior change for
// existing callers.
export function computeProgressFromAnswers(
  scope: HubScope,
  answers: LocalAnswer[],
  phaseIds?: string[],
  phases: FirstVisitPhase[] = PHASES,
): ScopeProgress {
  // Filter the injected `phases` to this scope (and optional phaseIds) using the
  // shared helper, then flatten to its questions.
  const questions = filterPhasesForScope(phases, scope, phaseIds).flatMap(
    (p) => p.questions,
  );
  const byKey = new Map<string, LocalAnswer>();
  for (const a of answers) byKey.set(a.question_key, a);
  // Controlling answers for visibility gates: slug → current value. Gate
  // controllers are single-instance questions, so question_key === slug.
  const answersByValue = new Map<string, unknown>();
  for (const a of answers) answersByValue.set(a.question_key, a.value);
  // Repeater-group members (group_id set, e.g. findings, check-in steps) are
  // required only within a populated block, never at scope level — see
  // isScopeLevelRequired. Excluding them keeps the ring completable for a
  // unit/building with zero findings. Questions hidden by a `visible_when` gate
  // are also excluded — a collapsed block must never make the ring
  // uncompletable.
  const required = questions
    .filter(isScopeLevelRequired)
    .filter((q) => isVisible(q.visible_when, answersByValue));
  let done = 0;
  for (const q of required) {
    const a = byKey.get(q.slug);
    if (a && isAnswered(a.value)) done += 1;
  }
  return { done, total: required.length };
}

export async function loadAnswersForTarget(targetId: string): Promise<LocalAnswer[]> {
  return localDb.answers.where('target_id').equals(targetId).toArray();
}

export async function loadProgressForTarget(
  targetId: string,
  scope: HubScope,
  phaseIds?: string[],
): Promise<ScopeProgress> {
  const answers = await loadAnswersForTarget(targetId);
  return computeProgressFromAnswers(scope, answers, phaseIds);
}
