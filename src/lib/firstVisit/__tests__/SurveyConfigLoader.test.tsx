import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SurveyConfigLoader } from '../SurveyConfigLoader';
import { useSurveyConfig, type SurveyConfig } from '../SurveyConfigContext';
import { PHASES } from '../questions';
import { loadActiveSurveyConfig } from '../loadSurveyConfig';

vi.mock('../loadSurveyConfig', () => ({ loadActiveSurveyConfig: vi.fn() }));

const mockLoad = vi.mocked(loadActiveSurveyConfig);

function Probe() {
  const cfg = useSurveyConfig();
  return (
    <div>
      <span data-testid="phases">{cfg.phases.length}</span>
      <span data-testid="version">{cfg.version ?? 'none'}</span>
    </div>
  );
}

describe('SurveyConfigLoader', () => {
  beforeEach(() => {
    mockLoad.mockReset();
  });

  it('shows the bundled seed before the loader resolves', () => {
    // Never-resolving promise: keeps the loader pending.
    mockLoad.mockReturnValue(new Promise<SurveyConfig>(() => {}));
    render(
      <SurveyConfigLoader>
        <Probe />
      </SurveyConfigLoader>,
    );
    expect(screen.getByTestId('phases')).toHaveTextContent(String(PHASES.length));
    expect(screen.getByTestId('version')).toHaveTextContent('none');
  });

  it('feeds the loaded config to the provider once it resolves', async () => {
    const fakePhase = PHASES[0];
    const loaded: SurveyConfig = {
      phases: [fakePhase],
      allQuestions: [],
      version: 5,
    };
    mockLoad.mockResolvedValue(loaded);
    render(
      <SurveyConfigLoader>
        <Probe />
      </SurveyConfigLoader>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('phases')).toHaveTextContent('1');
      expect(screen.getByTestId('version')).toHaveTextContent('5');
    });
  });
});
