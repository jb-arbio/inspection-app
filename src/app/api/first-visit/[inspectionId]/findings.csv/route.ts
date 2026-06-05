import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';
import { buildFindingsCsv, type FindingRow } from '@/lib/firstVisit/findingsCsv';

// Buckets keyed by media kind — mirrors src/app/api/first-visit/media/route.ts.
const BUCKETS: Record<string, string> = {
  photo: 'first-visit-photos',
  video: 'first-visit-videos',
  audio: 'first-visit-audio',
};

// The nine finding field slugs, stored on first_visit_answers with
// question_key = '<slug>' and a separate step_index column.
const FINDING_FIELD_SLUGS = [
  'finding_item_name',
  'finding_category',
  'finding_location',
  'finding_resolution',
  'finding_quantity',
  'finding_cost_estimate_eur',
  'finding_urgency',
  'finding_notes',
] as const;

// Finding media is stored with question_key = `finding_media::<stepIndex>`
// (see StepGroup.tsx). Pull the step index back out so we can pair media with
// the finding fields that share the same (target_id, step_index).
export function parseFindingMediaStep(questionKey: string): number | null {
  const m = /^finding_media::(\d+)$/.exec(questionKey);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function toNumberOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStringOrEmpty(v: unknown): string {
  return v == null ? '' : String(v);
}

function toStringOrNull(v: unknown): string | null {
  return v == null || v === '' ? null : String(v);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inspectionId: string }> },
) {
  const ctx = await getHubRouteContext(getHubSupabase());
  if (!ctx) return new Response(JSON.stringify({ error: 'unauth' }), { status: 401 });
  const { supabase } = ctx;

  const { inspectionId } = await params;

  // Finding field answers for this inspection.
  const { data: answers, error: ansErr } = await supabase
    .from('first_visit_answers')
    .select('target_id, scope, question_key, step_index, value')
    .eq('inspection_id', inspectionId)
    .in('question_key', FINDING_FIELD_SLUGS as unknown as string[]);
  if (ansErr) return new Response(JSON.stringify({ error: ansErr.message }), { status: 500 });

  // Targets (for unit_identifier labels) keyed by id.
  const { data: targets } = await supabase
    .from('first_visit_targets')
    .select('id, label, kind')
    .eq('inspection_id', inspectionId);
  const targetById = new Map<string, { label: string | null; kind: string | null }>();
  for (const t of targets ?? []) {
    targetById.set(t.id, { label: t.label ?? null, kind: t.kind ?? null });
  }

  // Finding media rows for this inspection.
  const { data: media } = await supabase
    .from('first_visit_media')
    .select('target_id, question_key, storage_path, kind')
    .eq('inspection_id', inspectionId);

  // Group finding field answers by (target_id, step_index).
  type FindingAcc = {
    target_id: string;
    scope: string | null;
    step_index: number | null;
    fields: Record<string, unknown>;
  };
  const findings = new Map<string, FindingAcc>();
  const keyOf = (targetId: string, step: number | null) => `${targetId}::${step ?? 'null'}`;

  for (const a of answers ?? []) {
    const step = typeof a.step_index === 'number' ? a.step_index : null;
    const k = keyOf(a.target_id, step);
    let acc = findings.get(k);
    if (!acc) {
      acc = { target_id: a.target_id, scope: a.scope ?? null, step_index: step, fields: {} };
      findings.set(k, acc);
    }
    acc.fields[a.question_key] = a.value;
  }

  // Index media by (target_id, parsed step index).
  const mediaByFinding = new Map<string, Array<{ storage_path: string; kind: string }>>();
  for (const m of media ?? []) {
    const step = parseFindingMediaStep(m.question_key ?? '');
    if (step == null) continue;
    const k = keyOf(m.target_id, step);
    const arr = mediaByFinding.get(k) ?? [];
    arr.push({ storage_path: m.storage_path, kind: m.kind });
    mediaByFinding.set(k, arr);
  }

  const rows: FindingRow[] = [];
  for (const [k, acc] of findings) {
    const f = acc.fields;
    const target = targetById.get(acc.target_id);
    const isBuilding = acc.scope === 'location' || target?.kind === 'property';
    const unit_identifier = isBuilding ? 'Building / common' : target?.label ?? '';

    // Sign media URLs (7-day expiry). Skip rows whose signing errors.
    const media_links: string[] = [];
    for (const item of mediaByFinding.get(k) ?? []) {
      const bucket = BUCKETS[item.kind];
      if (!bucket) continue;
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(item.storage_path, 60 * 60 * 24 * 7);
      if (error || !data?.signedUrl) continue;
      media_links.push(data.signedUrl);
    }

    rows.push({
      unit_identifier,
      item_name: toStringOrEmpty(f.finding_item_name),
      category: toStringOrEmpty(f.finding_category),
      location_in_unit: toStringOrNull(f.finding_location),
      resolution: toStringOrEmpty(f.finding_resolution),
      quantity: toNumberOrNull(f.finding_quantity),
      cost_estimate_eur: toNumberOrNull(f.finding_cost_estimate_eur),
      urgency: toStringOrNull(f.finding_urgency),
      notes: toStringOrNull(f.finding_notes),
      media_links,
    });
  }

  const csv = buildFindingsCsv(rows);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="findings-${inspectionId}.csv"`,
    },
  });
}
