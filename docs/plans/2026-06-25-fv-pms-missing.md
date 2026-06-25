# PMS mapping — fields to add/confirm in the hub (Onboarding_tool)

_First-Visit V1 redesign, reconciled against the live PMS OpenAPI schema (https://pms.dev.arbio.io/docs) on 2026-06-25._

The survey defines 135 data points. Gate booleans + the Issue log are intentionally hub-only. Of those mapped to PMS, the paths below are NOT present as strongly-typed fields in the current schema and must be added (or the survey re-pointed). NOTE: `profile`, `houseRules` and `operationalInfo` are freeform (OpenAPI additionalProperties) — paths under them are accepted by the API but may not be surfaced/consumed downstream until the hub wires them.

## Gaps to add/confirm — 44 fields

| Slug | Proposed path | Provenance |
|---|---|---|
| `fv_location_quality` | locationProfile.quality | proposed §1.6-related |
| `fv_neighbourhood_narrative` | locationProfile.neighbourhoodNarrative | proposed §1.6 |
| `fv_neighbourhood_vibe_tags` | locationProfile.vibeTags | proposed §1.6 |
| `fv_best_for_guest_type` | locationProfile.bestForGuestType | proposed §1.6 |
| `fv_parking_actual_type` | accessInfo.parking.type | GAPS §1.25 |
| `fv_parking_spot_number` | accessInfo.parking.spotNumber | NEW — confirm in hub |
| `fv_parking_bike_available` | accessInfo.parking.bikeParkingAvailable | NEW — confirm in hub |
| `fv_building_amenities_verify` | equipmentAndAmenities.name | GAP — equipmentAndAmenities is catalog-linked (resourceId); no free name field |
| `fv_building_elevator_working` | otherDetails.elevator.status | GAPS §1.20 |
| `fv_building_elevator_size` | otherDetails.elevator.size | NEW — confirm in hub |
| `fv_building_elevator_condition` | otherDetails.elevator.condition | NEW — confirm in hub |
| `fv_checkin_notes_overall` | accessInfo.overallNotes | GAPS §1.21 |
| `fv_trash_handler` | operationalModel.trashHandler | GAPS §1.18 |
| `fv_trash_guest_instructions` | houseRules.garbageDisposal.guestInstructions | NEW — confirm in hub |
| `fv_video_fusebox` | equipmentAndAmenities.videoUrl | NEW — confirm in hub |
| `fv_fire_exit_secondary` | fireSafety.secondaryExitPresent | GAPS §1.15 |
| `fv_fire_safety_concerns` | fireSafety.observedConcerns | GAPS §1.15 |
| `fv_video_fire_exit` | houseRules.fireSafetyInstructions.video | NEW — confirm in hub |
| `fv_common_area` | commonAreas[] | GAP — no commonAreas field on property in PMS schema |
| `fv_cleaning_setup` | operationalModel.cleaning | GAPS §1.17 |
| `fv_laundry_setup` | operationalModel.laundry | GAPS §1.17 |
| `fv_wifi_ssid` | profile.wifiDetails.networkName | NEW — confirm in hub |
| `fv_wifi_password` | profile.wifiDetails.password | NEW — confirm in hub |
| `fv_wifi_download_speed_mbps` | profile.wifiDetails.downloadSpeedMbps | GAPS §1.16 |
| `fv_wifi_upload_speed_mbps` | profile.wifiDetails.uploadSpeedMbps | GAPS §1.16 |
| `fv_wifi_guest_router_access` | profile.wifiDetails.guestRouterAccess | GAPS §1.16 |
| `fv_unit_balconies_count` | balconies | GAP — no balconies field on property in PMS schema |
| `fv_apartment_category` | propertyCategory | GAPS §1.8 quality-tier |
| `fv_capacity_base` | profile.baseCapacity | GAP — no base-capacity field in PMS schema |
| `fv_furniture_status` | propertyAssessment.furnitureStatus | proposed |
| `fv_equipment_status` | propertyAssessment.equipmentStatus | proposed |
| `fv_bathroom_condition` | propertyAssessment.bathroomCondition | proposed |
| `item_name` | equipmentAndAmenities.name | GAP — catalog-linked via resourceId; no free name field |
| `item_kind` | equipmentAndAmenities.kind | GAP — no kind field in PMS schema |
| `item_video` | equipmentAndAmenities.videoUrl | GAP — no videoUrl in PMS schema |
| `fv_unit_fusebox_location` | equipmentAndAmenities.location | NEW unit-level — confirm in hub |
| `fv_unit_fusebox_reset_instructions` | equipmentAndAmenities.instructions.description | NEW unit-level — confirm in hub |
| `fv_fire_extinguisher_service_date` | fireSafety.extinguisherServiceDate | GAPS §1.15 |
| `fv_smoke_detector_working` | fireSafety.smokeDetectorWorking | NEW — confirm in hub |
| `fv_co_detector_working` | fireSafety.coDetectorWorking | NEW — confirm in hub |
| `fv_blackout_curtains` | equipmentAndAmenities.name  [amenity entry] | GAP — no name field; catalog resourceId only |
| `fv_ceiling_height_m` | profile.ceilingHeightM | GAPS §1.24 |
| `fv_readiness_host_start_date` | status.hostStartDate | NEW — confirm in hub |
| `fv_readiness_recommendation_summary` | OC.status.recommendationSummary | GAPS §1.9 |

## Confirmed / accepted — 61 fields (no action)

- `fv_visit_date` → SiteVisit.visitDate
- `fv_visit_visitor_name` → SiteVisit.visitorName
- `fv_location_safety_concern` → operationalInfo.safetyConcern
- `fv_parking_dedicated_spots` → accessInfo.parking.numberOfSpaces
- `fv_parking_access_instructions` → accessInfo.parking.instructions
- `fv_video_parking_access` → accessInfo.parking.video
- `fv_parking_nearby_options` → nearby.description
- `fv_building_state` → operationalInfo.buildingState
- `fv_building_mold` → operationalInfo.buildingMold
- `fv_building_construction_nearby` → operationalInfo.constructionNearby
- `fv_accessibility_step_free_entry` → accessibilityInfo.stepFreeEntry
- `fv_accessibility_ramps` → accessibilityInfo.ramps
- `fv_accessibility_notes` → accessibilityInfo.notes
- `fv_step_name` → accessInfo.checkInSteps.name
- `fv_step_access_point` → accessInfo.checkInSteps.accessPoint
- `fv_step_lock_type` → accessInfo.checkInSteps.lock.type
- `fv_step_smart_lock_provider` → accessInfo.checkInSteps.lock.provider
- `fv_step_smart_lock_device_id` → accessInfo.checkInSteps.lock.externalId
- `fv_step_lock_brand` → accessInfo.checkInSteps.lock.brand
- `fv_step_lock_classification` → accessInfo.checkInSteps.lock.classification
- `fv_step_key_storage_method` → accessInfo.checkInSteps.lock.storageType
- `fv_step_storage_brand` → accessInfo.checkInSteps.lock.storageBrand
- `fv_step_default_access_code` → accessInfo.checkInSteps.lock.defaultCode
- `fv_video_checkin_walkthrough` → accessInfo.checkInSteps.videoUrl
- `fv_checkin_complexity` → operationalInfo.checkinComplexity
- `fv_storage_onsite_check` → otherDetails.storageInfo.storageSpaceAvailable
- `fv_storage_location` → otherDetails.storageInfo.internalStorageRoomInstructions
- `fv_storage_access_instructions` → otherDetails.storageInfo.internalStorageRoomInstructions
- `fv_photo_storage_room` → profile.photos.url
- `fv_storage_comments` → otherDetails.storageInfo.luggageStorageInformation
- `fv_trash_container_location` → houseRules.garbageDisposal.trashLocationInstructions.description
- `fv_trash_pickup_schedule` → houseRules.garbageDisposal.collectionSchedule
- `fv_video_trash_location` → houseRules.garbageDisposal.trashLocationVideo
- `fv_fusebox_location` → equipmentAndAmenities.location
- `fv_fusebox_access` → equipmentAndAmenities.instructions.description
- `fv_fusebox_reset_instructions` → equipmentAndAmenities.instructions.description
- `fv_fire_exit_route_notes` → houseRules.fireSafetyInstructions.description
- `fv_photo_fire_safety` → profile.photos.url
- `fv_laundry_delivery_frequency` → equipmentAndAmenities.notes
- `fv_laundry_nearest_laundromat` → nearby.title
- `fv_wifi_router_location` → profile.wifiDetails.routerLocation
- `fv_unit_floor_number` → profile.floor
- `fv_unit_location_in_building` → profile.locationInBuilding
- `fv_unit_type_check` → profile.unitType
- `fv_view_actual` → profile.viewType
- `fv_accessibility_unit_door_widths` → accessibilityInfo.unitDoorWidths
- `fv_location_noise_level` → operationalInfo.noiseLevel
- `fv_location_noise_source` → operationalInfo.noiseSource
- `fv_capacity_max` → property.maxOccupancy
- `item_brand` → equipmentAndAmenities.brand
- `item_location` → equipmentAndAmenities.location
- `item_instructions` → equipmentAndAmenities.instructions
- `item_availability_type` → equipmentAndAmenities.availabilityType
- `fv_fire_extinguisher_location` → equipmentAndAmenities.location
- `fv_first_aid_location` → houseRules.firstAidInstructions.description
- `fv_photo_bathroom` → profile.photos.url
- `fv_photo_kitchen` → profile.photos.url
- `fv_photo_general_apartment` → profile.photos.url
- `fv_photo_window_ceiling` → profile.photos.url
- `fv_readiness_overall` → status.readinessStatus
- `fv_readiness_health_score` → status.healthLevel
