'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { localDb, type LocalTarget } from '@/lib/firstVisit/db';
import { enqueue } from '@/lib/firstVisit/sync';
import { useSyncEngine } from '@/lib/firstVisit/useSyncEngine';
import { createHandlers } from '@/lib/firstVisit/handlers';
import { type HubSnapshot } from '@/lib/firstVisit/snapshot';
import { downloadInspectionZip } from '@/lib/firstVisit/export';
import { SyncBadge } from '@/components/firstVisit/SyncBadge';
import { track } from '@/lib/firstVisit/analytics';
import { UnitSurvey, type SurveyTarget } from './UnitSurvey';
import type { HubScope } from '@/lib/firstVisit/resolveScope';

// Raw hub rows carry extra display fields beyond the lean HubSnapshot type.
type HubLocation = { id: string; display_name?: string };
type HubUnit = {
  id: string;
  location_id?: string;
  category_type?: string;
  custom_name?: string;
  source_room_name?: string;
};
type RawSnapshot = Omit<HubSnapshot, 'deal' | 'locations' | 'units'> & {
  deal: { id: string; name?: string };
  locations: HubLocation[];
  units: HubUnit[];
};

function unitLabel(u: HubUnit): string {
  return u.custom_name?.trim() || u.source_room_name?.trim() || u.category_type || 'Unit';
}

type Selection =
  | { kind: 'deal' }
  | { kind: 'property'; target: LocalTarget }
  | { kind: 'unit'; target: LocalTarget; property: LocalTarget };

