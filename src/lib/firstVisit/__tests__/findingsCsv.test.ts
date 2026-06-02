import { describe, it, expect } from 'vitest';
import { buildFindingsCsv, listTypeFor, type FindingRow } from '../findingsCsv';

const rows: FindingRow[] = [
  { unit_identifier: 'Apt 3B', item_name: 'Couch', category: 'Furniture',
    location_in_unit: 'Living room', resolution: 'Replace', quantity: 1,
    cost_estimate_eur: 400, urgency: 'Blocks go-live', notes: 'torn',
    media_links: ['https://x/a.jpg', 'https://x/b.mp4'] },
  { unit_identifier: 'Building / common', item_name: 'Hallway paint', category: 'Structural/Building',
    location_in_unit: 'Hallway', resolution: 'Repair', quantity: null,
    cost_estimate_eur: 180, urgency: null, notes: null, media_links: [] },
];

describe('buildFindingsCsv', () => {
  it('emits the header with a list_type column', () => {
    const lines = buildFindingsCsv(rows).split('\n');
    expect(lines[0]).toBe('unit_identifier,list_type,item_name,category,location_in_unit,resolution,quantity,cost_estimate_eur,urgency,notes,media_links');
  });
  it('derives list_type from resolution', () => {
    expect(listTypeFor('Replace')).toBe('Shopping');
    expect(listTypeFor('Buy new (add)')).toBe('Shopping');
    expect(listTypeFor('Repair')).toBe('Renovation');
    expect(listTypeFor('Deep clean')).toBe('Ops');
  });
  it('places list_type as the 2nd column per row', () => {
    const lines = buildFindingsCsv(rows).split('\n');
    expect(lines[1].startsWith('Apt 3B,Shopping,')).toBe(true);
    expect(lines[2].startsWith('Building / common,Renovation,')).toBe(true);
  });
  it('joins media links with semicolons', () => {
    expect(buildFindingsCsv(rows)).toContain('https://x/a.jpg;https://x/b.mp4');
  });
  it('quotes cells containing commas, quotes, or newlines', () => {
    const r: FindingRow = { unit_identifier: 'U1', item_name: 'Chair, broken', category: 'Furniture',
      location_in_unit: null, resolution: 'Repair', quantity: null, cost_estimate_eur: null,
      urgency: null, notes: 'he said "ouch"', media_links: [] };
    const csv = buildFindingsCsv([r]);
    expect(csv).toContain('"Chair, broken"');
    expect(csv).toContain('"he said ""ouch"""');
  });
  it('renders null numbers/strings as empty cells', () => {
    const lines = buildFindingsCsv(rows).split('\n');
    // quantity null, urgency null, notes null on row 2
    expect(lines[2]).toBe('Building / common,Renovation,Hallway paint,Structural/Building,Hallway,Repair,,180,,,');
  });
});
