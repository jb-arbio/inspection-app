# First-Visit → PMS routing & strategy (grounded in the live write schema)

Built from the live PMS OpenAPI (units/properties/buildings **write** bodies). Single slug per data point, anchored to what the PMS actually accepts. Supersedes earlier label-based drafts.

## The split — 135 fields
| Group | Count | What it means | Action |
|---|---|---|---|
| **Typed PMS field** | **25** | Real PMS field, validated & used by the PMS app | Rename survey slug to the PMS path; push (survey side, now) |
| **Freeform bucket only** | **53** | No typed field — lives in `profile`/`houseRules`/`operationalInfo` (open objects). Stored & API-readable, but the PMS app doesn't natively act on it | Push as structured keys — **gated on the persistence test** (see below) |
| **Hub-only** | **57** | No PMS home, correctly (condition, defects, scores, photos, gates) | Hub creates boxes; never pushed |

## DECISION (2026-06-28): push all 53 as freeform now
To finish the first-visit survey work without waiting on the PMS, the 53 freeform fields are **pushed into `profile`/`houseRules`/`operationalInfo` as structured keys now.** The persistence test below is downgraded from a blocker to a **parallel verification** — run it to confirm the PMS keeps the keys; if it turns out they're stripped, those fields fall back to hub-only with no survey-side change. The survey app is unaffected either way (it already emits the aligned `fv_*` slugs; routing lives in the hub registry).

## Recommendation (the 53 freeform fields)
1. **Persistence test** — `docs/pms-freeform-persistence-test.md` — run in parallel to confirm the PMS keeps custom freeform keys (not a blocker per the decision above).
   - Persisted → the 53 push as freeform keys (the plan).
   - Stripped → the 53 fall back to hub-only (still prefill + internal reporting; no PMS push).
2. **Place data semantically, reuse the hub's existing keys** (e.g. `profile.wifi`, `houseRules.trash`). One slug end-to-end. If the PMS ever types a field, it's a rename, not a re-collection.
3. **Push structured objects, never a stringified blob** — keep per-field granularity (trash location vs schedule vs handler stay distinct). Note: freeform values must be *objects* (`additionalProperties:{type:object}`).
4. **Don't block on the PMS changing** — freeform-with-convention captures the data today and migrates cleanly later.
5. **Don't let this block the other 82** — the 25 typed + 57 hub-only proceed regardless.

**Honest caveat:** even when persisted, the 53 are *stored-but-not-natively-used* by the PMS app/automations. Fine for our tools reading the hub/PMS API; a field that must drive a listing would need real PMS typing later (per-field future ask, not a blocker).

## 3 questions for the PMS owner (parallel to the test)
1. **Trash:** `houseRules.garbageDisposal` is a single string on read. Confirm we may add a structured `houseRules.trash` object (write bucket is open) rather than collapsing.
2. **Equipment name/kind:** read API returns `equipmentAndAmenities[].name`/`.type`; the write body omits them — does PUT accept them?
3. **WiFi:** no typed ssid/password (only `profile.wifiRouterLocation`) — freeform under `profile`, fine?

---

## Tier 1 — typed PMS leaf (25)
| Survey slug | Label | PMS write path |
|---|---|---|
| `fv_step_name` | Check-in step name | `property.accessInfo.checkInSteps[].name` |
| `fv_step_access_point` | Access point | `property.accessInfo.checkInSteps[].accessPoint` |
| `fv_step_lock_type` | Lock type | `property.accessInfo.checkInSteps[].lock.type` |
| `fv_step_smart_lock_provider` | Smart lock provider | `property.accessInfo.checkInSteps[].lock.provider` |
| `fv_step_smart_lock_device_id` | Smart lock device ID / serial | `property.accessInfo.checkInSteps[].lock.externalId` |
| `fv_step_lock_brand` | Lock brand / manufacturer | `property.accessInfo.checkInSteps[].lock.brand` |
| `fv_step_lock_classification` | Lock classification | `property.accessInfo.checkInSteps[].lock.classification` |
| `fv_step_key_storage_method` | Key storage method | `property.accessInfo.checkInSteps[].lock.storageType` |
| `fv_step_storage_brand` | Storage brand | `property.accessInfo.checkInSteps[].lock.storageBrand` |
| `fv_step_default_access_code` | Default access code | `property.accessInfo.checkInSteps[].lock.defaultCode` |
| `fv_video_checkin_walkthrough` | Check-in walkthrough video | `property.accessInfo.checkInSteps[].videoUrl` |
| `fv_parking_dedicated_spots` | Number of dedicated spots | `property.accessInfo.parking.numberOfSpaces` |
| `fv_parking_access_instructions` | Parking access instructions | `property.accessInfo.parking.instructions` |
| `fv_video_parking_access` | Parking access video | `property.accessInfo.parking.video` |
| `fv_building_elevator_present` | Is there an elevator? | `property.otherDetails.elevator.available` |
| `fv_storage_onsite_check` | Luggage storage on-site? | `property.otherDetails.storageInfo.storageSpaceAvailable` |
| `fv_storage_access_instructions` | Storage access instructions for guest | `property.otherDetails.storageInfo.luggageStorageInformation` |
| `fv_storage_comments` | Storage comments | `property.otherDetails.storageInfo.internalStorageRoomInstructions` |
| `fv_apartment_category` | Apartment category | `property.category` |
| `fv_unit_balconies_count` | Number of balconies | `property.balconies` |
| `fv_capacity_max` | Max capacity (incl. sofa beds/extra) | `property.maxOccupancy` |
| `item_brand` | Brand / manufacturer | `property.equipmentAndAmenities[].brand` |
| `item_location` | Location in unit | `property.equipmentAndAmenities[].location` |
| `item_instructions` | Operation notes / how to use | `property.equipmentAndAmenities[].instructions[].description` |
| `item_availability_type` | Availability type | `property.equipmentAndAmenities[].availabilityType` |

