import { localDb, type LocalAnswer } from './db';
import {
  phasesForScope,
  isScopeLevelRequired,
  isVisible,
  type FirstVisitQuestion,
} from './questions';
import type { HubScope } from './resolveScope';
import { isAnswered } from '@/components/firstVisit/ProgressRing';

export type ScopeProgress = { done: number; total: number };

// Scope-level required questions that are currently visible. A question hidden
// by an unsatisfied visible_when rule must not count toward the ring's total,
// otherwise the ring becomes uncompletable. Pure — no Dexie; reused by the
// submit dialog's "unanswered required" list. answersByKey maps controlling-
// question slug → answer value.
export function requiredVisible(
  questions: FirstVisitQuestion[],
  answersByKey: Map<string, unknown>,
): FirstVisitQuestion[] {
  return questions.filter(
    (q) => isScopeLevelRequired(q) && isVisible(q.visible_when, answersByKey),
  );
}

// Count required questions for a scope and how many are answered at the given
// target_id. Required-only — optional questions never contribute to the ring.
export function computeProgressFromAnswers(
  scope: HubScope,
  answers: LocalAnswer[],
  phaseIds?: string[],
): ScopeProgress {
  const questions = phasesForScope(scope, phaseIds).flatMap((p) => p.questions);
  const byKey = new Map<string, LocalAnswer>();
  for (const a of answers) byKey.set(a.question_key, a);
  // Repeater-group members (group_id set, e.g. findings, check-in steps) are
  // required only within a populated block, never at scope level — see
  // isScopeLevelRequired. Questions hidden by an unsatisfied visible_when rule
  // are likewise excluded. Both keep the ring completable.
  const valueByKey = new Map<string, unknown>(
    [...byKey.entries()].map(([k, a]) => [k, a.value]),
  );
  const required = requiredVisible(questions, valueByKey);
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
