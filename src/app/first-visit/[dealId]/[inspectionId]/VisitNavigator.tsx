'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { localDb, type LocalAnswer, type LocalTarget } from '@/lib/firstVisit/db';
import { enqueue } from '@/lib/firstVisit/sync';
import { useSyncEngine } from '@/lib/firstVisit/useSyncEngine';
import { createHandlers } from '@/lib/firstVisit/handlers';
import { type HubSnapshot } from '@/lib/firstVisit/snapshot';
import { downloadInspectionZip } from '@/lib/firstVisit/export';
import { SyncBadge } from '@/components/firstVisit/SyncBadge';
import { ProgressRing } from '@/components/firstVisit/ProgressRing';
import { track } from '@/lib/firstVisit/analytics';
import { UnitSurvey, type SurveyTarget } from './UnitSurvey';
import type { HubScope } from '@/lib/firstVisit/resolveScope';
import {
  computeProgressFromAnswers,
  type ScopeProgress,
} from '@/lib/firstVisit/progress';

// Raw hub rows carry extra display fields beyond the lean HubSnapshot type.
type HubLocation = { id: string; display_name?: string };
type HubUnit = {
  id: string;
  location_id?: string;
  category_type?: string;
  custom_name?: string;
  source_room_name?: string;
  // Optional metadata that may or may not be present on the row; rendered
  // under the chip label when available.
  floor?: string | number | null;
  beds?: string | number | null;
  bedrooms?: string | number | null;
  bathrooms?: string | number | null;
  max_guests?: string | number | null;
  size_sqm?: string | number | null;
};
type RawSnapshot = Omit<HubSnapshot, 'deal' | 'locations' | 'units'> & {
  deal: { id: string; name?: string };
  locations: HubLocation[];
  units: HubUnit[];
};

function unitLabel(u: HubUnit): string {
  return u.custom_name?.trim() || u.source_room_name?.trim() || u.category_type || 'Unit';
}

