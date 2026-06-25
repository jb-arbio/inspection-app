# PMS mapping — NEW fields to confirm/add in the hub

Generated for the First-Visit V1 redesign (2026-06-25). These survey slugs have NO pre-existing PMS field; targets below are proposed by convention and must be confirmed (or corrected) in the hub (Onboarding_tool) PMS schema before they push. Everything else carries over from the prior mapping; gate booleans + the Issue log are intentionally hub-only.

| Slug | Proposed PMS target |
|---|---|
| `fv_parking_spot_number` | accessInfo.parking.spotNumber |
| `fv_parking_bike_available` | accessInfo.parking.bikeParkingAvailable |
| `fv_building_elevator_size` | otherDetails.elevator.size |
| `fv_building_elevator_condition` | otherDetails.elevator.condition |
| `fv_trash_guest_instructions` | houseRules.garbageDisposal.guestInstructions |
| `fv_video_fusebox` | equipmentAndAmenities.videoUrl |
| `fv_video_fire_exit` | houseRules.fireSafetyInstructions.video |
| `fv_wifi_ssid` | profile.wifiDetails.networkName |
| `fv_wifi_password` | profile.wifiDetails.password |
| `fv_capacity_base` | profile.baseCapacity |
| `fv_capacity_max` | profile.maxCapacity |
| `fv_smoke_detector_working` | fireSafety.smokeDetectorWorking |
| `fv_co_detector_working` | fireSafety.coDetectorWorking |
| `fv_readiness_host_start_date` | status.hostStartDate |

_14 fields._
