export type DataPointLevel =
  | 'deal' | 'property' | 'owner' | 'unit' | 'listing' | 'reservation';

export type InspectionScopeContext = {
  deal_id: string;
  location_id?: string;
  unit_category_id?: string;
};

export function resolveScopeId(
  level: DataPointLevel,
  ctx: InspectionScopeContext,
): string | null {
  switch (level) {
    case 'deal':
      return ctx.deal_id;
    case 'property':
    case 'unit':
    case 'listing':
      return ctx.unit_category_id ?? null;
    case 'owner':
    case 'reservation':
      // Not addressed in v1 — see design doc §20.4.
      return null;
  }
}
