# PMS mapping for the First-Visit V1 redesign

_Reconciled against the LIVE PMS OpenAPI schema (https://pms.dev.arbio.io/docs), inspected field-by-field on 2026-06-25._

135 survey data points. 30 are intentionally hub-only (gate booleans + the Issue log → findings CSV) and not listed. The remaining mapped fields fall into three tiers:

## TIER 1 — Hard gaps: NOT in the PMS schema (31)

The target object/field does not exist and the parent is strongly-typed (so the API will not store it). The hub must add the field, or we re-point the survey.

| Slug | Current target | Why it is a gap |
|---|---|---|
| `fv_location_quality` | `locationProfile.quality` | no locationProfile object (root is typed) |
| `fv_neighbourhood_narrative` | `locationProfile.neighbourhoodNarrative` | no locationProfile object |
| `fv_neighbourhood_vibe_tags` | `locationProfile.vibeTags` | no locationProfile object |
| `fv_best_for_guest_type` | `locationProfile.bestForGuestType` | no locationProfile object |
| `fv_parking_actual_type` | `accessInfo.parking.type` | accessInfo.parking has no `type` (only parkingIncluded) |
| `fv_parking_spot_number` | `accessInfo.parking.spotNumber` | accessInfo.parking has no spot-number field |
| `fv_parking_bike_available` | `accessInfo.parking.bikeParkingAvailable` | accessInfo.parking has no bike-parking field |
| `fv_accessibility_step_free_entry` | `accessibilityInfo.stepFreeEntry` | no accessibilityInfo object |
| `fv_accessibility_ramps` | `accessibilityInfo.ramps` | no accessibilityInfo object |
| `fv_accessibility_notes` | `accessibilityInfo.notes` | no accessibilityInfo object |
| `fv_building_elevator_working` | `otherDetails.elevator.status` | otherDetails.elevator has only {available, instructions} — no status |
| `fv_building_elevator_size` | `otherDetails.elevator.size` | otherDetails.elevator has no size field |
| `fv_building_elevator_condition` | `otherDetails.elevator.condition` | otherDetails.elevator has no condition field |
| `fv_checkin_notes_overall` | `accessInfo.overallNotes` | accessInfo has no overallNotes (steps have additionalInfo) |
| `fv_trash_handler` | `operationalModel.trashHandler` | no operationalModel object (operatingModel exists — confirm sub-keys) |
| `fv_video_fusebox` | `equipmentAndAmenities.videoUrl` | equipmentAndAmenities has no videoUrl |
| `fv_fire_exit_secondary` | `fireSafety.secondaryExitPresent` | no fireSafety object |
| `fv_fire_safety_concerns` | `fireSafety.observedConcerns` | no fireSafety object |
| `fv_common_area` | `commonAreas` | no commonAreas field on the (typed) property root |
| `fv_cleaning_setup` | `operationalModel.cleaning` | no operationalModel object (operatingModel exists — confirm sub-keys) |
| `fv_laundry_setup` | `operationalModel.laundry` | no operationalModel object (operatingModel exists — confirm sub-keys) |
| `fv_accessibility_unit_door_widths` | `accessibilityInfo.unitDoorWidths` | no accessibilityInfo object |
| `fv_furniture_status` | `propertyAssessment.furnitureStatus` | no propertyAssessment object |
| `fv_equipment_status` | `propertyAssessment.equipmentStatus` | no propertyAssessment object |
| `fv_bathroom_condition` | `propertyAssessment.bathroomCondition` | no propertyAssessment object |
| `item_video` | `equipmentAndAmenities.videoUrl` | equipmentAndAmenities has no videoUrl |
| `fv_fire_extinguisher_service_date` | `fireSafety.extinguisherServiceDate` | no fireSafety object |
| `fv_smoke_detector_working` | `fireSafety.smokeDetectorWorking` | no fireSafety object |
| `fv_co_detector_working` | `fireSafety.coDetectorWorking` | no fireSafety object |
| `fv_readiness_host_start_date` | `status.hostStartDate` | status has no host-start/go-live date |
| `fv_readiness_recommendation_summary` | `OC.status.recommendationSummary` | status has no recommendationSummary |

## TIER 2 — Freeform-accepted (32)

Parent object (`profile` / `operationalInfo` / `houseRules`) is freeform (`additionalProperties`). The API STORES these, but they are not strongly-typed — confirm the hub actually reads/surfaces them.

- `fv_location_safety_concern` → `operationalInfo.safetyConcern`
- `fv_building_state` → `operationalInfo.buildingState`
- `fv_building_mold` → `operationalInfo.buildingMold`
- `fv_building_construction_nearby` → `operationalInfo.constructionNearby`
- `fv_checkin_complexity` → `operationalInfo.checkinComplexity`
- `fv_photo_storage_room` → `profile.photos.url`
- `fv_trash_container_location` → `houseRules.garbageDisposal.trashLocationInstructions.description`
- `fv_trash_pickup_schedule` → `houseRules.garbageDisposal.collectionSchedule`
- `fv_trash_guest_instructions` → `houseRules.garbageDisposal.guestInstructions`
- `fv_video_trash_location` → `houseRules.garbageDisposal.trashLocationVideo`
- `fv_fire_exit_route_notes` → `houseRules.fireSafetyInstructions.description`
- `fv_video_fire_exit` → `houseRules.fireSafetyInstructions.video`
- `fv_photo_fire_safety` → `profile.photos.url`
- `fv_wifi_ssid` → `profile.wifiDetails.networkName`
- `fv_wifi_password` → `profile.wifiDetails.password`
- `fv_wifi_download_speed_mbps` → `profile.wifiDetails.downloadSpeedMbps`
- `fv_wifi_upload_speed_mbps` → `profile.wifiDetails.uploadSpeedMbps`
- `fv_wifi_router_location` → `profile.wifiDetails.routerLocation`
- `fv_wifi_guest_router_access` → `profile.wifiDetails.guestRouterAccess`
- `fv_unit_floor_number` → `profile.floor`
- `fv_unit_location_in_building` → `profile.locationInBuilding`
- `fv_unit_type_check` → `profile.unitType`
- `fv_view_actual` → `profile.viewType`
- `fv_location_noise_level` → `operationalInfo.noiseLevel`
- `fv_location_noise_source` → `operationalInfo.noiseSource`
- `fv_capacity_base` → `profile.baseCapacity`
- `fv_first_aid_location` → `houseRules.firstAidInstructions.description`
- `fv_ceiling_height_m` → `profile.ceilingHeightM`
- `fv_photo_bathroom` → `profile.photos.url`
- `fv_photo_kitchen` → `profile.photos.url`
- `fv_photo_general_apartment` → `profile.photos.url`
- `fv_photo_window_ceiling` → `profile.photos.url`

## TIER 3 — Confirmed strongly-typed (42)

These map to real, typed PMS fields and push correctly.

- `fv_visit_date` → `SiteVisit.visitDate`
- `fv_visit_visitor_name` → `SiteVisit.visitorName`
- `fv_parking_dedicated_spots` → `accessInfo.parking.numberOfSpaces`
- `fv_parking_access_instructions` → `accessInfo.parking.instructions`
- `fv_video_parking_access` → `accessInfo.parking.video`
- `fv_parking_nearby_options` → `nearby.description`
- `fv_building_amenities_verify` → `equipmentAndAmenities (amenity entries)`
- `fv_step_name` → `accessInfo.checkInSteps.name`
- `fv_step_access_point` → `accessInfo.checkInSteps.accessPoint`
- `fv_step_lock_type` → `accessInfo.checkInSteps.lock.type`
- `fv_step_smart_lock_provider` → `accessInfo.checkInSteps.lock.provider`
- `fv_step_smart_lock_device_id` → `accessInfo.checkInSteps.lock.externalId`
- `fv_step_lock_brand` → `accessInfo.checkInSteps.lock.brand`
- `fv_step_lock_classification` → `accessInfo.checkInSteps.lock.classification`
- `fv_step_key_storage_method` → `accessInfo.checkInSteps.lock.storageType`
- `fv_step_storage_brand` → `accessInfo.checkInSteps.lock.storageBrand`
- `fv_step_default_access_code` → `accessInfo.checkInSteps.lock.defaultCode`
- `fv_video_checkin_walkthrough` → `accessInfo.checkInSteps.videoUrl`
- `fv_storage_onsite_check` → `otherDetails.storageInfo.storageSpaceAvailable`
- `fv_storage_location` → `otherDetails.storageInfo.internalStorageRoomInstructions`
- `fv_storage_access_instructions` → `otherDetails.storageInfo.internalStorageRoomInstructions`
- `fv_storage_comments` → `otherDetails.storageInfo.luggageStorageInformation`
- `fv_fusebox_location` → `equipmentAndAmenities.location`
- `fv_fusebox_access` → `equipmentAndAmenities.instructions.description`
- `fv_fusebox_reset_instructions` → `equipmentAndAmenities.instructions.description`
- `fv_laundry_delivery_frequency` → `equipmentAndAmenities.notes`
- `fv_laundry_nearest_laundromat` → `nearby.title`
- `fv_unit_balconies_count` → `balconies`
- `fv_apartment_category` → `propertyCategory`
- `fv_capacity_max` → `property.maxOccupancy`
- `item_name` → `equipmentAndAmenities.name`
- `item_kind` → `equipmentAndAmenities.type`
- `item_brand` → `equipmentAndAmenities.brand`
- `item_location` → `equipmentAndAmenities.location`
- `item_instructions` → `equipmentAndAmenities.instructions`
- `item_availability_type` → `equipmentAndAmenities.availabilityType`
- `fv_unit_fusebox_location` → `equipmentAndAmenities.location`
- `fv_unit_fusebox_reset_instructions` → `equipmentAndAmenities.instructions.description`
- `fv_fire_extinguisher_location` → `equipmentAndAmenities.location`
- `fv_blackout_curtains` → `equipmentAndAmenities (amenity entry)`
- `fv_readiness_overall` → `status.readinessStatus`
- `fv_readiness_health_score` → `status.healthLevel`
