// Display metadata for block-repeater groups. The survey renders consecutive
// questions sharing a `group_id` (see groupIdFor / buildRenderPlan) inside a
// repeating block. Field feedback (§3.1) was that these blocks appeared with no
// title or intro and a bare "Step N" label, so it was unclear what was being
// asked. This map gives each known group a human title, an optional one-line
// intro, and the noun used to label each block ("Finding 1", "Step 1", ...).
//
// Unknown groups fall back to the legacy "Step N" behaviour (no title/intro)
// so any group_id we haven't catalogued still renders sensibly.

export type RepeaterGroupMeta = {
  title?: string;
  intro?: string;
  itemNoun: string;
};

const GROUPS: Record<string, RepeaterGroupMeta> = {
  finding: {
    title: 'Findings',
    intro: 'List items that need repair, replacement, or purchase. Add one per issue.',
    itemNoun: 'Finding',
  },
  checkin_step: {
    title: 'Check-in steps',
    intro: 'Document each access point in sequence, from building entrance to unit door.',
    itemNoun: 'Step',
  },
  consumable: {
    title: 'Consumables',
    itemNoun: 'Item',
  },
  appliance_amenity: {
    title: 'Appliances & amenities',
    intro: 'Catalogue each appliance or amenity in the unit — its brand, location, how to use it, and whether it is working.',
    itemNoun: 'Appliance',
  },
  utility_provider: {
    title: 'Utilities & providers',
    intro: 'Record each utility — provider name, account number, and emergency contact.',
    itemNoun: 'Utility',
  },
  maintenance_procedure: {
    title: 'Maintenance procedures',
    intro: 'Document recurring maintenance procedures and the steps observed for each.',
    itemNoun: 'Procedure',
  },
  equipment_issue: {
    title: 'Equipment issues',
    intro: 'List equipment problems found — add one per issue with a photo, type, description, and estimated cost.',
    itemNoun: 'Issue',
  },
  furniture_issue: {
    title: 'Furniture issues',
    intro: 'List furniture problems found — add one per issue with a photo, type, description, and estimated cost.',
    itemNoun: 'Issue',
  },
  maintenance_issue: {
    title: 'Maintenance issues',
    intro: 'List maintenance problems found — add one per issue with a photo, type, description, and estimated cost.',
    itemNoun: 'Issue',
  },
  checkout_step: {
    title: 'Check-out steps',
    intro: 'Document each check-out step in sequence, from securing the unit to leaving the building.',
    itemNoun: 'Step',
  },
};

// Resolve the display metadata for a group_id. Defaults to itemNoun 'Step' and
// no title/intro for unknown / null / undefined groups (back-compat with the
// previous hardcoded "Step N" rendering).
export function repeaterGroupMeta(
  groupId: string | null | undefined,
): RepeaterGroupMeta {
  if (groupId && GROUPS[groupId]) return GROUPS[groupId];
  return { itemNoun: 'Step' };
}
