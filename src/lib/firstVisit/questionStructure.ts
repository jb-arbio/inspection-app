// AUTO-GENERATED SEED (scripts/gen-survey-content.mjs) — then hand-maintained.
// The structural overlay: per-slug wiring fields composed onto the editable
// content by buildSurveyConfig(). Edit by hand after the initial seed.
import type { StructureOverlay } from './surveyConfig';

export const QUESTION_STRUCTURE: StructureOverlay = {
  "fv_visit_date": {
    "pms_target": "SiteVisit.visitDate"
  },
  "fv_visit_visitor_name": {
    "pms_target": "SiteVisit.visitorName"
  },
  "fv_location_quality": {
    "mode": "observe",
    "pms_target": "locationProfile.quality  [proposed §1.6-related]"
  },
  "fv_location_noise_level": {
    "mode": "observe",
    "pms_target": "operationalInfo.noiseLevel"
  },
  "fv_location_noise_source": {
    "pms_target": "operationalInfo.noiseSource"
  },
  "fv_location_safety_concern": {
    "pms_target": "operationalInfo.safetyConcern"
  },
  "fv_location_notes": {
    "pms_target": "(hub-only — never pushed to PMS)"
  },
  "fv_neighbourhood_narrative": {
    "pms_target": "locationProfile.neighbourhoodNarrative  [proposed §1.6]"
  },
  "fv_neighbourhood_vibe_tags": {
    "pms_target": "locationProfile.vibeTags  [proposed §1.6]"
  },
  "fv_best_for_guest_type": {
    "pms_target": "locationProfile.bestForGuestType  [proposed §1.6]"
  },
  "fv_parking_actual_type": {
    "pms_target": "accessInfo.parking.type  [GAPS §1.25]",
    "follow_up": {
      "when_value": [
        "Garage on-site",
        "Garage nearby"
      ],
      "label": "Underground garage clearance height (cm)",
      "type": "number",
      "required": false
    }
  },
  "fv_parking_dedicated_spots": {
    "pms_target": "accessInfo.parking.numberOfSpaces"
  },
  "fv_parking_bike_available": {
    "pms_target": "equipmentAndAmenities.status"
  },
  "fv_parking_access_instructions": {
    "pms_target": "accessInfo.parking.instructions"
  },
  "fv_parking_nearby_options": {
    "pms_target": "nearby.description"
  },
  "fv_building_elevator_working": {
    "pms_target": "otherDetails.elevator.status  [GAPS §1.20]"
  },
  "fv_building_amenities_verify": {
    "pms_target": "equipmentAndAmenities.name"
  },
  "fv_building_state": {
    "mode": "observe",
    "pms_target": "operationalInfo.buildingState"
  },
  "fv_building_mold": {
    "mode": "observe",
    "pms_target": "operationalInfo.buildingMold"
  },
  "fv_building_hallways_clean": {
    "mode": "observe",
    "pms_target": "(hub-only — never pushed to PMS)"
  },
  "fv_building_construction_nearby": {
    "pms_target": "operationalInfo.constructionNearby",
    "follow_up": {
      "when_value": true,
      "label": "What's the construction and when does it end?",
      "type": "text",
      "required": false
    }
  },
  "fv_accessibility_step_free_entry": {
    "pms_target": "accessibilityInfo (sub-field)",
    "status": "proposed"
  },
  "fv_accessibility_ramps": {
    "pms_target": "accessibilityInfo (sub-field)",
    "status": "proposed"
  },
  "fv_accessibility_notes": {
    "pms_target": "accessibilityInfo",
    "status": "proposed"
  },
  "fv_parking_spot_number": {
    "mode": "observe",
    "status": "proposed"
  },
  "fv_photo_parking_spot": {
    "mode": "observe",
    "status": "proposed",
    "anchor_to": "fv_parking_dedicated_spots"
  },
  "fv_checkin_complexity": {
    "pms_target": "operationalInfo.checkinComplexity"
  },
  "fv_step_name": {
    "pms_target": "accessInfo.checkInSteps.name",
    "group_id": "checkin_step"
  },
  "fv_step_access_point": {
    "pms_target": "accessInfo.checkInSteps.accessPoint",
    "group_id": "checkin_step"
  },
  "fv_step_lock_type": {
    "pms_target": "accessInfo.checkInSteps.lock.type",
    "group_id": "checkin_step"
  },
  "fv_step_smart_lock_provider": {
    "pms_target": "accessInfo.checkInSteps.lock.provider",
    "group_id": "checkin_step"
  },
  "fv_step_smart_lock_device_id": {
    "pms_target": "accessInfo.checkInSteps.lock.externalId",
    "group_id": "checkin_step"
  },
  "fv_step_lock_brand": {
    "pms_target": "accessInfo.checkInSteps.lock.brand",
    "group_id": null
  },
  "fv_step_lock_classification": {
    "pms_target": "accessInfo.checkInSteps.lock.classification",
    "group_id": "checkin_step"
  },
  "fv_step_key_storage_method": {
    "pms_target": "accessInfo.checkInSteps.lock.storageType",
    "group_id": "checkin_step"
  },
  "fv_step_storage_brand": {
    "pms_target": "accessInfo.checkInSteps.lock.storageBrand",
    "group_id": "checkin_step"
  },
  "fv_step_default_access_code": {
    "pms_target": "accessInfo.checkInSteps.lock.defaultCode",
    "group_id": "checkin_step"
  },
  "fv_checkin_notes_overall": {
    "pms_target": "accessInfo.overallNotes  [GAPS §1.21]"
  },
  "fv_storage_onsite_check": {
    "pms_target": "otherDetails.storageInfo.storageSpaceAvailable"
  },
  "fv_storage_location": {
    "pms_target": "otherDetails.storageInfo.internalStorageRoomInstructions"
  },
  "fv_storage_access_instructions": {
    "pms_target": "otherDetails.storageInfo.internalStorageRoomInstructions"
  },
  "fv_storage_comments": {
    "pms_target": "otherDetails.storageInfo.luggageStorageInformation"
  },
  "fv_trash_container_location": {
    "pms_target": "houseRules.garbageDisposal.trashLocationInstructions.description"
  },
  "fv_trash_handler": {
    "pms_target": "operationalModel.trashHandler  [GAPS §1.18]"
  },
  "fv_trash_pickup_schedule": {
    "pms_target": "houseRules.garbageDisposal.collectionSchedule"
  },
  "fv_fusebox_location": {
    "pms_target": "equipmentAndAmenities.location"
  },
  "fv_fusebox_access": {
    "pms_target": "equipmentAndAmenities.instructions.description"
  },
  "fv_fusebox_reset_instructions": {
    "pms_target": "equipmentAndAmenities.instructions.description"
  },
  "fv_facility_manager_contact": {
    "pms_target": "propertyManagement.facilityManager"
  },
  "fv_fire_exit_primary": {
    "pms_target": "houseRules.fireSafetyInstructions.description"
  },
  "fv_fire_exit_secondary": {
    "pms_target": "fireSafety.secondaryExitPresent  [GAPS §1.15]",
    "follow_up": {
      "when_value": true,
      "label": "Where / how is it accessible?",
      "type": "text",
      "required": true
    }
  },
  "fv_fire_safety_concerns": {
    "mode": "observe",
    "pms_target": "fireSafety.observedConcerns  [GAPS §1.15]"
  },
  "fv_fire_safety_notes": {
    "pms_target": "houseRules.fireSafetyInstructions.description"
  },
  "fv_common_area": {
    "pms_target": "commonAreas[]",
    "status": "proposed"
  },
  "utility.type": {
    "pms_target": "propertyManagement.utilityProviders[].type",
    "status": "proposed",
    "group_id": "utility_provider"
  },
  "utility.provider_name": {
    "pms_target": "propertyManagement.utilityProviders[].providerName",
    "status": "proposed",
    "group_id": "utility_provider"
  },
  "utility.account_number": {
    "pms_target": "propertyManagement.utilityProviders[].accountNumber [proposed]",
    "status": "proposed",
    "group_id": "utility_provider"
  },
  "utility.emergency_contact": {
    "pms_target": "propertyManagement.utilityProviders[].emergencyContact [proposed]",
    "status": "proposed",
    "group_id": "utility_provider"
  },
  "maintenance.category": {
    "pms_target": "maintenancePlaybook[].category",
    "status": "proposed",
    "group_id": "maintenance_procedure"
  },
  "maintenance.title": {
    "pms_target": "maintenancePlaybook[].title",
    "status": "proposed",
    "group_id": "maintenance_procedure"
  },
  "maintenance.steps": {
    "mode": "observe",
    "pms_target": "maintenancePlaybook[].steps",
    "status": "proposed",
    "group_id": "maintenance_procedure"
  },
  "maintenance.photo": {
    "pms_target": "maintenancePlaybook[].photoUrl [proposed]",
    "status": "proposed",
    "group_id": "maintenance_procedure"
  },
  "finding_item_name": {
    "mode": "observe",
    "repeater": true,
    "status": "proposed",
    "group_id": "finding"
  },
  "finding_category": {
    "mode": "observe",
    "repeater": true,
    "status": "proposed",
    "group_id": "finding"
  },
  "finding_location": {
    "mode": "observe",
    "repeater": true,
    "status": "proposed",
    "group_id": "finding"
  },
  "finding_resolution": {
    "mode": "observe",
    "repeater": true,
    "status": "proposed",
    "group_id": "finding"
  },
  "finding_quantity": {
    "mode": "observe",
    "repeater": true,
    "status": "proposed",
    "group_id": "finding"
  },
  "finding_cost_estimate_eur": {
    "mode": "observe",
    "repeater": true,
    "status": "proposed",
    "group_id": "finding"
  },
  "finding_urgency": {
    "mode": "observe",
    "repeater": true,
    "status": "proposed",
    "group_id": "finding"
  },
  "finding_notes": {
    "mode": "observe",
    "repeater": true,
    "status": "proposed",
    "group_id": "finding"
  },
  "finding_media": {
    "mode": "observe",
    "repeater": true,
    "status": "proposed",
    "group_id": "finding"
  },
  "fv_video_fusebox": {
    "mode": "observe",
    "status": "proposed",
    "anchor_to": "fv_fusebox_location"
  },
  "fv_photo_fusebox_location": {
    "mode": "observe",
    "status": "proposed",
    "anchor_to": "fv_fusebox_location"
  },
  "fv_cleaning_setup": {
    "mode": "observe",
    "pms_target": "operationalModel.cleaning  [GAPS §1.17]"
  },
  "fv_cleaning_provider_name": {
    "mode": "observe",
    "pms_target": "propertyManagement.cleaningProvider.name"
  },
  "fv_cleaning_takeover_possible": {
    "mode": "observe",
    "pms_target": "operationalModel.cleaningTakeoverPossible  [proposed]"
  },
  "fv_laundry_setup": {
    "pms_target": "operationalModel.laundry  [GAPS §1.17]"
  },
  "fv_laundry_provider_name": {
    "pms_target": "propertyManagement.laundryProvider.name  [proposed; mirrors cleaningProvider]"
  },
  "fv_laundry_delivery_frequency": {
    "pms_target": "equipmentAndAmenities.notes"
  },
  "fv_laundry_nearest_laundromat": {
    "pms_target": "nearby.title"
  },
  "fv_extra_services_offered": {
    "pms_target": "(deferred — pending decision)",
    "per_option_follow_up": {
      "label_template": "How can guests book ‚{option}'?",
      "type": "text",
      "required": false
    }
  },
  "fv_wifi_download_speed_mbps": {
    "mode": "measure",
    "pms_target": "profile.wifiDetails.downloadSpeedMbps  [GAPS §1.16]"
  },
  "fv_wifi_upload_speed_mbps": {
    "mode": "measure",
    "pms_target": "profile.wifiDetails.uploadSpeedMbps  [GAPS §1.16]"
  },
  "fv_wifi_router_location": {
    "pms_target": "profile.wifiDetails.routerLocation"
  },
  "fv_wifi_guest_router_access": {
    "pms_target": "profile.wifiDetails.guestRouterAccess  [GAPS §1.16]"
  },
  "fv_video_checkin_walkthrough": {
    "pms_target": "accessInfo.checkInSteps.videoUrl",
    "anchor_to": "fv_step_name"
  },
  "fv_video_trash_location": {
    "pms_target": "houseRules.garbageDisposal.trashLocationVideo",
    "anchor_to": "fv_trash_container_location"
  },
  "fv_photo_storage_room": {
    "pms_target": "profile.photos.url",
    "anchor_to": "fv_storage_location"
  },
  "fv_video_parking_access": {
    "pms_target": "accessInfo.parking.video",
    "anchor_to": "fv_parking_access_instructions"
  },
  "fv_photo_fusebox": {
    "pms_target": "profile.photos.url",
    "anchor_to": "fv_fusebox_location"
  },
  "fv_photo_fire_safety": {
    "pms_target": "profile.photos.url",
    "anchor_to": "fv_fire_safety_concerns"
  },
  "fv_unit_type_check": {
    "pms_target": "profile.unitType"
  },
  "fv_unit_balconies_count": {
    "mode": "measure",
    "pms_target": "balconies"
  },
  "fv_unit_location_in_building": {
    "pms_target": "profile.locationInBuilding"
  },
  "fv_unit_floor_number": {
    "pms_target": "profile.floor"
  },
  "fv_view_actual": {
    "pms_target": "profile.viewType"
  },
  "fv_view_comments": {
    "pms_target": "(hub-only — never pushed to PMS)"
  },
  "fv_apartment_category": {
    "pms_target": "propertyCategory  [GAPS §1.8 quality-tier]"
  },
  "fv_accessibility_unit_door_widths": {
    "pms_target": "accessibilityInfo (sub-field)",
    "status": "proposed"
  },
  "fv_capacity_actual_setup": {
    "pms_target": "(hub-only — never pushed to PMS)"
  },
  "fv_capacity_comments": {
    "pms_target": "(hub-only — never pushed to PMS)"
  },
  "fv_ceiling_height_m": {
    "mode": "measure",
    "pms_target": "profile.ceilingHeightM  [GAPS §1.24]"
  },
  "fv_furniture_status": {
    "mode": "observe",
    "pms_target": "propertyAssessment.furnitureStatus  [proposed]"
  },
  "fv_equipment_status": {
    "mode": "observe",
    "pms_target": "propertyAssessment.equipmentStatus  [proposed]"
  },
  "fv_bathroom_condition": {
    "mode": "observe",
    "pms_target": "propertyAssessment.bathroomCondition  [proposed]"
  },
  "fv_bathroom_issues": {
    "mode": "observe",
    "pms_target": "operationalInfo.bathroomIssues"
  },
  "fv_maintenance_level": {
    "mode": "observe",
    "pms_target": "propertyAssessment.maintenanceLevel  [proposed]"
  },
  "furniture_issue.photo": {
    "pms_target": "propertyAssessment.furnitureIssues[].photoUrl [proposed]",
    "status": "proposed",
    "group_id": "furniture_issue"
  },
  "furniture_issue.type": {
    "mode": "observe",
    "pms_target": "propertyAssessment.furnitureIssues[].type [proposed]",
    "status": "proposed",
    "group_id": "furniture_issue"
  },
  "furniture_issue.description": {
    "mode": "observe",
    "pms_target": "propertyAssessment.furnitureIssues[].description [proposed]",
    "status": "proposed",
    "group_id": "furniture_issue"
  },
  "furniture_issue.cost_eur": {
    "mode": "measure",
    "pms_target": "propertyAssessment.furnitureIssues[].costEur [proposed]",
    "status": "proposed",
    "group_id": "furniture_issue"
  },
  "equipment_issue.photo": {
    "pms_target": "propertyAssessment.equipmentIssues[].photoUrl [proposed]",
    "status": "proposed",
    "group_id": "equipment_issue"
  },
  "equipment_issue.type": {
    "mode": "observe",
    "pms_target": "propertyAssessment.equipmentIssues[].type [proposed]",
    "status": "proposed",
    "group_id": "equipment_issue"
  },
  "equipment_issue.description": {
    "mode": "observe",
    "pms_target": "propertyAssessment.equipmentIssues[].description [proposed]",
    "status": "proposed",
    "group_id": "equipment_issue"
  },
  "equipment_issue.cost_eur": {
    "mode": "measure",
    "pms_target": "propertyAssessment.equipmentIssues[].costEur [proposed]",
    "status": "proposed",
    "group_id": "equipment_issue"
  },
  "maintenance_issue.photo": {
    "pms_target": "propertyAssessment.maintenanceIssues[].photoUrl [proposed]",
    "status": "proposed",
    "group_id": "maintenance_issue"
  },
  "maintenance_issue.type": {
    "mode": "observe",
    "pms_target": "propertyAssessment.maintenanceIssues[].type [proposed]",
    "status": "proposed",
    "group_id": "maintenance_issue"
  },
  "maintenance_issue.description": {
    "mode": "observe",
    "pms_target": "propertyAssessment.maintenanceIssues[].description [proposed]",
    "status": "proposed",
    "group_id": "maintenance_issue"
  },
  "maintenance_issue.cost_eur": {
    "mode": "measure",
    "pms_target": "propertyAssessment.maintenanceIssues[].costEur [proposed]",
    "status": "proposed",
    "group_id": "maintenance_issue"
  },
  "appliance.name": {
    "pms_target": "equipmentAndAmenities.name",
    "group_id": "appliance_amenity"
  },
  "appliance.kind": {
    "pms_target": "equipmentAndAmenities.kind",
    "group_id": "appliance_amenity"
  },
  "appliance.brand": {
    "pms_target": "equipmentAndAmenities.brand",
    "group_id": "appliance_amenity"
  },
  "appliance.location": {
    "pms_target": "equipmentAndAmenities.location",
    "group_id": "appliance_amenity"
  },
  "appliance.instructions": {
    "pms_target": "equipmentAndAmenities.instructions OR equipmentAndAmenities.notes",
    "group_id": "appliance_amenity"
  },
  "appliance.availabilityType": {
    "pms_target": "equipmentAndAmenities.availabilityType",
    "group_id": "appliance_amenity"
  },
  "appliance.video": {
    "pms_target": "equipmentAndAmenities.videoUrl [proposed]",
    "status": "proposed",
    "group_id": "appliance_amenity"
  },
  "fv_fire_extinguisher_present": {
    "pms_target": "fireSafety.extinguisherPresent  [GAPS §1.15-extension]"
  },
  "fv_fire_extinguisher_location": {
    "pms_target": "equipmentAndAmenities.location"
  },
  "fv_fire_extinguisher_service_date": {
    "pms_target": "fireSafety.extinguisherServiceDate  [GAPS §1.15]"
  },
  "fv_smoke_detector_present": {
    "pms_target": "equipmentAndAmenities.status"
  },
  "fv_smoke_detector_working": {
    "pms_target": "equipmentAndAmenities.statusNote"
  },
  "fv_co_detector_present": {
    "pms_target": "equipmentAndAmenities.status"
  },
  "fv_first_aid_present": {
    "pms_target": "fireSafety.firstAidKitPresent  [proposed]"
  },
  "fv_first_aid_location": {
    "pms_target": "houseRules.firstAidInstructions.description"
  },
  "consumable.name": {
    "pms_target": "equipmentAndAmenities.name",
    "group_id": "consumable"
  },
  "consumable.meets_standard": {
    "mode": "observe",
    "pms_target": "propertyAssessment.consumableMeetsStandard[item] [proposed GAP]",
    "status": "proposed",
    "group_id": "consumable"
  },
  "consumable.notes": {
    "mode": "observe",
    "pms_target": "equipmentAndAmenities.notes",
    "status": "proposed",
    "group_id": "consumable"
  },
  "consumable.photo": {
    "pms_target": "equipmentAndAmenities.photoUrl [proposed]",
    "status": "proposed",
    "group_id": "consumable"
  },
  "fv_blackout_curtains": {
    "pms_target": "equipmentAndAmenities[] entry (amenity)"
  },
  "fv_photo_bathroom": {
    "pms_target": "profile.photos.url",
    "anchor_to": "fv_bathroom_condition"
  },
  "fv_photo_kitchen": {
    "pms_target": "profile.photos.url"
  },
  "fv_photo_window_ceiling": {
    "pms_target": "profile.photos.url",
    "anchor_to": "fv_blackout_curtains"
  },
  "fv_photo_general_apartment": {
    "pms_target": "profile.photos.url"
  },
  "fv_window_photos_attached": {
    "pms_target": "profile.photos.url"
  },
  "fv_checkout_step_name": {
    "pms_target": "houseRules.checkOutInstructions.steps[].name [proposed] [GAP]",
    "status": "proposed",
    "group_id": "checkout_step"
  },
  "fv_checkout_step_notes": {
    "mode": "observe",
    "pms_target": "houseRules.checkOutInstructions.steps[].notes [proposed] [GAP]",
    "status": "proposed",
    "group_id": "checkout_step"
  },
  "fv_readiness_overall": {
    "pms_target": "status.readinessStatus"
  },
  "fv_readiness_go_live_recommendation": {
    "pms_target": "dealProfile.goLiveRecommendation  [proposed]",
    "status": "proposed"
  },
  "fv_readiness_go_live_delay_weeks": {
    "pms_target": "dealProfile.goLiveDelayWeeks  [proposed]",
    "status": "proposed"
  },
  "fv_readiness_blocking_issues": {
    "mode": "observe",
    "pms_target": "OC.status.blockingIssues  [GAPS §1.9]"
  },
  "fv_readiness_blocking_details": {
    "pms_target": "OC.status.blockingDetails  [GAPS §1.9]"
  },
  "fv_readiness_health_score": {
    "pms_target": "status.healthLevel"
  },
  "fv_readiness_recommendation_summary": {
    "pms_target": "OC.status.recommendationSummary  [GAPS §1.9]"
  },
  "fv_general_comments": {
    "pms_target": "(hub-only — never pushed to PMS)"
  }
};
