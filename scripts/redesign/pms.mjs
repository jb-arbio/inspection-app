// PMS mapping for the V1 redesign question set: slug → pms_target path.
// Applied by gen.mjs onto the overlay. Slugs NOT listed here resolve to
// pms_target = null (hub-only — never pushed to the PMS).
//
// Decisions (2026-06-25, with Joshua):
//   - Presence/gate booleans are HUB-ONLY (control fields) → not listed here.
//   - The Issue log (issue_*) is HUB-ONLY + findings CSV → not listed here.
//   - Carried-over paths are kept verbatim from the pre-redesign overlay
//     (incl. their [GAPS §x] / [proposed] provenance tags).
//   - Net-new fields with no pre-existing PMS field are mapped by CONVENTION and
//     tagged "[NEW — confirm in hub]". They are collected in
//     docs/plans/2026-06-25-fv-pms-missing.md for the hub team to confirm/add.

export const PMS = {
  // ── Phase 1 · Visit metadata ──────────────────────────────────────────
  fv_visit_date: 'SiteVisit.visitDate',
  fv_visit_visitor_name: 'SiteVisit.visitorName',

  // ── Phase 2 · Location & neighbourhood ────────────────────────────────
  fv_location_quality: 'locationProfile.quality  [proposed §1.6-related]',
  fv_location_safety_concern: 'operationalInfo.safetyConcern',
  fv_neighbourhood_narrative: 'locationProfile.neighbourhoodNarrative  [proposed §1.6]',
  fv_neighbourhood_vibe_tags: 'locationProfile.vibeTags  [proposed §1.6]',
  fv_best_for_guest_type: 'locationProfile.bestForGuestType  [proposed §1.6]',
  // fv_location_notes → hub-only

  // ── Phase 3 · Building exterior & parking ─────────────────────────────
  fv_parking_actual_type: 'accessInfo.parking.type  [GAPS §1.25]',
  fv_parking_dedicated_spots: 'accessInfo.parking.numberOfSpaces',
  fv_parking_spot_number: 'accessInfo.parking.spotNumber  [NEW — confirm in hub]',
  fv_parking_access_instructions: 'accessInfo.parking.instructions',
  fv_video_parking_access: 'accessInfo.parking.video',
  fv_parking_bike_available: 'accessInfo.parking.bikeParkingAvailable  [NEW — confirm in hub]',
  fv_parking_nearby_options: 'nearby.description',
  fv_building_state: 'operationalInfo.buildingState',
  fv_building_mold: 'operationalInfo.buildingMold',
  // fv_building_hallways_clean → hub-only
  fv_building_construction_nearby: 'operationalInfo.constructionNearby',
  fv_building_amenities_verify: 'equipmentAndAmenities (amenity entries)  [catalog — name/type from resourceId]',
  fv_accessibility_step_free_entry: 'accessibilityInfo.stepFreeEntry',
  fv_accessibility_ramps: 'accessibilityInfo.ramps',
  fv_accessibility_notes: 'accessibilityInfo.notes',
  // fv_building_elevator_present → hub-only gate
  fv_building_elevator_working: 'otherDetails.elevator.status  [GAPS §1.20]',
  fv_building_elevator_size: 'otherDetails.elevator.size  [NEW — confirm in hub]',
  fv_building_elevator_condition: 'otherDetails.elevator.condition  [NEW — confirm in hub]',

  // ── Phase 4 · Building access & check-in (checkin_step repeater) ───────
  fv_step_name: 'accessInfo.checkInSteps.name',
  fv_step_access_point: 'accessInfo.checkInSteps.accessPoint',
  fv_step_lock_type: 'accessInfo.checkInSteps.lock.type',
  fv_step_smart_lock_provider: 'accessInfo.checkInSteps.lock.provider',
  fv_step_smart_lock_device_id: 'accessInfo.checkInSteps.lock.externalId',
  fv_step_lock_brand: 'accessInfo.checkInSteps.lock.brand',
  fv_step_lock_classification: 'accessInfo.checkInSteps.lock.classification',
  fv_step_key_storage_method: 'accessInfo.checkInSteps.lock.storageType',
  fv_step_storage_brand: 'accessInfo.checkInSteps.lock.storageBrand',
  fv_step_default_access_code: 'accessInfo.checkInSteps.lock.defaultCode',
  fv_video_checkin_walkthrough: 'accessInfo.checkInSteps.videoUrl',
  fv_checkin_notes_overall: 'accessInfo.overallNotes  [GAPS §1.21]',
  fv_checkin_complexity: 'operationalInfo.checkinComplexity',

  // ── Phase 5 · Building infrastructure & services ──────────────────────
  fv_storage_onsite_check: 'otherDetails.storageInfo.storageSpaceAvailable',
  fv_storage_location: 'otherDetails.storageInfo.internalStorageRoomInstructions',
  fv_storage_access_instructions: 'otherDetails.storageInfo.internalStorageRoomInstructions',
  fv_photo_storage_room: 'profile.photos.url',
  fv_storage_comments: 'otherDetails.storageInfo.luggageStorageInformation',
  // fv_trash_area_present → hub-only gate
  fv_trash_container_location: 'houseRules.garbageDisposal.trashLocationInstructions.description',
  fv_trash_handler: 'operationalModel.trashHandler  [GAPS §1.18]',
  fv_trash_pickup_schedule: 'houseRules.garbageDisposal.collectionSchedule',
  fv_trash_guest_instructions: 'houseRules.garbageDisposal.guestInstructions  [NEW — confirm in hub]',
  fv_video_trash_location: 'houseRules.garbageDisposal.trashLocationVideo',
  // fv_fusebox_present → hub-only gate
  fv_fusebox_location: 'equipmentAndAmenities.location',
  fv_fusebox_access: 'equipmentAndAmenities.instructions.description',
  fv_fusebox_reset_instructions: 'equipmentAndAmenities.instructions.description',
  fv_video_fusebox: 'equipmentAndAmenities.videoUrl  [NEW — confirm in hub]',
  // fv_fire_safety_present → hub-only gate
  fv_fire_exit_secondary: 'fireSafety.secondaryExitPresent  [GAPS §1.15]',
  fv_fire_exit_route_notes: 'houseRules.fireSafetyInstructions.description',
  fv_fire_safety_concerns: 'fireSafety.observedConcerns  [GAPS §1.15]',
  fv_video_fire_exit: 'houseRules.fireSafetyInstructions.video  [NEW — confirm in hub]',
  fv_photo_fire_safety: 'profile.photos.url',
  fv_common_area: 'commonAreas[]  [GAP — no commonAreas field; top-level is typed]',

  // ── Phase 6 · Cleaning & laundry ──────────────────────────────────────
  fv_cleaning_setup: 'operationalModel.cleaning  [GAPS §1.17]',
  fv_laundry_setup: 'operationalModel.laundry  [GAPS §1.17]',
  fv_laundry_delivery_frequency: 'equipmentAndAmenities.notes',
  fv_laundry_nearest_laundromat: 'nearby.title',
  // fv_extra_services_offered → hub-only (deferred — pending decision)

  // ── Phase 7 · WiFi ────────────────────────────────────────────────────
  // fv_wifi_present → hub-only gate
  fv_wifi_ssid: 'profile.wifiDetails.networkName  [NEW — confirm in hub]',
  fv_wifi_password: 'profile.wifiDetails.password  [NEW — confirm in hub]',
  fv_wifi_download_speed_mbps: 'profile.wifiDetails.downloadSpeedMbps  [GAPS §1.16]',
  fv_wifi_upload_speed_mbps: 'profile.wifiDetails.uploadSpeedMbps  [GAPS §1.16]',
  fv_wifi_router_location: 'profile.wifiDetails.routerLocation',
  fv_wifi_guest_router_access: 'profile.wifiDetails.guestRouterAccess  [GAPS §1.16]',

  // ── Phase 8 · Unit identity ───────────────────────────────────────────
  fv_unit_floor_number: 'profile.floor',
  fv_unit_location_in_building: 'profile.locationInBuilding',
  fv_unit_type_check: 'profile.unitType',
  // fv_unit_balcony_present → hub-only gate
  fv_unit_balconies_count: 'balconies', // CONFIRMED top-level field
  fv_view_actual: 'profile.viewType',
  // fv_view_comments → hub-only
  fv_apartment_category: 'propertyCategory', // CONFIRMED top-level field
  fv_accessibility_unit_door_widths: 'accessibilityInfo.unitDoorWidths',
  fv_location_noise_level: 'operationalInfo.noiseLevel',
  fv_location_noise_source: 'operationalInfo.noiseSource',

  // ── Phase 9 · Unit capacity ───────────────────────────────────────────
  fv_capacity_base: 'profile.baseCapacity  [freeform — profile accepts; maxOccupancy is the only typed capacity field]',
  fv_capacity_max: 'property.maxOccupancy', // CONFIRMED real field in PMS schema
  // fv_capacity_actual_setup → hub-only
  // fv_capacity_comments → hub-only

  // ── Phase 10 · Unit condition & issues ────────────────────────────────
  fv_furniture_status: 'propertyAssessment.furnitureStatus  [proposed]',
  fv_equipment_status: 'propertyAssessment.equipmentStatus  [proposed]',
  fv_bathroom_condition: 'propertyAssessment.bathroomCondition  [proposed]',
  // fv_issues_found + issue_* → hub-only + findings CSV (never pushed to PMS)

  // ── Phase 11 · Unit appliances & amenities (item repeater) ────────────
  // fv_items_to_log → hub-only gate
  item_name: 'equipmentAndAmenities.name  [catalog — resolved from resourceId, not free-write]',
  item_kind: 'equipmentAndAmenities.type  [catalog — resolved from resourceId]',
  item_brand: 'equipmentAndAmenities.brand', // CONFIRMED
  item_location: 'equipmentAndAmenities.location', // CONFIRMED
  item_instructions: 'equipmentAndAmenities.instructions', // CONFIRMED (array)
  item_availability_type: 'equipmentAndAmenities.availabilityType', // CONFIRMED (enum)
  item_video: 'equipmentAndAmenities.videoUrl  [GAP — no videoUrl in PMS schema]',

  // ── Phase 12 · Unit safety equipment ──────────────────────────────────
  // fv_unit_fusebox_present → hub-only gate
  fv_unit_fusebox_location: 'equipmentAndAmenities.location  [NEW unit-level — confirm in hub]',
  fv_unit_fusebox_reset_instructions: 'equipmentAndAmenities.instructions.description  [NEW unit-level — confirm in hub]',
  // fv_fire_extinguisher_present → hub-only gate
  fv_fire_extinguisher_location: 'equipmentAndAmenities.location',
  fv_fire_extinguisher_service_date: 'fireSafety.extinguisherServiceDate  [GAPS §1.15]',
  // fv_smoke_detector_present → hub-only gate
  fv_smoke_detector_working: 'fireSafety.smokeDetectorWorking  [NEW — confirm in hub]',
  // fv_co_detector_present → hub-only gate
  fv_co_detector_working: 'fireSafety.coDetectorWorking  [NEW — confirm in hub]',
  // fv_first_aid_present → hub-only gate
  fv_first_aid_location: 'houseRules.firstAidInstructions.description',

  // ── Phase 13 · Unit amenities & details ───────────────────────────────
  fv_blackout_curtains: 'equipmentAndAmenities (amenity entry)  [catalog — name/type from resourceId]',
  fv_ceiling_height_m: 'profile.ceilingHeightM  [GAPS §1.24]',

  // ── Phase 14 · Unit photos & videos ───────────────────────────────────
  fv_photo_bathroom: 'profile.photos.url',
  fv_photo_kitchen: 'profile.photos.url',
  fv_photo_general_apartment: 'profile.photos.url',
  fv_photo_window_ceiling: 'profile.photos.url',

  // ── Phase 15 · Final assessment / readiness ───────────────────────────
  fv_readiness_overall: 'status.readinessStatus',
  fv_readiness_host_start_date: 'status.hostStartDate  [NEW — confirm in hub]',
  fv_readiness_health_score: 'status.healthLevel',
  fv_readiness_recommendation_summary: 'OC.status.recommendationSummary  [GAPS §1.9]',
  // fv_general_comments → hub-only
};
