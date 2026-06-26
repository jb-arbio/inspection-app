import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SurveyConfigProvider,
  useSurveyConfig,
  type SurveyConfig,
} from '../SurveyConfigContext';
import { PHASES, ALL_QUESTIONS } from '../questions';

function Probe() {
  const { phases, allQuestions, version } = useSurveyConfig();
  return (
    <div>
      <span data-testid="phases">{phases.length}</span>
      <span data-testid="questions">{allQuestions.length}</span>
      <span data-testid="version">{version ?? 'none'}</span>
    </div>
  );
}

describe('SurveyConfigContext', () => {
  it('defaults to the bundled PHASES / ALL_QUESTIONS when no value prop is given', () => {
    render(
      <SurveyConfigProvider>
        <Probe />
      </SurveyConfigProvider>,
    );
    expect(screen.getByTestId('phases').textContent).toBe(String(PHASES.length));
    expect(screen.getByTestId('questions').textContent).toBe(
      String(ALL_QUESTIONS.length),
    );
    expect(screen.getByTestId('version').textContent).toBe('none');
  });

  it('reflects a custom config supplied via the value prop', () => {
    const custom: SurveyConfig = { phases: [], allQuestions: [], version: 7 };
    render(
      <SurveyConfigProvider value={custom}>
        <Probe />
      </SurveyConfigProvider>,
    );
    expect(screen.getByTestId('phases').textContent).toBe('0');
    expect(screen.getByTestId('questions').textContent).toBe('0');
    expect(screen.getByTestId('version').textContent).toBe('7');
  });
});