export default function VisitNavigator({
  dealId,
  inspectionId,
  previewSnapshot,
  visitTitle,
}: {
  dealId: string;
  inspectionId: string;
  previewSnapshot?: HubSnapshot;
  visitTitle?: string;
}) {
  const [targets, setTargets] = useState<LocalTarget[]>([]);
  const [snapshot, setSnapshot] = useState<RawSnapshot | null>(
    (previewSnapshot as RawSnapshot) ?? null,
  );
  const [selected, setSelected] = useState<Selection | null>(null);
  const [adding, setAdding] = useState<null | { kind: 'property' } | { kind: 'unit'; property: LocalTarget }>(null);
  const handlers = useMemo(() => createHandlers(), []);
  const { pending, syncNow, syncing } = useSyncEngine(handlers);

  const reloadTargets = useCallback(async () => {
    const rows = await localDb.targets
      .where('inspection_id')
      .equals(inspectionId)
      .toArray();
    rows.sort((a, b) => a.order - b.order);
    setTargets(rows);
  }, [inspectionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount; matches existing first-visit effects
    void reloadTargets();
  }, [reloadTargets]);

  useEffect(() => {
    if (previewSnapshot) return;
    fetch(`/api/first-visit/deals/${dealId}/snapshot`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSnapshot)
      .catch(() => setSnapshot(null));
  }, [dealId, previewSnapshot]);

  const properties = targets.filter((t) => t.kind === 'property');
  const unitsOf = (propId: string) =>
    targets.filter((t) => t.kind === 'unit' && t.parent_id === propId);

  // Hub locations / units not yet added to the visit tree.
  const usedLocationIds = new Set(properties.map((p) => p.location_id).filter(Boolean));
  const unusedLocations = (snapshot?.locations ?? []).filter((l) => !usedLocationIds.has(l.id));

  const persistTarget = async (t: LocalTarget) => {
    await localDb.targets.put(t);
    await enqueue('target_upsert', t);
    await reloadTargets();
  };

  const addPropertyFromHub = async (loc: HubLocation) => {
    const t: LocalTarget = {
      id: crypto.randomUUID(),
      inspection_id: inspectionId,
      kind: 'property',
      location_id: loc.id,
      label: loc.display_name?.trim() || 'Property',
      created_on_site: false,
      order: properties.length,
    };
    track('property_added', { from: 'hub' });
    await persistTarget(t);
    setAdding(null);
  };

  const addPropertyOnSite = async (label: string) => {
    const res = await fetch(`/api/first-visit/deals/${dealId}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: label }),
    });
    if (!res.ok) {
      alert('Could not create property on the hub.');
      return;
    }
    const { location } = await res.json();
    const t: LocalTarget = {
      id: crypto.randomUUID(),
      inspection_id: inspectionId,
      kind: 'property',
      location_id: location.id,
      label,
      created_on_site: true,
      order: properties.length,
    };
    track('property_added', { from: 'on_site' });
    await persistTarget(t);
    setAdding(null);
  };

  const addUnitFromHub = async (property: LocalTarget, unit: HubUnit) => {
    const siblings = unitsOf(property.id);
    const t: LocalTarget = {
      id: crypto.randomUUID(),
      inspection_id: inspectionId,
      kind: 'unit',
      parent_id: property.id,
      unit_category_id: unit.id,
      label: unitLabel(unit),
      created_on_site: false,
      order: siblings.length,
    };
    track('unit_added', { from: 'hub' });
    await persistTarget(t);
    setAdding(null);
  };

  const addUnitOnSite = async (property: LocalTarget, label: string) => {
    if (!property.location_id) {
      alert('This property has no hub location yet.');
      return;
    }
    const res = await fetch(
      `/api/first-visit/deals/${dealId}/locations/${property.location_id}/units`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_type: label }),
      },
    );
    if (!res.ok) {
      alert('Could not create unit on the hub.');
      return;
    }
    const { unit } = await res.json();
    const siblings = unitsOf(property.id);
    const t: LocalTarget = {
      id: crypto.randomUUID(),
      inspection_id: inspectionId,
      kind: 'unit',
      parent_id: property.id,
      unit_category_id: unit.id,
      label,
      created_on_site: true,
      order: siblings.length,
    };
    track('unit_added', { from: 'on_site' });
    await persistTarget(t);
    setAdding(null);
  };

  const submit = async () => {
    if (!confirm('Submit this visit? You will not be able to edit it after.')) return;
    track('submit_clicked', { inspection_id: inspectionId });
    await localDb.inspections.update(inspectionId, {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });
    await enqueue('submit', { inspection_id: inspectionId });
    syncNow().catch(() => {});
  };

  // --- Survey view ---------------------------------------------------------
  if (selected) {
    let target: SurveyTarget;
    let scope: HubScope;
    let ctx;
    if (selected.kind === 'deal') {
      target = { id: inspectionId, label: 'Visit details' };
      scope = 'deal';
      ctx = { deal_id: dealId };
    } else if (selected.kind === 'property') {
      target = { id: selected.target.id, label: selected.target.label };
      scope = 'location';
      ctx = { deal_id: dealId, location_id: selected.target.location_id };
    } else {
      target = { id: selected.target.id, label: selected.target.label };
      scope = 'unit_category';
      ctx = {
        deal_id: dealId,
        location_id: selected.property.location_id,
        unit_category_id: selected.target.unit_category_id,
      };
    }
    return (
      <UnitSurvey
        inspectionId={inspectionId}
        target={target}
        scope={scope}
        ctx={ctx}
        snapshot={snapshot}
        onBack={() => setSelected(null)}
      />
    );
  }

  // --- Navigator view ------------------------------------------------------
  return (
    <main className="mx-auto max-w-md p-6">
      <header className="sticky top-0 z-10 bg-white pb-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">{visitTitle ?? 'First Visit'}</h1>
          <div className="flex items-center gap-2 text-xs">
            <SyncBadge pending={pending} syncing={syncing} />
            <button
              onClick={syncNow}
              disabled={syncing}
              className="rounded border border-gray-300 px-2 py-0.5 disabled:opacity-50"
            >
              Sync now
            </button>
            <button
              onClick={() => downloadInspectionZip(inspectionId)}
              className="rounded border border-gray-300 px-2 py-0.5"
            >
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Visit details (deal-scoped) */}
      <button
        onClick={() => setSelected({ kind: 'deal' })}
        className="mt-3 block w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
      >
        <div className="text-sm font-medium">Visit details</div>
        <div className="text-xs text-gray-500">Questions answered once for the whole visit</div>
      </button>

      {/* Properties */}
      <section className="mt-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Properties</h2>
        <div className="mt-2 flex flex-col gap-3">
          {properties.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200">
              <button
                onClick={() => setSelected({ kind: 'property', target: p })}
                className="block w-full p-3 text-left hover:bg-gray-50"
              >
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-gray-500">Property questions</div>
              </button>
              <div className="border-t border-gray-100 px-3 py-2">
                <div className="flex flex-col gap-1.5">
                  {unitsOf(p.id).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelected({ kind: 'unit', target: u, property: p })}
                      className="block w-full rounded border border-gray-100 px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
                <AddUnitControl
                  open={adding?.kind === 'unit' && adding.property.id === p.id}
                  onOpen={() => setAdding({ kind: 'unit', property: p })}
                  onCancel={() => setAdding(null)}
                  unusedUnits={(snapshot?.units ?? []).filter(
                    (u) =>
                      u.location_id === p.location_id &&
                      !unitsOf(p.id).some((t) => t.unit_category_id === u.id),
                  )}
                  unitLabel={unitLabel}
                  onPickHub={(u) => addUnitFromHub(p, u)}
                  onCreate={(label) => addUnitOnSite(p, label)}
                />
              </div>
            </div>
          ))}
        </div>

        <AddPropertyControl
          open={adding?.kind === 'property'}
          onOpen={() => setAdding({ kind: 'property' })}
          onCancel={() => setAdding(null)}
          unusedLocations={unusedLocations}
          onPickHub={addPropertyFromHub}
          onCreate={addPropertyOnSite}
        />
      </section>

      <button
        onClick={submit}
        className="mt-6 w-full rounded-md bg-black px-4 py-3 text-white"
      >
        Submit visit
      </button>
    </main>
  );
}

function AddPropertyControl({
  open,
  onOpen,
  onCancel,
  unusedLocations,
  onPickHub,
  onCreate,
}: {
  open: boolean;
  onOpen: () => void;
  onCancel: () => void;
  unusedLocations: HubLocation[];
  onPickHub: (l: HubLocation) => void;
  onCreate: (label: string) => void;
}) {
  const [label, setLabel] = useState('');
  if (!open) {
    return (
      <button
        onClick={onOpen}
        className="mt-3 rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        + Add property
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-gray-200 p-3">
      {unusedLocations.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-500">From the hub</div>
          <div className="mt-1 flex flex-col gap-1">
            {unusedLocations.map((l) => (
              <button
                key={l.id}
                onClick={() => onPickHub(l)}
                className="rounded border border-gray-100 px-2 py-1 text-left text-sm hover:bg-gray-50"
              >
                {l.display_name?.trim() || 'Property'}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="text-xs text-gray-500">Or add on-site</div>
      <div className="mt-1 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Property name"
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          onClick={() => label.trim() && onCreate(label.trim())}
          className="rounded bg-black px-3 py-1 text-sm text-white"
        >
          Add
        </button>
      </div>
      <button onClick={onCancel} className="mt-2 text-xs text-gray-400 hover:text-gray-700">
        Cancel
      </button>
    </div>
  );
}

function AddUnitControl({
  open,
  onOpen,
  onCancel,
  unusedUnits,
  unitLabel,
  onPickHub,
  onCreate,
}: {
  open: boolean;
  onOpen: () => void;
  onCancel: () => void;
  unusedUnits: HubUnit[];
  unitLabel: (u: HubUnit) => string;
  onPickHub: (u: HubUnit) => void;
  onCreate: (label: string) => void;
}) {
  const [label, setLabel] = useState('');
  if (!open) {
    return (
      <button
        onClick={onOpen}
        className="mt-2 text-xs text-gray-500 hover:text-gray-900"
      >
        + Add unit
      </button>
    );
  }
  return (
    <div className="mt-2 rounded border border-gray-200 p-2">
      {unusedUnits.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-500">From the hub</div>
          <div className="mt-1 flex flex-col gap-1">
            {unusedUnits.map((u) => (
              <button
                key={u.id}
                onClick={() => onPickHub(u)}
                className="rounded border border-gray-100 px-2 py-1 text-left text-sm hover:bg-gray-50"
              >
                {unitLabel(u)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="text-xs text-gray-500">Or add on-site</div>
      <div className="mt-1 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Unit name"
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          onClick={() => label.trim() && onCreate(label.trim())}
          className="rounded bg-black px-3 py-1 text-sm text-white"
        >
          Add
        </button>
      </div>
      <button onClick={onCancel} className="mt-1 text-xs text-gray-400 hover:text-gray-700">
        Cancel
      </button>
    </div>
  );
}