## Freeform — `profile` (12)
| Survey slug | Label | Target bucket |
|---|---|---|
| `fv_unit_floor_number` | Floor of unit | `property.profile.…` |
| `fv_unit_location_in_building` | Unit number / location (e.g. links · rechts · Mitte) | `property.profile.…` |
| `fv_unit_type_check` | Unit type | `property.profile.…` |
| `fv_view_actual` | Unit view | `property.profile.…` |
| `fv_view_comments` | View comments | `property.profile.…` |
| `fv_wifi_present` | Wi-Fi available? | `property.profile.…` |
| `fv_wifi_ssid` | WiFi network name (SSID) | `property.profile.…` |
| `fv_wifi_password` | WiFi password | `property.profile.…` |
| `fv_wifi_router_location` | WiFi router physical location | `property.profile.…` |
| `fv_wifi_download_speed_mbps` | WiFi download speed (Mbps) | `property.profile.…` |
| `fv_wifi_upload_speed_mbps` | WiFi upload speed (Mbps) | `property.profile.…` |
| `fv_wifi_guest_router_access` | Guest access to router? | `property.profile.…` |

## Freeform — `houseRules` (18)
| Survey slug | Label | Target bucket |
|---|---|---|
| `fv_trash_area_present` | Is there a designated trash area? | `property.houseRules.…` |
| `fv_trash_container_location` | Trash container location | `property.houseRules.…` |
| `fv_trash_handler` | Trash handled by | `property.houseRules.…` |
| `fv_trash_pickup_schedule` | Pickup schedule | `property.houseRules.…` |
| `fv_trash_guest_instructions` | Guest trash instructions (how guests dispose of trash) | `property.houseRules.…` |
| `fv_fusebox_present` | Is there a central/building fuse box? | `property.houseRules.…` |
| `fv_fusebox_location` | Fuse box location (building) | `property.houseRules.…` |
| `fv_fusebox_access` | Fuse box access (building) | `property.houseRules.…` |
| `fv_fusebox_reset_instructions` | Fuse box reset instructions (building) | `property.houseRules.…` |
| `fv_unit_fusebox_present` | Is there a fuse box in the unit? | `property.houseRules.…` |
| `fv_unit_fusebox_location` | Unit fuse box location | `property.houseRules.…` |
| `fv_unit_fusebox_reset_instructions` | Unit fuse box reset instructions | `property.houseRules.…` |
| `fv_fire_safety_present` | Is there central/building fire safety? | `property.houseRules.…` |
| `fv_fire_exit_secondary` | Secondary fire exit available? | `property.houseRules.…` |
| `fv_fire_exit_route_notes` | Fire exit route notes | `property.houseRules.…` |
| `fv_fire_safety_concerns` | Fire safety concerns observed (building-level) | `property.houseRules.…` |
| `fv_first_aid_present` | First-aid kit present? | `property.houseRules.…` |
| `fv_first_aid_location` | First-aid kit location | `property.houseRules.…` |

