// Section-voice prompts: the open, human questions an inspector answers by
// voice, each MAPPED to a subset of that section's structured fields. The AI
// extraction for a clip is scoped to the prompt's `target_slugs`.
//
// Authoring rules (see docs/plans/...-section-voice-fill):
//   - Group fields by how an inspector naturally SPEAKS, not by data structure.
//   - Each field maps to exactly one prompt within its section (no overlap).
//   - A repeater group = its own prompt (one item per object/issue mentioned).
//   - Voice-unfriendly fields (exact codes, precise measurements, media) are
//     intentionally NOT listed — they stay manual taps.
//
// Keyed by phase_id (see PHASES in lib/firstVisit/questions.ts). Sections with
// no entry simply have no voice prompts and behave exactly as today. A guard
// test (section-voice-prompts.test.ts) fails CI if any target_slug drifts from
// the config (missing, wrong phase, media, or mapped twice).
//
// Authored for all voice-suitable phases. EXCLUDED (tapping wins, no entry):
// '1' visit metadata, '8'/'9h' media, '9c' precise measurements. Manual
// carve-outs inside voiced sections (NOT listed below): access code + smart-lock
// serial in check-in, the door-width measurement in 9a. Staged enablement: turn
// on a few phases first, then the rest — all are reviewed in the GX/PM session.

export type SectionPrompt = {
  /** Stable id, unique within the phase. */
  id: string;
  /** The open question shown/spoken to the inspector. */
  label: string;
  /** Field slugs this prompt's clip is allowed to fill. */
  target_slugs: string[];
};

