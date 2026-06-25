// AUTO-GENERATED from scripts/redesign/rows.mjs (First-Visit V1 Redesign).
// Structural overlay: per-slug wiring fields (gates, repeaters, media, PMS)
// composed onto editor content by buildSurveyConfig(). Re-run the generator
// after editing rows.mjs; PMS targets are a separate hub follow-up.
import type { StructureOverlay } from './surveyConfig';

export const QUESTION_STRUCTURE: StructureOverlay = {
  "fv_visit_date": {
    "pms_target": "SiteVisit.visitDate"
  },
  "fv_visit_visitor_name": {
    "pms_target": "SiteVisit.visitorName"
  },
  "fv_location_quality": {
    "pms_target": "locationProfile.quality  [proposed §1.6-related]"
  },
  "fv_location_safety_concern": {
    "pms_target": "operationalInfo.safetyConcern"
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
    "pms_target": "accessInfo.parking.type  [GAPS §1.25]"
  },
  "fv_parking_dedicated_spots": {
    "pms_target": "accessInfo.parking.numberOfSpaces",
    "visible_when": {
      "question": "fv_parking_actual_type",
      "not_in": [
        "None"
      ]
    }
  },
  "fv_parking_spot_number": {
    "pms_target": "accessInfo.parking.spotNumber  [NEW — confirm in hub]",
    "visible_when": {
      "question": "fv_parking_actual_type",
      "not_in": [
        "None"
      ]
    }
  },
  "fv_parking_access_instructions": {
    "pms_target": "accessInfo.parking.instructions",
    "visible_when": {
      "question": "fv_parking_actual_type",
      "not_in": [
        "None"
      ]
    }
  },
  "fv_photo_parking_spot": {
    "mode": "observe",
    "visible_when": {
      "question": "fv_parking_actual_type",
      "not_in": [
        "None"
      ]
    }
  },
  "fv_video_parking_access": {
    "mode": "observe",
    "pms_target": "accessInfo.parking.video",
    "visible_when": {
      "question": "fv_parking_actual_type",
      "not_in": [
        "None"
      ]
    }
  },
  "fv_parking_bike_available": {
    "pms_target": "accessInfo.parking.bikeParkingAvailable  [NEW — confirm in hub]"
  },
  "fv_parking_nearby_options": {
    "pms_target": "nearby.description"
  },
  "fv_building_state": {
    "pms_target": "operationalInfo.buildingState"
  },
  "fv_building_mold": {
    "pms_target": "operationalInfo.buildingMold"
  },
  "fv_building_construction_nearby": {
    "pms_target": "operationalInfo.constructionNearby"
  },
  "fv_building_amenities_verify": {
    "pms_target": "equipmentAndAmenities.name  [GAP — equipmentAndAmenities is catalog-linked (resourceId); no free name field]"
  },
  "fv_accessibility_step_free_entry": {
    "pms_target": "accessibilityInfo.stepFreeEntry"
  },
  "fv_accessibility_ramps": {
    "pms_target": "accessibilityInfo.ramps"
  },
  "fv_accessibility_notes": {
    "pms_target": "accessibilityInfo.notes"
  },
  "fv_building_elevator_working": {
    "pms_target": "otherDetails.elevator.status  [GAPS §1.20]",
    "visible_when": {
      "question": "fv_building_elevator_present",
      "equals": true
    }
  },
  "fv_building_elevator_size": {
    "pms_target": "otherDetails.elevator.size  [NEW — confirm in hub]",
    "visible_when": {
      "question": "fv_building_elevator_present",
      "equals": true
    }
  },
  "fv_building_elevator_condition": {
    "pms_target": "otherDetails.elevator.condition  [NEW — confirm in hub]",
    "visible_when": {
      "question": "fv_building_elevator_present",
      "equals": true
    }
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
    "group_id": "checkin_step"
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
  "fv_video_checkin_walkthrough": {
    "mode": "observe",
    "pms_target": "accessInfo.checkInSteps.videoUrl"
  },
  "fv_checkin_notes_overall": {
    "pms_target": "accessInfo.overallNotes  [GAPS §1.21]"
  },
  "fv_checkin_complexity": {
    "pms_target": "operationalInfo.checkinComplexity"
  },
  "fv_storage_onsite_check": {
    "pms_target": "otherDetails.storageInfo.storageSpaceAvailable"
  },
  "fv_storage_location": {
    "pms_target": "otherDetails.storageInfo.internalStorageRoomInstructions",
    "visible_when": {
      "question": "fv_storage_onsite_check",
      "equals": true
    }
  },
  "fv_storage_access_instructions": {
    "pms_target": "otherDetails.storageInfo.internalStorageRoomInstructions",
    "visible_when": {
      "question": "fv_storage_onsite_check",
      "equals": true
    }
  },
  "fv_photo_storage_room": {
    "mode": "observe",
    "pms_target": "profile.photos.url",
    "visible_when": {
      "question": "fv_storage_onsite_check",
      "equals": true
    }
  },
  "fv_storage_comments": {
    "pms_target": "otherDetails.storageInfo.luggageStorageInformation",
    "visible_when": {
      "question": "fv_storage_onsite_check",
      "equals": true
    }
  },
  "fv_trash_container_location": {
    "pms_target": "houseRules.garbageDisposal.trashLocationInstructions.description",
    "visible_when": {
      "question": "fv_trash_area_present",
      "equals": true
    }
  },
  "fv_trash_handler": {
    "pms_target": "operationalModel.trashHandler  [GAPS §1.18]",
    "visible_when": {
      "question": "fv_trash_area_present",
      "equals": true
    }
  },
  "fv_trash_pickup_schedule": {
    "pms_target": "houseRules.garbageDisposal.collectionSchedule",
    "visible_when": {
      "question": "fv_trash_area_present",
      "equals": true
    }
  },
  "fv_trash_guest_instructions": {
    "pms_target": "houseRules.garbageDisposal.guestInstructions  [NEW — confirm in hub]"
  },
  "fv_video_trash_location": {
    "mode": "observe",
    "pms_target": "houseRules.garbageDisposal.trashLocationVideo",
    "visible_when": {
      "question": "fv_trash_area_present",
      "equals": true
    }
  },
  "fv_fusebox_location": {
    "pms_target": "equipmentAndAmenities.location",
    "visible_when": {
      "question": "fv_fusebox_present",
      "equals": true
    }
  },
  "fv_fusebox_access": {
    "pms_target": "equipmentAndAmenities.instructions.description",
    "visible_when": {
      "question": "fv_fusebox_present",
      "equals": true
    }
  },
  "fv_fusebox_reset_instructions": {
    "pms_target": "equipmentAndAmenities.instructions.description",
    "visible_when": {
      "question": "fv_fusebox_present",
      "equals": true
    }
  },
  "fv_video_fusebox": {
    "mode": "observe",
    "pms_target": "equipmentAndAmenities.videoUrl  [NEW — confirm in hub]",
    "visible_when": {
      "question": "fv_fusebox_present",
      "equals": true
    }
  },
  "fv_fire_exit_secondary": {
    "pms_target": "fireSafety.secondaryExitPresent  [GAPS §1.15]",
    "visible_when": {
      "question": "fv_fire_safety_present",
      "equals": true
    }
  },
  "fv_fire_exit_route_notes": {
    "pms_target": "houseRules.fireSafetyInstructions.description",
    "visible_when": {
      "question": "fv_fire_safety_present",
      "equals": true
    }
  },
  "fv_fire_safety_concerns": {
    "pms_target": "fireSafety.observedConcerns  [GAPS §1.15]",
    "visible_when": {
      "question": "fv_fire_safety_present",
      "equals": true
    }
  },
  "fv_video_fire_exit": {
    "mode": "observe",
    "pms_target": "houseRules.fireSafetyInstructions.video  [NEW — confirm in hub]",
    "visible_when": {
      "question": "fv_fire_safety_present",
      "equals": true
    }
  },
  "fv_photo_fire_safety": {
    "mode": "observe",
    "pms_target": "profile.photos.url",
    "visible_when": {
      "question": "fv_fire_safety_present",
      "equals": true
    }
  },
  "fv_common_area": {
    "pms_target": "commonAreas[]  [GAP — no commonAreas field on property in PMS schema]"
  },
  "fv_cleaning_setup": {
    "pms_target": "operationalModel.cleaning  [GAPS §1.17]"
  },
  "fv_laundry_setup": {
    "pms_target": "operationalModel.laundry  [GAPS §1.17]"
  },
  "fv_laundry_delivery_frequency": {
    "pms_target": "equipmentAndAmenities.notes",
    "visible_when": {
      "question": "fv_laundry_setup",
      "not_equals": "Not yet set up"
    }
  },
  "fv_laundry_nearest_laundromat": {
    "pms_target": "nearby.title"
  },
  "fv_wifi_ssid": {
    "pms_target": "profile.wifiDetails.networkName  [NEW — confirm in hub]",
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_wifi_password": {
    "pms_target": "profile.wifiDetails.password  [NEW — confirm in hub]",
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_wifi_download_speed_mbps": {
    "pms_target": "profile.wifiDetails.downloadSpeedMbps  [GAPS §1.16]",
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_wifi_upload_speed_mbps": {
    "pms_target": "profile.wifiDetails.uploadSpeedMbps  [GAPS §1.16]",
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_wifi_router_location": {
    "pms_target": "profile.wifiDetails.routerLocation",
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_wifi_guest_router_access": {
    "pms_target": "profile.wifiDetails.guestRouterAccess  [GAPS §1.16]",
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_unit_floor_number": {
    "pms_target": "profile.floor"
  },
  "fv_unit_location_in_building": {
    "pms_target": "profile.locationInBuilding"
  },
  "fv_unit_type_check": {
    "pms_target": "profile.unitType"
  },
  "fv_unit_balconies_count": {
    "pms_target": "balconies  [GAP — no balconies field on property in PMS schema]",
    "visible_when": {
      "question": "fv_unit_balcony_present",
      "equals": true
    }
  },
  "fv_view_actual": {
    "pms_target": "profile.viewType"
  },
  "fv_apartment_category": {
    "pms_target": "propertyCategory  [GAPS §1.8 quality-tier]"
  },
  "fv_accessibility_unit_door_widths": {
    "pms_target": "accessibilityInfo.unitDoorWidths"
  },
  "fv_location_noise_level": {
    "pms_target": "operationalInfo.noiseLevel"
  },
  "fv_location_noise_source": {
    "pms_target": "operationalInfo.noiseSource",
    "visible_when": {
      "question": "fv_location_noise_level",
      "not_equals": "No"
    }
  },
  "fv_capacity_base": {
    "pms_target": "profile.baseCapacity  [GAP — no base-capacity field in PMS schema]"
  },
  "fv_capacity_max": {
    "pms_target": "property.maxOccupancy"
  },
  "fv_furniture_status": {
    "pms_target": "propertyAssessment.furnitureStatus  [proposed]"
  },
  "fv_equipment_status": {
    "pms_target": "propertyAssessment.equipmentStatus  [proposed]"
  },
  "fv_bathroom_condition": {
    "pms_target": "propertyAssessment.bathroomCondition  [proposed]"
  },
  "issue_name": {
    "group_id": "issue",
    "visible_when": {
      "question": "fv_issues_found",
      "equals": true
    }
  },
  "issue_type": {
    "group_id": "issue",
    "visible_when": {
      "question": "fv_issues_found",
      "equals": true
    }
  },
  "issue_location": {
    "group_id": "issue",
    "visible_when": {
      "question": "fv_issues_found",
      "equals": true
    }
  },
  "issue_resolution": {
    "group_id": "issue",
    "visible_when": {
      "question": "fv_issues_found",
      "equals": true
    }
  },
  "issue_quantity": {
    "group_id": "issue",
    "visible_when": {
      "question": "fv_issues_found",
      "equals": true
    }
  },
  "issue_cost_estimate_eur": {
    "group_id": "issue",
    "visible_when": {
      "question": "fv_issues_found",
      "equals": true
    }
  },
  "issue_urgency": {
    "group_id": "issue",
    "visible_when": {
      "question": "fv_issues_found",
      "equals": true
    }
  },
  "issue_media": {
    "mode": "observe",
    "group_id": "issue",
    "visible_when": {
      "question": "fv_issues_found",
      "equals": true
    }
  },
  "issue_notes": {
    "group_id": "issue",
    "visible_when": {
      "question": "fv_issues_found",
      "equals": true
    }
  },
  "item_name": {
    "pms_target": "equipmentAndAmenities.name  [GAP — catalog-linked via resourceId; no free name field]",
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_kind": {
    "pms_target": "equipmentAndAmenities.kind  [GAP — no kind field in PMS schema]",
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_brand": {
    "pms_target": "equipmentAndAmenities.brand",
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_location": {
    "pms_target": "equipmentAndAmenities.location",
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_instructions": {
    "pms_target": "equipmentAndAmenities.instructions",
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_availability_type": {
    "pms_target": "equipmentAndAmenities.availabilityType",
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_video": {
    "mode": "observe",
    "pms_target": "equipmentAndAmenities.videoUrl  [GAP — no videoUrl in PMS schema]",
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "fv_unit_fusebox_location": {
    "pms_target": "equipmentAndAmenities.location  [NEW unit-level — confirm in hub]",
    "visible_when": {
      "question": "fv_unit_fusebox_present",
      "equals": true
    }
  },
  "fv_unit_fusebox_reset_instructions": {
    "pms_target": "equipmentAndAmenities.instructions.description  [NEW unit-level — confirm in hub]",
    "visible_when": {
      "question": "fv_unit_fusebox_present",
      "equals": true
    }
  },
  "fv_fire_extinguisher_location": {
    "pms_target": "equipmentAndAmenities.location",
    "visible_when": {
      "question": "fv_fire_extinguisher_present",
      "equals": true
    }
  },
  "fv_fire_extinguisher_service_date": {
    "pms_target": "fireSafety.extinguisherServiceDate  [GAPS §1.15]",
    "visible_when": {
      "question": "fv_fire_extinguisher_present",
      "equals": true
    }
  },
  "fv_smoke_detector_working": {
    "pms_target": "fireSafety.smokeDetectorWorking  [NEW — confirm in hub]",
    "visible_when": {
      "question": "fv_smoke_detector_present",
      "equals": true
    }
  },
  "fv_co_detector_working": {
    "pms_target": "fireSafety.coDetectorWorking  [NEW — confirm in hub]",
    "visible_when": {
      "question": "fv_co_detector_present",
      "equals": true
    }
  },
  "fv_first_aid_location": {
    "pms_target": "houseRules.firstAidInstructions.description",
    "visible_when": {
      "question": "fv_first_aid_present",
      "equals": true
    }
  },
  "fv_blackout_curtains": {
    "pms_target": "equipmentAndAmenities.name  [amenity entry]  [GAP — no name field; catalog resourceId only]"
  },
  "fv_ceiling_height_m": {
    "pms_target": "profile.ceilingHeightM  [GAPS §1.24]"
  },
  "fv_photo_bathroom": {
    "mode": "observe",
    "pms_target": "profile.photos.url"
  },
  "fv_photo_kitchen": {
    "mode": "observe",
    "pms_target": "profile.photos.url"
  },
  "fv_photo_general_apartment": {
    "mode": "observe",
    "pms_target": "profile.photos.url"
  },
  "fv_photo_window_ceiling": {
    "mode": "observe",
    "pms_target": "profile.photos.url"
  },
  "fv_readiness_overall": {
    "pms_target": "status.readinessStatus"
  },
  "fv_readiness_host_start_date": {
    "pms_target": "status.hostStartDate  [NEW — confirm in hub]"
  },
  "fv_readiness_health_score": {
    "pms_target": "status.healthLevel"
  },
  "fv_readiness_recommendation_summary": {
    "pms_target": "OC.status.recommendationSummary  [GAPS §1.9]"
  }
};
