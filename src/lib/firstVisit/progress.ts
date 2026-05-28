import { localDb, type LocalAnswer } from './db';
import { phasesForScope } from './questions';
import type { HubScope } from './resolveScope';
import { isAnswered } from '@/components/firstVisit/ProgressRing';

export type ScopeProgress = { done: number; total: number };

// Count required questions for a scope and how many are answered at the given
// target_id. Required-only — optional questions never contribute to the ring.
export function computeProgressFromAnswers(
  scope: HubScope,
  answers: LocalAnswer[],
): ScopeProgress {
  const questions = phasesForScope(scope).flatMap((p) => p.questions);
  const required = questions.filter((q) => q.required);
  const byKey = new Map<string, LocalAnswer>();
  for (const a of answers) byKey.set(a.question_key, a);
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
): Promise<ScopeProgress> {
  const answers = await loadAnswersForTarget(targetId);
  return computeProgressFromAnswers(scope, answers);
}