export const SECTION_VOICE_PROMPTS: Record<string, SectionPrompt[]> = {
  // 2 · Property approach (location & arrival)
  '2': [
    {
      id: 'p2_location_quality',
      label: 'How is the location for guests — overall quality, noise, any safety concerns?',
      target_slugs: [
        'fv_location_quality',
        'fv_location_noise_level',
        'fv_location_noise_source',
        'fv_location_safety_concern',
      ],
    },
    {
      id: 'p2_neighbourhood',
      label: 'Describe the neighbourhood — the vibe, who it suits best, and anything else worth noting.',
      target_slugs: [
        'fv_neighbourhood_narrative',
        'fv_neighbourhood_vibe_tags',
        'fv_best_for_guest_type',
        'fv_location_notes',
      ],
    },
  ],

  // 9d · Unit walkthrough (condition)
  '9d': [
    {
      id: 'p9d_overall',
      label: 'Walk through the apartment — overall condition: furnishing, equipment, and the bathroom?',
      target_slugs: [
        'fv_furniture_status',
        'fv_equipment_status',
        'fv_bathroom_condition',
        'fv_bathroom_issues',
        'fv_maintenance_level',
      ],
    },
    {
      // Maps to the UNIFIED Findings repeater (the go-forward model), not the
      // legacy furniture/equipment/maintenance issue repeaters.
      id: 'p9d_findings',
      label: 'Go issue by issue — anything broken, damaged, dirty, or missing? For each: what it is, where, how urgent, and how to fix it.',
      target_slugs: [
        'finding_item_name',
        'finding_category',
        'finding_location',
        'finding_resolution',
        'finding_quantity',
        'finding_cost_estimate_eur',
        'finding_urgency',
        'finding_notes',
      ],
    },
  ],

  // 9e · Unit appliances & amenities
  '9e': [
    {
      id: 'p9e_appliances',
      label: 'List the appliances and amenities — for each: what it is, kind, brand, where it is, how to use it, and its availability.',
      target_slugs: [
        'appliance.name',
        'appliance.kind',
        'appliance.brand',
        'appliance.location',
        'appliance.instructions',
        'appliance.availabilityType',
      ],
    },
  ],

  // 3 · Building exterior & parking
  '3': [
    {
      id: 'p3_parking',
      label: 'Tell me about parking — the type, how many spots, the spot number, bike parking, and how guests access it.',
      target_slugs: [
        'fv_parking_actual_type',
        'fv_parking_dedicated_spots',
        'fv_parking_spot_number',
        'fv_parking_bike_available',
        'fv_parking_access_instructions',
        'fv_parking_nearby_options',
      ],
    },
    {
      id: 'p3_building',
      label: 'How is the building outside and in the common areas — overall state, mold, hallways, elevator, construction nearby, and which shared amenities?',
      target_slugs: [
        'fv_building_state',
        'fv_building_mold',
        'fv_building_hallways_clean',
        'fv_building_elevator_working',
        'fv_building_construction_nearby',
        'fv_building_amenities_verify',
      ],
    },
    {
      id: 'p3_accessibility',
      label: 'How accessible is the building — step-free entry, ramps, anything else for mobility?',
      target_slugs: ['fv_accessibility_step_free_entry', 'fv_accessibility_ramps', 'fv_accessibility_notes'],
    },
  ],

  // 4 · Building access & check-in (access codes + serials stay manual)
  '4': [
    {
      id: 'p4_overall',
      label: 'Overall, how complex is check-in, and any general notes? What lock brand is used?',
      target_slugs: ['fv_checkin_complexity', 'fv_checkin_notes_overall', 'fv_step_lock_brand'],
    },
    {
      id: 'p4_steps',
      label: 'Walk me through getting in, step by step — each access point, the lock type, smart-lock provider, classification, and key storage. (Codes you type in by hand.)',
      target_slugs: [
        'fv_step_name',
        'fv_step_access_point',
        'fv_step_lock_type',
        'fv_step_smart_lock_provider',
        'fv_step_lock_classification',
        'fv_step_key_storage_method',
        'fv_step_storage_brand',
      ],
    },
  ],

  // 5 · Building infrastructure & utilities
  '5': [
    {
      id: 'p5_storage',
      label: 'Is there luggage storage on site — where, how guests access it, any comments?',
      target_slugs: ['fv_storage_onsite_check', 'fv_storage_location', 'fv_storage_access_instructions', 'fv_storage_comments'],
    },
    {
      id: 'p5_trash',
      label: 'How is trash handled — where the containers are, who handles it, and the pickup schedule?',
      target_slugs: ['fv_trash_container_location', 'fv_trash_handler', 'fv_trash_pickup_schedule'],
    },
    {
      id: 'p5_utilities',
      label: 'List the utility providers — for each: which utility, the provider, account number, and emergency contact.',
      target_slugs: ['utility.type', 'utility.provider_name', 'utility.account_number', 'utility.emergency_contact'],
    },
    {
      id: 'p5_fusebox_fire',
      label: 'Fuse box and fire safety — where the fuse box is, who can access it, how to reset it, the facility manager, fire exits, and any fire-safety concerns or shared facilities.',
      target_slugs: [
        'fv_fusebox_location',
        'fv_fusebox_access',
        'fv_fusebox_reset_instructions',
        'fv_facility_manager_contact',
        'fv_fire_exit_primary',
        'fv_fire_exit_secondary',
        'fv_fire_safety_concerns',
        'fv_fire_safety_notes',
        'fv_common_area',
      ],
    },
    {
      id: 'p5_maintenance',
      label: 'Any maintenance procedures worth recording — for each: category, a title, and the steps.',
      target_slugs: ['maintenance.category', 'maintenance.title', 'maintenance.steps'],
    },
    {
      id: 'p5_findings',
      label: 'Anything broken, damaged, or missing in the building? Go issue by issue — what it is, where, how urgent, and how to fix it.',
      target_slugs: [
        'finding_item_name',
        'finding_category',
        'finding_location',
        'finding_resolution',
        'finding_quantity',
        'finding_cost_estimate_eur',
        'finding_urgency',
        'finding_notes',
      ],
    },
  ],

  // 6 · Building services & operational model
  '6': [
    {
      id: 'p6_cleaning',
      label: 'How is cleaning set up — the model, provider, and whether Arbio can take it over?',
      target_slugs: ['fv_cleaning_setup', 'fv_cleaning_provider_name', 'fv_cleaning_takeover_possible'],
    },
    {
      id: 'p6_laundry',
      label: 'How is laundry handled — setup, provider, delivery frequency, and the nearest laundromat for guests?',
      target_slugs: ['fv_laundry_setup', 'fv_laundry_provider_name', 'fv_laundry_delivery_frequency', 'fv_laundry_nearest_laundromat'],
    },
    {
      id: 'p6_services',
      label: 'Which extra services are offered?',
      target_slugs: ['fv_extra_services_offered'],
    },
  ],

  // 7 · WiFi
  '7': [
    {
      id: 'p7_wifi',
      label: 'Tell me about the WiFi — the up/download speeds, where the router is, and whether guests can reach it.',
      target_slugs: [
        'fv_wifi_download_speed_mbps',
        'fv_wifi_upload_speed_mbps',
        'fv_wifi_router_location',
        'fv_wifi_guest_router_access',
      ],
    },
  ],

  // 9a · Unit identity (precise door widths stay manual)
  '9a': [
    {
      id: 'p9a_identity',
      label: 'Describe the unit — type, category, which floor, balconies, the view, and any comments.',
      target_slugs: [
        'fv_unit_type_check',
        'fv_apartment_category',
        'fv_unit_floor_number',
        'fv_unit_balconies_count',
        'fv_view_actual',
        'fv_view_comments',
      ],
    },
  ],

  // 9b · Unit capacity
  '9b': [
    {
      id: 'p9b_capacity',
      label: 'Describe the capacity and bed setup — and anything that differs from what was expected.',
      target_slugs: ['fv_capacity_actual_setup', 'fv_capacity_comments'],
    },
  ],

  // 9f · Unit safety equipment
  '9f': [
    {
      id: 'p9f_safety',
      label: 'Walk the safety equipment — fire extinguisher (present, where, last service), smoke detectors (present, working), CO detector, and the first-aid kit.',
      target_slugs: [
        'fv_fire_extinguisher_present',
        'fv_fire_extinguisher_location',
        'fv_fire_extinguisher_service_date',
        'fv_smoke_detector_present',
        'fv_smoke_detector_working',
        'fv_co_detector_present',
        'fv_first_aid_present',
        'fv_first_aid_location',
      ],
    },
  ],

  // 9g · Unit amenities & details
  '9g': [
    {
      id: 'p9g_amenities',
      label: 'Are there blackout curtains or blinds — in which rooms?',
      target_slugs: ['fv_blackout_curtains'],
    },
  ],

  // 10 · Check-out arrangements
  '10': [
    {
      id: 'p10_checkout',
      label: 'Walk me through check-out, step by step — name each step and any notes.',
      target_slugs: ['fv_checkout_step_name', 'fv_checkout_step_notes'],
    },
  ],

  // 11 · Final assessment / readiness
  '11': [
    {
      id: 'p11_readiness',
      label: 'Your overall verdict — is it ready for go-live, your recommendation and any delay, blocking issues and details, a health score, and a summary.',
      target_slugs: [
        'fv_readiness_overall',
        'fv_readiness_go_live_recommendation',
        'fv_readiness_go_live_delay_weeks',
        'fv_readiness_blocking_issues',
        'fv_readiness_blocking_details',
        'fv_readiness_health_score',
        'fv_readiness_recommendation_summary',
        'fv_general_comments',
      ],
    },
  ],
};

export function promptsForPhase(phaseId: string): SectionPrompt[] {
  return SECTION_VOICE_PROMPTS[phaseId] ?? [];
}
