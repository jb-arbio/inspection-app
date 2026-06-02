// Single source of truth for the Findings "Resolution" picker and how each
// resolution maps to a shopping-list "list type" in the CSV export.
//
// Both the question config (questions.ts → FINDING_RESOLUTION_OPTIONS) and the
// CSV builder (findingsCsv.ts → listTypeFor) import from here so the two can
// never drift. Adding a resolution option means adding it to this map; the
// `FINDING_RESOLUTION_OPTIONS` array is derived from the map's keys so a new
// option is automatically offered in the picker AND gets a defined list type.

export type FindingListType = 'Shopping' | 'Renovation' | 'Ops';

// Insertion order here defines the picker order.
export const RESOLUTION_LIST_TYPE: Record<string, FindingListType> = {
  'Buy new (add)': 'Shopping',
  Replace: 'Shopping',
  Repair: 'Renovation',
  'Deep clean': 'Ops',
};

export const FINDING_RESOLUTION_OPTIONS: string[] =
  Object.keys(RESOLUTION_LIST_TYPE);

export function listTypeFor(resolution: string): FindingListType {
  return RESOLUTION_LIST_TYPE[resolution] ?? 'Ops';
}
