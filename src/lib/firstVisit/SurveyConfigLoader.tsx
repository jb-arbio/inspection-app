'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { SurveyConfigProvider, type SurveyConfig } from './SurveyConfigContext';
import { loadActiveSurveyConfig } from './loadSurveyConfig';

// Loads the active published survey config on mount and feeds it to the provider.
// Until it resolves (and on any failure) the provider falls back to the bundled
// seed (SurveyConfigProvider treats undefined value as seed), so the survey is
// never blocked — matching the offline-first contract.
export function SurveyConfigLoader({ version, children }: { version?: number; children: ReactNode }) {
  const [config, setConfig] = useState<SurveyConfig | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    loadActiveSurveyConfig({ version })
      .then((c) => { if (alive) setConfig(c); })
      .catch(() => { /* provider keeps seed */ });
    return () => { alive = false; };
  }, [version]);
  return <SurveyConfigProvider value={config}>{children}</SurveyConfigProvider>;
}
