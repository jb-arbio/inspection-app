# PMS mapping — First-Visit V1 redesign

_Reconciled field-by-field against the LIVE PMS OpenAPI schema (https://pms.dev.arbio.io/docs) on 2026-06-25._

135 survey data points:
- **76 pushed to PMS** — 38 typed · 34 freeform · 4 catalog-resolved
- **28 hub backlog** — no storable PMS location; unmapped until the hub adds a field (or we re-point)
- **31 hub-only** — gate booleans + Issue log (by design)

## 1. Hub backlog — needs a new PMS field — 28

| Slug | Why |
|---|---|
| `fv_location_quality` | no location-quality field in PMS |
| `fv_neighbourhood_narrative` | no neighbourhood-narrative field in PMS |
| `fv_neighbourhood_vibe_tags` | no vibe-tags field in PMS |
| `fv_best_for_guest_type` | no best-for-guest field in PMS |
| `fv_parking_actual_type` | accessInfo.parking has no type field |
| `fv_parking_spot_number` | accessInfo.parking has no spot-number field |
| `fv_parking_bike_available` | accessInfo.parking has no bike-parking field |
| `fv_building_elevator_working` | otherDetails.elevator has no working/status field |
| `fv_building_elevator_size` | otherDetails.elevator has no size field |
| `fv_building_elevator_condition` | otherDetails.elevator has no condition field |
| `fv_accessibility_step_free_entry` | no accessibility object in PMS |
| `fv_accessibility_ramps` | no accessibility object in PMS |
| `fv_accessibility_notes` | no accessibility object in PMS |
| `fv_accessibility_unit_door_widths` | no accessibility object in PMS |
| `fv_furniture_status` | no propertyAssessment object in PMS |
| `fv_equipment_status` | no propertyAssessment object in PMS |
| `fv_bathroom_condition` | no propertyAssessment object in PMS |
| `fv_fire_exit_secondary` | no fireSafety object in PMS |
| `fv_fire_safety_concerns` | no fireSafety object in PMS |
| `fv_fire_extinguisher_service_date` | no fireSafety object in PMS |
| `fv_smoke_detector_working` | no fireSafety object in PMS |
| `fv_co_detector_working` | no fireSafety object in PMS |
| `fv_common_area` | no commonAreas field on the typed property root |
| `fv_checkin_notes_overall` | accessInfo has no overallNotes field |
| `fv_video_fusebox` | equipmentAndAmenities has no videoUrl field |
| `item_video` | equipmentAndAmenities has no videoUrl field |
| `fv_readiness_host_start_date` | status/dealProfile have no host-start date field |
| `fv_readiness_recommendation_summary` | status has no recommendation-summary field |

## 2. Pushed — freeform objects (34)

`profile` / `operationalInfo` / `houseRules` are `additionalProperties` — the API accepts + returns these, but confirm a hub consumer reads them.

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
- `fv_cleaning_setup` → `operationalInfo.cleaning`
- `fv_laundry_setup` → `operationalInfo.laundry`
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

## 3. Pushed — typed fields (38)

Real, strongly-typed PMS fields.

- `fv_visit_date` → `SiteVisit.visitDate`
- `fv_visit_visitor_name` → `SiteVisit.visitorName`
- `fv_parking_dedicated_spots` → `accessInfo.parking.numberOfSpaces`
- `fv_parking_access_instructions` → `accessInfo.parking.instructions`
- `fv_video_parking_access` → `accessInfo.parking.video`
- `fv_parking_nearby_options` → `nearby.description`
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
- `fv_fusebox_access` → `equipmentAndAmenities.instructions`
- `fv_fusebox_reset_instructions` → `equipmentAndAmenities.instructions`
- `fv_laundry_delivery_frequency` → `equipmentAndAmenities.notes`
- `fv_laundry_nearest_laundromat` → `nearby.title`
- `fv_unit_balconies_count` → `balconies`
- `fv_apartment_category` → `propertyCategory`
- `fv_capacity_max` → `property.maxOccupancy`
- `item_brand` → `equipmentAndAmenities.brand`
- `item_location` → `equipmentAndAmenities.location`
- `item_instructions` → `equipmentAndAmenities.instructions`
- `item_availability_type` → `equipmentAndAmenities.availabilityType`
- `fv_unit_fusebox_location` → `equipmentAndAmenities.location`
- `fv_unit_fusebox_reset_instructions` → `equipmentAndAmenities.instructions`
- `fv_fire_extinguisher_location` → `equipmentAndAmenities.location`
- `fv_readiness_overall` → `status.readinessStatus`
- `fv_readiness_health_score` → `status.healthLevel`

## 4. Pushed — catalog-resolved (4)

Resolved from the equipment/amenity catalog via `resourceId` — confirm the write path.

- `fv_building_amenities_verify` → `equipmentAndAmenities (amenity entries)`
- `item_name` → `equipmentAndAmenities.name`
- `item_kind` → `equipmentAndAmenities.type`
- `fv_blackout_curtains` → `equipmentAndAmenities (amenity entry)`
