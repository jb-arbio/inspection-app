import { localDb, type LocalAnswer } from './db';
import {
  phasesForScope,
  isScopeLevelRequired,
  isVisible,
  type FirstVisitQuestion,
} from './questions';
import type { HubScope } from './resolveScope';
import { isAnswered } from '@/components/firstVisit/ProgressRing';

// A target (deal / property / unit) the submit dialog needs a "what's left"
// list for. `answers` are this target's own answers; `phaseIds` optionally
// narrows to a phase subset (the deal scope is split into two cards).
export type RemainingTargetInput = {
  label: string;
  scope: HubScope;
  answers: LocalAnswer[];
  phaseIds?: string[];
};

// Pure: the unanswered, visible, scope-level required questions for one target.
// Reuses requiredVisible (visibility-aware) and isAnswered so the "what's left"
// list stays consistent with the completion ring's denominator. Empty array
// means this target is fully complete.
export function remainingRequiredForTarget(
  target: RemainingTargetInput,
): FirstVisitQuestion[] {
  const questions = phasesForScope(target.scope, target.phaseIds).flatMap(
    (p) => p.questions,
  );
  const byKey = new Map<string, LocalAnswer>();
  for (const a of target.answers) byKey.set(a.question_key, a);
  const valueByKey = new Map<string, unknown>(
    [...byKey.entries()].map(([k, a]) => [k, a.value]),
  );
  const required = requiredVisible(questions, valueByKey);
  return required.filter((q) => {
    const a = byKey.get(q.slug);
    return !(a && isAnswered(a.value));
  });
}

// A target grouped with its still-unanswered required questions, ready for the
// submit dialog to render. Targets that are complete are omitted by
// remainingRequiredByTarget below.
export type RemainingGroup = {
  label: string;
  questions: FirstVisitQuestion[];
};

// Aggregate the "what's left" list across every target in the visit. Each input
// is one target; groups with nothing remaining are dropped so the dialog only
// shows targets that still need work. Pure — callers pass already-loaded
// answers (the navigator holds them in state).
export function remainingRequiredByTarget(
  targets: RemainingTargetInput[],
): RemainingGroup[] {
  const groups: RemainingGroup[] = [];
  for (const t of targets) {
    const questions = remainingRequiredForTarget(t);
    if (questions.length > 0) groups.push({ label: t.label, questions });
  }
  return groups;
}

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