// Build a compact secondary metadata line for a hub unit chip. Skips fields
// the hub didn't fill in, and falls back to undefined if there's nothing to
// show so the caller can avoid rendering an empty line.
function unitMetaLine(u: HubUnit): string | undefined {
  const parts: string[] = [];
  if (u.category_type && u.category_type !== 'default') {
    parts.push(String(u.category_type));
  }
  if (u.floor !== undefined && u.floor !== null && String(u.floor).trim() !== '') {
    parts.push(`floor ${u.floor}`);
  }
  const beds = u.bedrooms ?? u.beds;
  if (beds !== undefined && beds !== null && String(beds).trim() !== '') {
    parts.push(`${beds} bed${String(beds) === '1' ? '' : 's'}`);
  }
  if (
    u.bathrooms !== undefined &&
    u.bathrooms !== null &&
    String(u.bathrooms).trim() !== ''
  ) {
    parts.push(`${u.bathrooms} bath${String(u.bathrooms) === '1' ? '' : 's'}`);
  }
  if (
    u.max_guests !== undefined &&
    u.max_guests !== null &&
    String(u.max_guests).trim() !== ''
  ) {
    parts.push(`sleeps ${u.max_guests}`);
  }
  if (u.size_sqm !== undefined && u.size_sqm !== null && String(u.size_sqm).trim() !== '') {
    parts.push(`${u.size_sqm} m²`);
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
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
  const [answers, setAnswers] = useState<LocalAnswer[]>([]);
  const [snapshot, setSnapshot] = useState<RawSnapshot | null>(
    (previewSnapshot as RawSnapshot) ?? null,
  );
  const [selected, setSelected] = useState<Selection | null>(null);
  const [adding, setAdding] = useState<null | { kind: 'property' } | { kind: 'unit'; property: LocalTarget }>(null);
  const [renamingUnitId, setRenamingUnitId] = useState<string | null>(null);
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

  const reloadAnswers = useCallback(async () => {
    const rows = await localDb.answers
      .where('inspection_id')
      .equals(inspectionId)
      .toArray();
    setAnswers(rows);
  }, [inspectionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount; matches existing first-visit effects
    void reloadTargets();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount
    void reloadAnswers();
  }, [reloadTargets, reloadAnswers]);

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

  const progressFor = (targetId: string, scope: HubScope): ScopeProgress => {
    const own = answers.filter((a) => a.target_id === targetId);
    return computeProgressFromAnswers(scope, own);
  };

  // Count required questions still unanswered across every scope in this
  // visit: deal-scoped (target_id === inspectionId), each property, each unit.
  const totalUnansweredRequired = (): number => {
    let total = 0;
    const dealProgress = progressFor(inspectionId, 'deal');
    total += dealProgress.total - dealProgress.done;
    for (const p of properties) {
      const lp = progressFor(p.id, 'location');
      total += lp.total - lp.done;
      for (const u of unitsOf(p.id)) {
        const up = progressFor(u.id, 'unit_category');
        total += up.total - up.done;
      }
    }
    return total;
  };

  const deleteProperty = async (p: LocalTarget) => {
    if (!confirm(`Delete ${p.label || 'this property'} and all its units?`)) return;
    const children = unitsOf(p.id);
    const childIds = children.map((c) => c.id);
    const allIds = [p.id, ...childIds];

    // Delete answers attached to the property and all its child units.
    for (const id of allIds) {
      const rows = await localDb.answers.where('target_id').equals(id).toArray();
      if (rows.length > 0) {
        await localDb.answers.bulkDelete(rows.map((r) => r.id));
      }
    }
    // Delete the LocalTargets (property + all units).
    await localDb.targets.bulkDelete(allIds);
    // TODO: hub-side cascade delete (locations + unit_categories) once API exists.
    for (const id of allIds) {
      await enqueue('target_delete', { id, inspection_id: inspectionId });
    }
    track('property_deleted', { had_units: childIds.length });
    await reloadTargets();
    await reloadAnswers();
  };

  const deleteUnit = async (u: LocalTarget) => {
    if (!confirm(`Delete ${u.label || 'this unit'}?`)) return;
    const rows = await localDb.answers.where('target_id').equals(u.id).toArray();
    if (rows.length > 0) {
      await localDb.answers.bulkDelete(rows.map((r) => r.id));
    }
    await localDb.targets.delete(u.id);
    // TODO: hub-side delete of unit_categories row once API exists.
    await enqueue('target_delete', { id: u.id, inspection_id: inspectionId });
    track('unit_deleted', {});
    await reloadTargets();
    await reloadAnswers();
  };

  // Hub locations / units not yet added to the visit tree.
  const usedLocationIds = new Set(properties.map((p) => p.location_id).filter(Boolean));
  const unusedLocations = (snapshot?.locations ?? []).filter((l) => !usedLocationIds.has(l.id));

  const persistTarget = async (t: LocalTarget) => {
    await localDb.targets.put(t);
    await enqueue('target_upsert', t);
    await reloadTargets();
  };

  const renameUnit = async (u: LocalTarget, nextLabel: string) => {
    const trimmed = nextLabel.trim();
    if (!trimmed || trimmed === u.label) {
      setRenamingUnitId(null);
      return;
    }
    track('unit_renamed', { from: u.label, to: trimmed });
    await persistTarget({ ...u, label: trimmed });
    setRenamingUnitId(null);
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

  const addUnitFromHub = async (property: LocalTarget, unit: HubUnit, label: string) => {
    const siblings = unitsOf(property.id);
    const t: LocalTarget = {
      id: crypto.randomUUID(),
      inspection_id: inspectionId,
      kind: 'unit',
      parent_id: property.id,
      unit_category_id: unit.id,
      label,
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
    const missing = totalUnansweredRequired();
    const message =
      missing > 0
        ? `${missing} required question${missing === 1 ? '' : 's'} still unanswered. Submit anyway?`
        : 'Submit this visit? You will not be able to edit it after.';
    if (!confirm(message)) return;
    track('submit_clicked', { inspection_id: inspectionId, missing_required: missing });
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
    let breadcrumb: string[] | undefined;
    if (selected.kind === 'deal') {
      target = { id: inspectionId, label: 'Visit details' };
      scope = 'deal';
      ctx = { deal_id: dealId };
    } else if (selected.kind === 'property') {
      target = { id: selected.target.id, label: selected.target.label };
      scope = 'location';
      ctx = { deal_id: dealId, location_id: selected.target.location_id };
      breadcrumb = [selected.target.label];
    } else {
      target = { id: selected.target.id, label: selected.target.label };
      scope = 'unit_category';
      ctx = {
        deal_id: dealId,
        location_id: selected.property.location_id,
        unit_category_id: selected.target.unit_category_id,
      };
      breadcrumb = [selected.property.label, selected.target.label];
    }
    return (
      <UnitSurvey
        inspectionId={inspectionId}
        target={target}
        scope={scope}
        ctx={ctx}
        snapshot={snapshot}
        onBack={() => {
          setSelected(null);
          void reloadAnswers();
        }}
        breadcrumb={breadcrumb}
      />
    );
  }

  // --- Navigator view ------------------------------------------------------
  const dealName = snapshot?.deal?.name?.trim() || visitTitle;
  const locationLabels = (snapshot?.locations ?? [])
    .map((l) => l.display_name?.trim())
    .filter((s): s is string => !!s);
  const addressLine =
    locationLabels.length === 0
      ? undefined
      : locationLabels.length === 1
        ? locationLabels[0]
        : `${locationLabels[0]} (+${locationLabels.length - 1} more)`;

  return (
    <main className="mx-auto max-w-md p-6">
      <header className="sticky top-0 z-10 bg-white pb-2">
        {/* Thin nav chrome — back to deal picker on the left, home on the right. */}
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <Link
            href="/first-visit/new"
            tabIndex={-1}
            className="inline-flex items-center gap-1 hover:text-gray-900"
          >
            <span aria-hidden>←</span> Pick another deal
          </Link>
          <Link
            href="/first-visit"
            tabIndex={-1}
            aria-label="Home"
            title="Home — my visits"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
            </svg>
          </Link>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {dealName ? (
              <h1 className="truncate text-lg font-semibold">{dealName}</h1>
            ) : (
              // Skeleton until the snapshot fetch lands — avoids flashing a
              // stale "First Visit" label before the deal name arrives.
              <div className="h-6 w-40 animate-pulse rounded bg-gray-200" aria-hidden />
            )}
            {addressLine ? (
              <p className="truncate text-xs text-gray-500">{addressLine}</p>
            ) : !snapshot ? (
              <div className="mt-1 h-3 w-56 animate-pulse rounded bg-gray-100" aria-hidden />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs">
            <SyncBadge pending={pending} syncing={syncing} />
            <button
              onClick={syncNow}
              disabled={syncing}
              tabIndex={-1}
              className="rounded border border-gray-300 px-2 py-0.5 disabled:opacity-50"
            >
              Sync now
            </button>
            <button
              onClick={() => downloadInspectionZip(inspectionId)}
              tabIndex={-1}
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
        className="mt-3 flex w-full items-center gap-2 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
      >
        <div className="flex-1">
          <div className="text-sm font-medium">Visit details</div>
          <div className="text-xs text-gray-500">Questions answered once for the whole visit</div>
        </div>
        {(() => {
          const pr = progressFor(inspectionId, 'deal');
          return pr.total > 0 ? <ProgressRing done={pr.done} total={pr.total} size={32} /> : null;
        })()}
        <span aria-hidden className="text-gray-400">›</span>
      </button>

      {/* Properties */}
      <section className="mt-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Properties</h2>
        <div className="mt-2 flex flex-col gap-3">
          {properties.map((p) => {
            const propProgress = progressFor(p.id, 'location');
            return (
              <div key={p.id} className="rounded-lg border border-gray-200">
                <div className="flex w-full items-center gap-1 p-3">
                  <button
                    type="button"
                    onClick={() => setSelected({ kind: 'property', target: p })}
                    className="-m-1 flex flex-1 items-center gap-2 rounded-md p-1 text-left hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="text-xs text-gray-500">Tap to open property questions</div>
                    </div>
                    {propProgress.total > 0 ? (
                      <ProgressRing
                        done={propProgress.done}
                        total={propProgress.total}
                        size={32}
                      />
                    ) : null}
                    <span aria-hidden className="text-gray-400">›</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProperty(p)}
                    title="Delete property"
                    aria-label={`Delete ${p.label}`}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-red-600"
                  >
                    🗑
                  </button>
                </div>
                <div className="border-t border-gray-100 px-3 py-2">
                  <div className="flex flex-col gap-1.5">
                    {unitsOf(p.id).map((u) => {
                      const unitProgress = progressFor(u.id, 'unit_category');
                      return (
                        <UnitRow
                          key={u.id}
                          unit={u}
                          isRenaming={renamingUnitId === u.id}
                          progress={unitProgress}
                          onOpen={() => setSelected({ kind: 'unit', target: u, property: p })}
                          onStartRename={() => setRenamingUnitId(u.id)}
                          onCancelRename={() => setRenamingUnitId(null)}
                          onSaveRename={(label) => renameUnit(u, label)}
                          onDelete={() => deleteUnit(u)}
                        />
                      );
                    })}
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
                    unitMeta={unitMetaLine}
                    onAddFromHub={(u, label) => addUnitFromHub(p, u, label)}
                    onAddOnSite={(label) => addUnitOnSite(p, label)}
                  />
                </div>
              </div>
            );
          })}
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

function UnitRow({
  unit,
  isRenaming,
  progress,
  onOpen,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onDelete,
}: {
  unit: LocalTarget;
  isRenaming: boolean;
  progress: ScopeProgress;
  onOpen: () => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSaveRename: (label: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(unit.label ?? '');

  // Reset draft whenever we enter rename mode, so a cancel-then-rename starts
  // from the current label rather than stale state.
  useEffect(() => {
    if (isRenaming) setDraft(unit.label ?? '');
  }, [isRenaming, unit.label]);

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveRename(draft);
            if (e.key === 'Escape') onCancelRename();
          }}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={() => onSaveRename(draft)}
          className="rounded bg-black px-2 py-1 text-xs text-white"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancelRename}
          className="text-xs text-gray-400 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded border border-gray-100 hover:bg-gray-50">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
      >
        <span className="flex-1">{unit.label}</span>
        {progress.total > 0 ? (
          <ProgressRing done={progress.done} total={progress.total} size={24} stroke={2} />
        ) : null}
        <span aria-hidden className="text-gray-400">›</span>
      </button>
      <button
        type="button"
        onClick={onStartRename}
        title="Rename unit"
        aria-label={`Rename ${unit.label}`}
        className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700"
      >
        ✎
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete unit"
        aria-label={`Delete ${unit.label}`}
        className="px-2 py-1 text-xs text-gray-400 hover:text-red-600"
      >
        🗑
      </button>
    </div>
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
  unitMeta,
  onAddFromHub,
  onAddOnSite,
}: {
  open: boolean;
  onOpen: () => void;
  onCancel: () => void;
  unusedUnits: HubUnit[];
  unitLabel: (u: HubUnit) => string;
  unitMeta?: (u: HubUnit) => string | undefined;
  onAddFromHub: (u: HubUnit, label: string) => void;
  onAddOnSite: (label: string) => void;
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

  const close = () => {
    setLabel('');
    onCancel();
  };

  const pickHubUnit = (u: HubUnit) => {
    // Add directly using the hub's name — no prefill-and-edit step. The
    // inspector can rename later with the ✎ on the unit row if needed.
    onAddFromHub(u, unitLabel(u));
    setLabel('');
  };

  const addOnSite = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAddOnSite(trimmed);
    setLabel('');
  };

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-md border border-gray-200 p-3">
      {unusedUnits.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            From the hub
          </div>
          <ul className="flex flex-col divide-y divide-gray-100 overflow-hidden rounded border border-gray-200">
            {unusedUnits.map((u) => {
              const meta = unitMeta?.(u);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => pickHubUnit(u)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium leading-tight">
                        {unitLabel(u)}
                      </div>
                      {meta && (
                        <div className="mt-0.5 text-[11px] leading-tight text-gray-500">
                          {meta}
                        </div>
                      )}
                    </div>
                    <span aria-hidden className="text-gray-400">+</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          No hub units for this property yet — add one on-site below.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Or add a unit not in the hub
        </div>
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addOnSite();
            }}
            placeholder="Unit name / room number"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addOnSite}
            disabled={!label.trim()}
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={close}
        className="self-end text-xs text-gray-400 hover:text-gray-700"
      >
        Cancel
      </button>
    </div>
  );
}
