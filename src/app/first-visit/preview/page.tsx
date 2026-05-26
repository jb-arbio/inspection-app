'use client';

import { useEffect, useState } from 'react';
import SurveyFlow from '../[dealId]/[inspectionId]/SurveyFlow';
import { localDb } from '@/lib/firstVisit/db';
import type { HubSnapshot } from '@/lib/firstVisit/snapshot';

// Fixed UUIDs so the preview is deterministic across reloads.
const DEMO_DEAL_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_UNIT_ID = '22222222-2222-2222-2222-222222222222';
const DEMO_INSPECTION_ID = '33333333-3333-3333-3333-333333333333';

// Mock hub snapshot — wires two of the DEV_QUESTIONS to fake data points so
// the Pre-filled / Accept / Edit affordance is visible.
const previewSnapshot: HubSnapshot = {
  deal: { id: DEMO_DEAL_ID },
  locations: [],
  units: [{ id: DEMO_UNIT_ID }],
  points: [
    { id: 'dp-wifi', slug: 'wifi_password', level: 'deal' },
    { id: 'dp-beds', slug: 'beds_count', level: 'unit' },
  ],
  values: [
    {
      data_point_id: 'dp-wifi',
      scope_id: DEMO_DEAL_ID,
      source: 'owner',
      value: 'HelloRouter-2026',
      submitted_at: '2026-05-01T00:00:00Z',
    },
    {
      data_point_id: 'dp-beds',
      scope_id: DEMO_UNIT_ID,
      source: 'prefill_hubspot',
      value: 2,
      submitted_at: '2026-05-02T00:00:00Z',
    },
  ],
};

export default function PreviewPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Seed a local inspection so MediaButtons / answers have a home.
      await localDb.inspections.put({
        id: DEMO_INSPECTION_ID,
        deal_id: DEMO_DEAL_ID,
        unit_category_id: DEMO_UNIT_ID,
        status: 'draft',
        inspector_email: 'preview@arbio.com',
        started_at: new Date().toISOString(),
      });
      setReady(true);
    })();
  }, []);

  if (!ready) return <main className="p-6 text-sm text-gray-500">Loading preview…</main>;

  return (
    <>
      <div className="mx-auto max-w-md px-6 pt-4 text-xs text-yellow-900">
        <div className="rounded bg-yellow-100 px-3 py-2">
          Preview mode — mocked snapshot, no network writes succeed (outbox jobs
          will pile up; click the Sync badge to inspect). DEV_QUESTIONS have been
          patched with two demo <code>data_point_slug</code>s so Pre-filled
          badges appear on the WiFi and Beds fields.
        </div>
      </div>
      <SurveyFlow
        dealId={DEMO_DEAL_ID}
        inspectionId={DEMO_INSPECTION_ID}
        previewSnapshot={previewSnapshot}
        previewUnitCategoryId={DEMO_UNIT_ID}
      />
    </>
  );
}
