export type FindingRow = {
  unit_identifier: string; item_name: string; category: string;
  location_in_unit: string | null; resolution: string; quantity: number | null;
  cost_estimate_eur: number | null; urgency: string | null; notes: string | null;
  media_links: string[];
};

const HEADER = ['unit_identifier','list_type','item_name','category','location_in_unit',
  'resolution','quantity','cost_estimate_eur','urgency','notes','media_links'];

export function listTypeFor(resolution: string): 'Shopping' | 'Renovation' | 'Ops' {
  if (resolution === 'Buy new (add)' || resolution === 'Replace') return 'Shopping';
  if (resolution === 'Repair') return 'Renovation';
  return 'Ops';
}

function cell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildFindingsCsv(rows: FindingRow[]): string {
  const body = rows.map((r) => [
    r.unit_identifier, listTypeFor(r.resolution), r.item_name, r.category,
    r.location_in_unit, r.resolution, r.quantity, r.cost_estimate_eur,
    r.urgency, r.notes, r.media_links.join(';'),
  ].map(cell).join(','));
  return [HEADER.join(','), ...body].join('\n');
}
