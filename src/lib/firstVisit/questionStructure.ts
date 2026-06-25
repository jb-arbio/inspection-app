// AUTO-GENERATED from scripts/redesign/rows.mjs (First-Visit V1 Redesign).
// Structural overlay: per-slug wiring fields (gates, repeaters, media, PMS)
// composed onto editor content by buildSurveyConfig(). Re-run the generator
// after editing rows.mjs; PMS targets are a separate hub follow-up.
import type { StructureOverlay } from './surveyConfig';

export const QUESTION_STRUCTURE: StructureOverlay = {
  "fv_parking_dedicated_spots": {
    "visible_when": {
      "question": "fv_parking_actual_type",
      "not_in": [
        "None"
      ]
    }
  },
  "fv_parking_spot_number": {
    "visible_when": {
      "question": "fv_parking_actual_type",
      "not_in": [
        "None"
      ]
    }
  },
  "fv_parking_access_instructions": {
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
    "visible_when": {
      "question": "fv_parking_actual_type",
      "not_in": [
        "None"
      ]
    }
  },
  "fv_building_elevator_working": {
    "visible_when": {
      "question": "fv_building_elevator_present",
      "equals": true
    }
  },
  "fv_building_elevator_size": {
    "visible_when": {
      "question": "fv_building_elevator_present",
      "equals": true
    }
  },
  "fv_building_elevator_condition": {
    "visible_when": {
      "question": "fv_building_elevator_present",
      "equals": true
    }
  },
  "fv_step_name": {
    "group_id": "checkin_step"
  },
  "fv_step_access_point": {
    "group_id": "checkin_step"
  },
  "fv_step_lock_type": {
    "group_id": "checkin_step"
  },
  "fv_step_smart_lock_provider": {
    "group_id": "checkin_step"
  },
  "fv_step_smart_lock_device_id": {
    "group_id": "checkin_step"
  },
  "fv_step_lock_brand": {
    "group_id": "checkin_step"
  },
  "fv_step_lock_classification": {
    "group_id": "checkin_step"
  },
  "fv_step_key_storage_method": {
    "group_id": "checkin_step"
  },
  "fv_step_storage_brand": {
    "group_id": "checkin_step"
  },
  "fv_step_default_access_code": {
    "group_id": "checkin_step"
  },
  "fv_video_checkin_walkthrough": {
    "mode": "observe"
  },
  "fv_storage_location": {
    "visible_when": {
      "question": "fv_storage_onsite_check",
      "equals": true
    }
  },
  "fv_storage_access_instructions": {
    "visible_when": {
      "question": "fv_storage_onsite_check",
      "equals": true
    }
  },
  "fv_photo_storage_room": {
    "mode": "observe",
    "visible_when": {
      "question": "fv_storage_onsite_check",
      "equals": true
    }
  },
  "fv_storage_comments": {
    "visible_when": {
      "question": "fv_storage_onsite_check",
      "equals": true
    }
  },
  "fv_trash_container_location": {
    "visible_when": {
      "question": "fv_trash_area_present",
      "equals": true
    }
  },
  "fv_trash_handler": {
    "visible_when": {
      "question": "fv_trash_area_present",
      "equals": true
    }
  },
  "fv_trash_pickup_schedule": {
    "visible_when": {
      "question": "fv_trash_area_present",
      "equals": true
    }
  },
  "fv_video_trash_location": {
    "mode": "observe",
    "visible_when": {
      "question": "fv_trash_area_present",
      "equals": true
    }
  },
  "fv_fusebox_location": {
    "visible_when": {
      "question": "fv_fusebox_present",
      "equals": true
    }
  },
  "fv_fusebox_access": {
    "visible_when": {
      "question": "fv_fusebox_present",
      "equals": true
    }
  },
  "fv_fusebox_reset_instructions": {
    "visible_when": {
      "question": "fv_fusebox_present",
      "equals": true
    }
  },
  "fv_video_fusebox": {
    "mode": "observe",
    "visible_when": {
      "question": "fv_fusebox_present",
      "equals": true
    }
  },
  "fv_fire_exit_secondary": {
    "visible_when": {
      "question": "fv_fire_safety_present",
      "equals": true
    }
  },
  "fv_fire_exit_route_notes": {
    "visible_when": {
      "question": "fv_fire_safety_present",
      "equals": true
    }
  },
  "fv_fire_safety_concerns": {
    "visible_when": {
      "question": "fv_fire_safety_present",
      "equals": true
    }
  },
  "fv_video_fire_exit": {
    "mode": "observe",
    "visible_when": {
      "question": "fv_fire_safety_present",
      "equals": true
    }
  },
  "fv_photo_fire_safety": {
    "mode": "observe",
    "visible_when": {
      "question": "fv_fire_safety_present",
      "equals": true
    }
  },
  "fv_laundry_delivery_frequency": {
    "visible_when": {
      "question": "fv_laundry_setup",
      "not_equals": "Not yet set up"
    }
  },
  "fv_wifi_ssid": {
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_wifi_password": {
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_wifi_download_speed_mbps": {
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_wifi_upload_speed_mbps": {
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_wifi_router_location": {
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_wifi_guest_router_access": {
    "visible_when": {
      "question": "fv_wifi_present",
      "equals": true
    }
  },
  "fv_unit_balconies_count": {
    "visible_when": {
      "question": "fv_unit_balcony_present",
      "equals": true
    }
  },
  "fv_location_noise_source": {
    "visible_when": {
      "question": "fv_location_noise_level",
      "not_equals": "No"
    }
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
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_kind": {
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_brand": {
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_location": {
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_instructions": {
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_availability_type": {
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "item_video": {
    "mode": "observe",
    "group_id": "item",
    "visible_when": {
      "question": "fv_items_to_log",
      "equals": true
    }
  },
  "fv_unit_fusebox_location": {
    "visible_when": {
      "question": "fv_unit_fusebox_present",
      "equals": true
    }
  },
  "fv_unit_fusebox_reset_instructions": {
    "visible_when": {
      "question": "fv_unit_fusebox_present",
      "equals": true
    }
  },
  "fv_fire_extinguisher_location": {
    "visible_when": {
      "question": "fv_fire_extinguisher_present",
      "equals": true
    }
  },
  "fv_fire_extinguisher_service_date": {
    "visible_when": {
      "question": "fv_fire_extinguisher_present",
      "equals": true
    }
  },
  "fv_smoke_detector_working": {
    "visible_when": {
      "question": "fv_smoke_detector_present",
      "equals": true
    }
  },
  "fv_co_detector_working": {
    "visible_when": {
      "question": "fv_co_detector_present",
      "equals": true
    }
  },
  "fv_first_aid_location": {
    "visible_when": {
      "question": "fv_first_aid_present",
      "equals": true
    }
  },
  "fv_photo_bathroom": {
    "mode": "observe"
  },
  "fv_photo_kitchen": {
    "mode": "observe"
  },
  "fv_photo_general_apartment": {
    "mode": "observe"
  },
  "fv_photo_window_ceiling": {
    "mode": "observe"
  }
};
