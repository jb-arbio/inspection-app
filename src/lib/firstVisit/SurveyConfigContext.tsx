'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { PHASES, ALL_QUESTIONS, type FirstVisitPhase, type FirstVisitQuestion } from './questions';

export type SurveyConfig = {
  phases: FirstVisitPhase[];
  allQuestions: FirstVisitQuestion[];
  version?: number;
};

const SEED: SurveyConfig = { phases: PHASES, allQuestions: ALL_QUESTIONS };
const Ctx = createContext<SurveyConfig>(SEED);

export function SurveyConfigProvider({ value, children }: { value?: SurveyConfig; children: ReactNode }) {
  const resolved = useMemo<SurveyConfig>(() => value ?? SEED, [value]);
  return <Ctx.Provider value={resolved}>{children}</Ctx.Provider>;
}

export function useSurveyConfig(): SurveyConfig {
  return useContext(Ctx);
}