## Freeform — `operationalInfo` (23)
| Survey slug | Label | Target bucket |
|---|---|---|
| `fv_general_comments` | General comments / flags | `property.operationalInfo.…` |
| `fv_checkin_notes_overall` | Overall check-in notes (not per-step) | `property.operationalInfo.…` |
| `fv_checkin_complexity` | Check-in complexity overall | `property.operationalInfo.…` |
| `fv_cleaning_setup` | Cleaning setup | `property.operationalInfo.…` |
| `fv_laundry_setup` | Laundry setup | `property.operationalInfo.…` |
| `fv_laundry_delivery_frequency` | Laundry delivery frequency | `property.operationalInfo.…` |
| `fv_laundry_nearest_laundromat` | Nearest laundromat for guests | `property.operationalInfo.…` |
| `fv_extra_services_offered` | Extra services offered | `property.operationalInfo.…` |
| `fv_storage_location` | Storage location | `property.operationalInfo.…` |
| `fv_common_area` | Common areas / building facilities | `property.operationalInfo.…` |
| `fv_building_amenities_verify` | Building amenities | `property.operationalInfo.…` |
| `fv_parking_actual_type` | Is there parking at the property? | `property.operationalInfo.…` |
| `fv_parking_spot_number` | Exact parking spot number | `property.operationalInfo.…` |
| `fv_parking_bike_available` | Bike parking available? | `property.operationalInfo.…` |
| `fv_parking_nearby_options` | Nearby parking options | `property.operationalInfo.…` |
| `fv_neighbourhood_narrative` | Neighbourhood narrative (3-5 sentences) | `property.operationalInfo.…` |
| `fv_neighbourhood_vibe_tags` | Neighbourhood vibe tags | `property.operationalInfo.…` |
| `fv_best_for_guest_type` | Best for guest type | `property.operationalInfo.…` |
| `fv_location_notes` | Location notes | `property.operationalInfo.…` |
| `fv_capacity_base` | Base capacity (standard beds) | `property.operationalInfo.…` |
| `fv_capacity_actual_setup` | Capacity / bed setup notes | `property.operationalInfo.…` |
| `fv_capacity_comments` | Capacity comments | `property.operationalInfo.…` |
| `fv_readiness_recommendation_summary` | Summary recommendation | `property.operationalInfo.…` |

## Hub-only — no PMS push (57)
| Survey slug | Label |
|---|---|
| `fv_visit_date` | Date of visit |
| `fv_visit_visitor_name` | Visitor name |
| `fv_location_quality` | Location quality for guests |
| `fv_location_safety_concern` | Location safety concern |
| `fv_photo_parking_spot` | Photo of the parking spot |
| `fv_building_state` | Building state |
| `fv_building_mold` | Mold visible in building? |
| `fv_building_hallways_clean` | Hallways clean? |
| `fv_building_construction_nearby` | Construction site/disruption nearby? |
| `fv_accessibility_step_free_entry` | Step-free entry to the building? |
| `fv_accessibility_ramps` | Ramps / accessibility aids present? |
| `fv_accessibility_notes` | Other accessibility / mobility notes |
| `fv_building_elevator_working` | Elevator working today? |
| `fv_building_elevator_size` | Elevator estimated size / capacity |
| `fv_building_elevator_condition` | Elevator condition |
| `fv_photo_storage_room` | Storage room photo |
| `fv_video_trash_location` | Trash location photo/video |
| `fv_video_fusebox` | Fuse box video — location + reset (building) |
| `fv_video_fire_exit` | Fire exit route — video walkthrough |
| `fv_photo_fire_safety` | Fire safety photos (extinguisher, exits, detectors) |
| `fv_unit_balcony_present` | Is there a balcony? |
| `fv_location_noise_level` | Noise heard with windows closed? |
| `fv_location_noise_source` | Noise source |
| `fv_accessibility_unit_door_widths` | Apartment + bathroom door clear widths |
| `fv_furniture_status` | Furnished to Arbio standard? |
| `fv_equipment_status` | Equipment status |
| `fv_bathroom_condition` | Bathroom condition |
| `fv_issues_found` | Any issues found in the unit? |
| `issue_name` | Issue / item name |
| `issue_type` | Issue type |
| `issue_location` | Location in unit |
| `issue_resolution` | Resolution |
| `issue_quantity` | Quantity |
| `issue_cost_estimate_eur` | Cost estimate (€) |
| `issue_urgency` | Urgency |
| `issue_media` | Photo / video of issue |
| `issue_notes` | Issue notes |
| `fv_items_to_log` | Any appliances/amenities to log? |
| `item_name` | Item name |
| `item_kind` | Item kind |
| `item_video` | How-to-use video |
| `fv_fire_extinguisher_present` | Fire extinguisher present in unit? |
| `fv_fire_extinguisher_location` | Fire extinguisher location |
| `fv_fire_extinguisher_service_date` | Fire extinguisher last service date visible? |
| `fv_smoke_detector_present` | Smoke detector(s) present? |
| `fv_smoke_detector_working` | Smoke detector functioning (test) |
| `fv_co_detector_present` | Carbon monoxide detector present? |
| `fv_co_detector_working` | Carbon monoxide detector functioning (test) |
| `fv_blackout_curtains` | Blackout curtains/blinds |
| `fv_ceiling_height_m` | Ceiling height (meters) |
| `fv_photo_bathroom` | Bathroom photos |
| `fv_photo_kitchen` | Kitchen photos |
| `fv_photo_general_apartment` | General apartment photos |
| `fv_photo_window_ceiling` | Window photos for measurement |
| `fv_readiness_overall` | Overall readiness for go-live |
| `fv_readiness_host_start_date` | Recommended host-start date |
| `fv_readiness_health_score` | Health score (1-10) |

Generated 2026-06-28 from the live PMS OpenAPI + joint routing decisions.
