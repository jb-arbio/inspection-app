import { resolveScopeId, type DataPointLevel, type InspectionScopeContext } from './resolveScope';

export type HubSnapshot = {
  deal: { id: string };
  locations: { id: string }[];
  units: { id: string }[];
  values: {
    data_point_id: string;
    scope_id: string;
    source: string;
    value: unknown;
    submitted_at: string;
  }[];
  points: { id: string; slug: string; level: DataPointLevel }[];
};

// Source priority (highest first). Anything not listed is lower-priority.
const PRIORITY = ['owner', 'prefill_hubspot', 'prefill_scraper', 'prefill_places'];

export function lookupHubValue(
  snapshot: HubSnapshot,
  ctx: InspectionScopeContext,
  data_point_slug: string,
): unknown {
  const dp = snapshot.points.find((p) => p.slug === data_point_slug);
  if (!dp) return undefined;
  const scope_id = resolveScopeId(dp.level, ctx);
  if (!scope_id) return undefined;

  const candidates = snapshot.values.filter(
    (v) => v.data_point_id === dp.id && v.scope_id === scope_id && v.source !== 'staff_first_visit',
  );
  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    const ap = PRIORITY.indexOf(a.source);
    const bp = PRIORITY.indexOf(b.source);
    const ar = ap === -1 ? 999 : ap;
    const br = bp === -1 ? 999 : bp;
    if (ar !== br) return ar - br;
    return b.submitted_at.localeCompare(a.submitted_at);
  });
  return candidates[0].value;
}
