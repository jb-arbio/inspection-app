// The hub stores values at exactly three scopes. Question configs declare
// one of these directly (see Onboarding_tool src/lib/questions/config.ts).
// The PMS data_point_level enum collapses onto these three:
//   deal/owner -> deal, property -> location, unit/listing -> unit_category.
export type HubScope = 'deal' | 'location' | 'unit_category';

export type InspectionScopeContext = {
  deal_id: string;
  location_id?: string;
  unit_category_id?: string;
};

// Human-readable label for a scope, shown as a chip on survey section headers
// so it's clear what level a question pertains to (e.g. "Maintenance work (€)"
// — is it about the unit, the building, or the visit?). Field feedback §3.1.
export function scopeLabel(scope: HubScope): string {
  switch (scope) {
    case 'deal':
      return 'Visit';
    case 'location':
      return 'Building/Property';
    case 'unit_category':
      return 'Unit';
  }
}

// Map a question's scope to the concrete scope_id used in
// onboarding.data_point_values.scope_id.
export function resolveScopeId(
  scope: HubScope,
  ctx: InspectionScopeContext,
): string | null {
  switch (scope) {
    case 'deal':
      return ctx.deal_id;
    case 'location':
      return ctx.location_id ?? null;
    case 'unit_category':
      return ctx.unit_category_id ?? null;
  }
}
