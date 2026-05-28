'use client';

import { useEffect, useState } from 'react';
import VisitNavigator from '../[dealId]/[inspectionId]/VisitNavigator';
import { localDb } from '@/lib/firstVisit/db';
import type { HubSnapshot } from '@/lib/firstVisit/snapshot';

// Fixed UUIDs so the preview is deterministic across reloads.
const DEMO_DEAL_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_LOCATION_ID = '44444444-4444-4444-4444-444444444444';
const DEMO_UNIT_ID = '22222222-2222-2222-2222-222222222222';
const DEMO_INSPECTION_ID = '33333333-3333-3333-3333-333333333333';
const DEMO_PROPERTY_TARGET = '55555555-5555-5555-5555-555555555555';
const DEMO_UNIT_TARGET = '66666666-6666-6666-6666-666666666666';

// Mock hub snapshot — wires two real FV-survey slugs to fake data points so
// the Pre-filled / Accept / Edit affordance is visible in the preview.
const previewSnapshot: HubSnapshot = {
  deal: { id: DEMO_DEAL_ID },
  locations: [{ id: DEMO_LOCATION_ID }],
  units: [{ id: DEMO_UNIT_ID }],
  points: [
    { id: 'dp-deal-name', slug: 'fv_visit_deal_name' },
    { id: 'dp-floor', slug: 'fv_unit_floor_number' },
  ],
  values: [
    {
      data_point_id: 'dp-deal-name',
      scope_id: DEMO_DEAL_ID,
      source: 'owner',
      value: 'Demo Deal — Marienplatz',
      submitted_at: '2026-05-01T00:00:00Z',
    },
    {
      data_point_id: 'dp-floor',
      scope_id: DEMO_UNIT_ID,
      source: 'prefill_hubspot',
      value: 3,
      submitted_at: '2026-05-02T00:00:00Z',
    },
  ],
};

export default function PreviewPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await localDb.inspections.put({
        id: DEMO_INSPECTION_ID,
        deal_id: DEMO_DEAL_ID,
        status: 'draft',
        inspector_email: 'preview@arbio.com',
        started_at: new Date().toISOString(),
      });
      // Seed one property + one unit so the tree renders without network writes.
      await localDb.targets.put({
        id: DEMO_PROPERTY_TARGET,
        inspection_id: DEMO_INSPECTION_ID,
        kind: 'property',
        location_id: DEMO_LOCATION_ID,
        label: 'Demo Property',
        created_on_site: false,
        order: 0,
      });
      await localDb.targets.put({
        id: DEMO_UNIT_TARGET,
        inspection_id: DEMO_INSPECTION_ID,
        kind: 'unit',
        parent_id: DEMO_PROPERTY_TARGET,
        unit_category_id: DEMO_UNIT_ID,
        label: 'Demo Unit',
        created_on_site: false,
        order: 0,
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
          will pile up; click the Sync badge to inspect). The Deal name (visit)
          and Floor (unit) fields show Pre-filled badges from the mock snapshot.
        </div>
      </div>
      <VisitNavigator
        dealId={DEMO_DEAL_ID}
        inspectionId={DEMO_INSPECTION_ID}
        previewSnapshot={previewSnapshot}
        visitTitle="Preview Visit"
      />
    </>
  );
}
