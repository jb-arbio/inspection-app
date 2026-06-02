// Copied from Onboarding_tool/src/lib/data-room/activity-log.ts.
// Source of truth lives in the hub repo; this is a verbatim copy because
// the fork can't import across repos. Keep in sync if the upstream helper changes.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function logValueSubmitted(
  supabase: SupabaseLike,
  args: {
    data_point_id: string;
    scope_id: string;
    source: string;
    value: unknown;
    actor_name: string;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from('activity_log').insert({
      data_point_id: args.data_point_id,
      scope_id: args.scope_id,
      event_type: 'value_submitted',
      actor_name: args.actor_name,
      detail: { source: args.source, value: args.value },
    });
    if (error) {
      console.error(
        `[activity-log] insert failed for dp=${args.data_point_id} scope=${args.scope_id}: ${error.message}`,
      );
    }
  } catch (err) {
    console.error('[activity-log] insert threw:', err);
  }
}
