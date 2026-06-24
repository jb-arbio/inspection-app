# First-Visit Survey — Question Set Review

*Generated from the live app config — questions appear in the order the inspector is asked them.*

**Legend:** 🔀 conditional (only appears when a previous answer matches) · ↻ repeating block (asked once per item) · 📎 photo/video attached to a question · check the box once a decision is made.

---
## Phase 1 — Visit metadata
*Visit level · 2 questions*

- [ ] **Date of visit** — *date · required*
- [ ] **Visitor name** — *text · required*

---

## Phase 2 — Property approach (location & arrival)
*Property / building level · 8 questions*

- [ ] **Location quality for guests** — *select · required · options: Excellent / Good / Acceptable / Poor*
- [ ] **Noise heard with windows closed?** — *select · required · options: No / Yes-not disturbing / Yes-occasionally / Yes-regularly*
- [ ] **Noise source** — *select · optional · options: Street / Tram/train / Neighbors / Construction / Aircraft / Other*
    - ℹ️ Only if noise present
- [ ] **Location safety concern** — *select · required · options: No / Minor / Yes (explain)*
- [ ] **Location notes** — *text · optional*
    - ℹ️ Only if notable
- [ ] **Neighbourhood narrative (3-5 sentences)** — *text · required*
- [ ] **Neighbourhood vibe tags** — *select · required · options: Residential / Touristy / Nightlife / Family-friendly / Business / Bohemian / Quiet / Lively / Mixed-use / Up-and-coming*
- [ ] **Best for guest type** — *multi-select · required · options: Business / Families / Couples / Groups / Solo / Long-stay*

---

## Phase 3 — Building exterior & parking
*Property / building level · 16 questions*

- [ ] **Actual parking type if different** — *select · optional · options: On-prem free / On-prem paid / Street free / Street paid / Garage on-site / Garage nearby / None*
    - ℹ️ Only if parking confirm = Different
- [ ] **Number of dedicated spots**  🔀 *only if “Actual parking type if different” is NOT "None"* — *text · required*
- [ ] **Bike parking available?** — *boolean · required · options: Yes / No*
- [ ] **Parking access instructions**  🔀 *only if “Actual parking type if different” is NOT "None"* — *text · required*
    - ℹ️ Step-by-step access
- [ ] **Nearby parking options** — *text · optional*
    - ℹ️ Public/paid lots within walking distance; with prices if possible
- [ ] **Elevator working today?** — *select · required · options: Yes / No / Partially / No elevator*
- [ ] **Building amenities** — *multi-select · required · options: Aufzug / Gemeinschafts Balkon/Terrasse / Gemeinschaftsgarten / Schwimmbad / Sauna / Fitnessraum / Konferenzräume / Reception/Concierge*
- [ ] **Building state** — *select · required · options: Excellent / Good / Acceptable / Needs attention / Poor*
- [ ] **Mold visible in building?** — *select · required · options: No / Yes-minor / Yes-significant*
- [ ] **Hallways clean?** — *scale · required · options: Excellent / Good / Acceptable / Needs attention / Poor*
- [ ] **Construction site/disruption nearby?** — *boolean · required · options: No / Yes*
    - ℹ️ Explain if yes
- [ ] **Step-free entry to the building?** — *select · optional · options: Yes / No / Partial*
    - ℹ️ Whether a guest can enter the building without using stairs.
- [ ] **Ramps / accessibility aids present?** — *text · optional*
    - ℹ️ Free text about any ramps, lifts, or accessibility aids the visitor observes.
- [ ] **Other accessibility / mobility notes** — *text · optional*
    - ℹ️ Free text — anything else relevant to mobility-impaired guests (door thresholds, grab bars, etc.).
- [ ] **Exact parking spot number**  🔀 *only if “Actual parking type if different” is NOT "None"* — *text · optional*
- [ ] **Photo of the parking spot**  🔀 *only if “Actual parking type if different” is NOT "None"* — *file · optional*
    - 📎 photo/video shown under “Number of dedicated spots”

---

## Phase 4 — Building access & check-in
*Property / building level · 12 questions*

- [ ] **Check-in complexity overall** — *select · required · options: Simple / Moderate / Complex*
### ↻ Check-in steps — repeating block (one per step)
*Document each access point in sequence, from building entrance to unit door.*
- Step name — *text · required*
- Access point — *select · required · options: Main Gate / Building Door / Apartment Door / Other*
- Lock type — *select · required · options: Smart Lock / Keypad / Ring To Open / Call To Open / Chip / Physical Key*
- Smart lock provider — *select · optional · options: Nuki / Bold / RemoteLock / Salto / EVVA / Other*
- Smart lock device ID / serial — *text · optional*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:

- [ ] **Lock brand / manufacturer** — *text · optional*
    - ℹ️ Per step; free text
### ↻ Check-in steps — repeating block (one per step)
*Document each access point in sequence, from building entrance to unit door.*
- Lock classification — *select · required · options: Primary / Backup*
- Key storage method — *select · optional · options: Keybox / Locker / Human handover*
- Storage brand — *text · optional*
- Default access code — *text · optional*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:

- [ ] **Overall check-in notes (not per-step)** — *text · optional*
    - ℹ️ Only if unusual; distinct from per-step lock notes

---

## Phase 5 — Building infrastructure & utilities
*Property / building level · 35 questions*

- [ ] **Luggage storage on-site** — *boolean · required · options: Yes / No*
- [ ] **Storage location**  🔀 *only if “Luggage storage on-site” is true* — *select · optional · options: In-apartment / Cellar / Corridor / Separate room / Other*
- [ ] **Access instructions for guest**  🔀 *only if “Luggage storage on-site” is true* — *text · required*
- [ ] **Storage comments** — *text · optional*
- [ ] **Trash container location** — *select · required · options: Backyard / Courtyard / Basement / Ground floor room / Street*
- [ ] **Trash handled by** — *select · required · options: CSP / Building management / Guest / Arbio team*
- [ ] **Pickup schedule** — *text · optional*
- [ ] **Fuse box location** — *text · required*
    - ℹ️ Often per building, but may be per-unit in older European stock — note location precisely
- [ ] **Fuse box access** — *select · required · options: Guest can access / Staff/technician only*
- [ ] **Fuse box reset instructions** — *text · optional*
- [ ] **Facility manager / Hausverwaltung contact** — *text · optional*
    - ℹ️ Important for ops handover — try to obtain on-site (name + phone or email).
- [ ] **Fire exit route notes (optional)** — *text · optional*
    - ℹ️ Primary route
- [ ] **Secondary fire exit available?** — *boolean · required · options: Yes / No*
    - ℹ️ Explain if yes
- [ ] **Fire safety concerns observed (building-level)** — *select · required · options: None / Blocked exit / Faulty wiring / Flammable storage / Other*
- [ ] **Fire safety notes** — *text · optional*
    - ℹ️ Only if concerns flagged
- [ ] **Common areas / building facilities** — *multi-select · optional · options: Lobby / Rooftop / Courtyard / SmokingArea / Storage / Other / Shared kitchen / Shared garden*
    - ℹ️ One entry per shared space. Visitor walks the building and documents each common area found.
### ↻ Utilities & providers — repeating block (one per utility)
*Record each utility — provider name, account number, and emergency contact.*
- Utility type — *select · required · options: Electricity / Water / Gas / Internet*
- Provider name — *text · required*
- Account number — *text · optional*
- Emergency contact — *text · optional*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:

### ↻ Maintenance procedures — repeating block (one per procedure)
*Document recurring maintenance procedures and the steps observed for each.*
- Procedure category — *select · required · options: Plumbing / Electrical / HVAC / Appliance / Other*
- Procedure title — *text · required*
- Steps observed — *text · optional*
- Procedure photo — *file · optional*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:

### ↻ Findings — repeating block (one per finding)
*List items that need repair, replacement, or purchase. Add one per issue.*
- Item / issue (clear name) — *text · required*
- Category — *select · required · options: Furniture / Appliance / Equipment / Bathroom / Structural/Building / Consumable / Other*
- Location in unit — *select · optional · options: Kitchen / Bathroom / Bedroom / Living room / Hallway / Balcony / Building/common / Other*
- Resolution — *select · required · options: Buy new (add) / Replace / Repair / Deep clean*
- Quantity — *number · optional*
- Cost estimate (€) — *number · required*
- Urgency — *select · optional · options: Blocks go-live / Nice-to-have*
- Notes — *text · optional*
- Photo / video — *file · required*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:

- [ ] **Fuse box video (location + reset)** — *file · required*
    - 📎 photo/video shown under “Fuse box location”
- [ ] **Fire exit route (video walkthrough)** — *file · required*
    - 📎 photo/video shown under “Fire exit route notes (optional)”

---

## Phase 6 — Building services & operational model
*Property / building level · 8 questions*

- [ ] **Cleaning setup** — *select · required · options: External provider / In-house / Owner self-managed / Not yet set up*
- [ ] **Cleaning provider name**  🔀 *only if “Cleaning setup” is NOT "Not yet set up"* — *text · optional*
    - ℹ️ Only if external
- [ ] **Can Arbio take over existing cleaning?**  🔀 *only if “Cleaning setup” is NOT "Not yet set up"* — *select · required · options: Yes / No / N/A*
- [ ] **Laundry setup** — *select · required · options: External delivery / In-house machines / Cleaning provider / Not yet set up*
- [ ] **Laundry provider name**  🔀 *only if “Laundry setup” is NOT "Not yet set up"* — *text · optional*
    - ℹ️ Only if external
- [ ] **Laundry delivery frequency**  🔀 *only if “Laundry setup” is NOT "Not yet set up"* — *text · optional*
- [ ] **Nearest laundromat for guests** — *text · optional*
    - ℹ️ Only if no in-unit washer
- [ ] **Extra services offered** — *multi-select · required · options: Early check-in / Late check-out / Express cleaning / Baby bed / High chair / Parking / Breakfast / Airport transfer / None*

---

## Phase 7 — WiFi
*Property / building level · 5 questions*

- [ ] **Wi-Fi available?** — *boolean · required*
- [ ] **WiFi download speed (Mbps)**  🔀 *only if “Wi-Fi available?” is true* — *number · required*
    - ℹ️ Speed test takes ~30-60s
- [ ] **WiFi upload speed (Mbps)**  🔀 *only if “Wi-Fi available?” is true* — *number · required*
    - ℹ️ Same test as download
- [ ] **WiFi router physical location** — *text · required*
- [ ] **Guest access to router?** — *boolean · required · options: Yes / No*

---

## Phase 8 — Property documentation
*Property / building level · 5 questions*

- [ ] **Check-in walkthrough video** — *text · required*
    - ℹ️ Covers all check-in steps
    - 📎 photo/video shown under “Step name”
- [ ] **Trash location photo/video** — *file · required*
    - 📎 photo/video shown under “Trash container location”
- [ ] **Storage room photo** — *file · required*
    - 📎 photo/video shown under “Storage location”
- [ ] **Parking access video** — *text · optional*
    - ℹ️ Only if parking available
    - 📎 photo/video shown under “Parking access instructions”
- [ ] **Fire safety photos (extinguisher, exits, detectors)** — *file · required*
    - 📎 photo/video shown under “Fire safety concerns observed (building-level)”

---

## Phase 9a — Unit identity
*Unit level · 7 questions*

- [ ] **Unit type sanity check** — *select · required · options: Apartment / Studio / Loft / Maisonette / Other*
- [ ] **Number of balconies** — *number · required*
    - ℹ️ May vary per individual unit within a category — capture per unit if they differ
- [ ] **Floor of unit** — *text · required*
    - ℹ️ Genuinely per-individual-unit; in mixed-floor buildings capture per unit even within one category
- [ ] **Actual view if different** — *select · optional · options: Busy street / Quiet side street / City square / Courtyard / Monument / Park / Waterfront / Other*
- [ ] **View comments** — *text · optional*
- [ ] **Apartment category** — *select · required · options: Premium / Standard / Midscale / Below standard*
- [ ] **Apartment + bathroom door clear widths**  🔀 *only if “Elevator working today?” is NOT "No elevator"* — *text · optional*
    - ℹ️ Narrowest door width (cm) inside the apartment. Critical for wheelchair access.

---

## Phase 9b — Unit capacity
*Unit level · 4 questions*

- [ ] **Base capacity (standard beds)** — *number · required*
- [ ] **Max capacity (incl. sofa beds/extra)** — *number · required*
- [ ] **Capacity / bed setup notes** — *text · optional*
- [ ] **Capacity comments** — *text · optional*

---

## Phase 9c — Unit physical measurements
*Unit level · 2 questions*

- [ ] **Will Arbio furnish/equip this unit?** — *boolean · required*
- [ ] **Ceiling height (meters)**  🔀 *only if “Will Arbio furnish/equip this unit?” is true* — *number · required*
    - ℹ️ Visual estimate; for curtains

---

## Phase 9d — Unit walkthrough (condition)
*Unit level · 26 questions*

- [ ] **Furnished to Arbio standard?** — *select · required · options: Yes fully / Mostly / No significant / No overhaul*
- [ ] **Equipment status** — *select · required · options: Meets standard / Minor additions / Significant additions*
- [ ] **Bathroom condition** — *select · required · options: Excellent / Good / Needs minor / Needs renovation*
- [ ] **Specific bathroom issues** — *select · required · options: None / Silicon / Mold / Water leak / Shower door missing / Ventilation / Other*
- [ ] **Maintenance work needed?** — *select · required · options: None / Minor <500 / Moderate 500-2000 / Major 2000+*
### ↻ Furniture issues — repeating block (one per issue)
*List furniture problems found — add one per issue with a photo, type, description, and estimated cost.*
- Furniture issue photo — *file · optional*
- Furniture issue type — *select · required · options: Missing / Damaged / Worn / Wrong size / Other*
- Furniture issue description — *text · optional*
- Estimated cost (EUR) — *number · optional*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:

### ↻ Equipment issues — repeating block (one per issue)
*List equipment problems found — add one per issue with a photo, type, description, and estimated cost.*
- Equipment issue photo — *file · optional*
- Equipment issue type — *select · required · options: Missing / Broken / Outdated / Other*
- Equipment issue description — *text · optional*
- Estimated cost (EUR) — *number · optional*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:

### ↻ Maintenance issues — repeating block (one per issue)
*List maintenance problems found — add one per issue with a photo, type, description, and estimated cost.*
- Maintenance issue photo — *file · optional*
- Maintenance issue type — *select · required · options: Plumbing / Electrical / HVAC / Structural / Other*
- Maintenance issue description — *text · optional*
- Estimated cost (EUR) — *number · optional*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:

### ↻ Findings — repeating block (one per finding)
*List items that need repair, replacement, or purchase. Add one per issue.*
- Item / issue (clear name) — *text · required*
- Category — *select · required · options: Furniture / Appliance / Equipment / Bathroom / Structural/Building / Consumable / Other*
- Location in unit — *select · optional · options: Kitchen / Bathroom / Bedroom / Living room / Hallway / Balcony / Building/common / Other*
- Resolution — *select · required · options: Buy new (add) / Replace / Repair / Deep clean*
- Quantity — *number · optional*
- Cost estimate (€) — *number · required*
- Urgency — *select · optional · options: Blocks go-live / Nice-to-have*
- Notes — *text · optional*
- Photo / video — *file · required*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:


---

## Phase 9e — Unit appliances & amenities (repeater)
*Unit level · 7 questions*

### ↻ Appliances & amenities — repeating block (one per appliance)
*Catalogue each appliance or amenity in the unit — its brand, location, how to use it, and whether it is working.*
- Item name — *text · optional*
- Item kind (discriminator) — *select · optional · options: Appliance / Equipment / Amenity*
- Brand / manufacturer — *text · optional*
- Location in unit — *text · optional*
- Operation notes / how to use — *text · optional*
- Availability type — *select · optional · options: Consumable / Equipment / On Request / Fixed*
- How-to-use video — *file · optional*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:


---

## Phase 9f — Unit safety equipment
*Unit level · 8 questions*

- [ ] **Fire extinguisher present in unit?** — *select · required · options: Yes / No / Common area only*
- [ ] **Fire extinguisher location**  🔀 *only if “Fire extinguisher present in unit?” is NOT "No"* — *text · optional*
- [ ] **Fire extinguisher last service date visible?**  🔀 *only if “Fire extinguisher present in unit?” is NOT "No"* — *select · required · options: Yes (date) / No / Expired*
- [ ] **Smoke detector(s) present?** — *select · required · options: All rooms / Bedrooms only / Kitchen/hallway only / No*
- [ ] **Smoke detector functioning (test)**  🔀 *only if “Smoke detector(s) present?” is NOT "No"* — *select · required · options: Yes / No / Could not test*
    - ℹ️ Press test button
- [ ] **Carbon monoxide detector present?** — *select · required · options: Yes / No / N/A no gas*
- [ ] **First-aid kit present?** — *boolean · required · options: Yes / No*
- [ ] **First-aid kit location**  🔀 *only if “First-aid kit present?” is true* — *text · optional*

---

## Phase 9g — Unit amenities & details
*Unit level · 1 questions*

- [ ] **Blackout curtains/blinds** — *select · required · options: All rooms / Bedrooms only / No*

---

## Phase 9h — Unit photos & videos
*Unit level · 5 questions*

- [ ] **Bathroom photos** — *file · required*
    - 📎 photo/video shown under “Bathroom condition”
- [ ] **Kitchen photos** — *file · required*
- [ ] **Window/ceiling photos for curtains**  🔀 *only if “Will Arbio furnish/equip this unit?” is true* — *file · required*
    - 📎 photo/video shown under “Blackout curtains/blinds”
- [ ] **General apartment photos** — *file · required*
    - ℹ️ Working photos, not listing
- [ ] **Window photos for measurement attached?** — *boolean · required · options: Yes / No*
    - ℹ️ Photos for curtain ordering

---

## Phase 10 — Check-out arrangements
*Property / building level · 2 questions*

### ↻ Check-out steps — repeating block (one per step)
*Document each check-out step in sequence, from securing the unit to leaving the building.*
- Check-out step name — *text · optional*
- Check-out step notes — *text · optional*
- [ ] **Decision (whole block):** keep / reword / cut / move — notes:


---

## Phase 11 — Final assessment / readiness
*Visit level · 8 questions*

- [ ] **Overall readiness for go-live** — *select · required · options: Ready / Conditional / Not ready*
    - ℹ️ Synthesizes everything observed
- [ ] **Recommended go-live** — *select · required · options: Go on planned date / Delay / Cannot recommend yet (major blockers)*
- [ ] **How many weeks delay?** — *number · optional*
    - ℹ️ Only if Delay selected
- [ ] **Blocking issues** — *select · optional · options: Major maintenance / Mold/damage / Fire safety / Equipment / Cleaning / Internet / Lock / Furniture / Permits / Other*
    - ℹ️ Required if Conditional/Not ready
- [ ] **Blocking issue details** — *text · optional*
    - ℹ️ Specifics + cost/time estimates
- [ ] **Health score (1-10)** — *select · required · options: 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 / 9 / 10*
    - ℹ️ Gut-feel rating
- [ ] **Summary recommendation** — *text · optional*
    - ℹ️ One-line recommendation: go-live as planned, go-live with conditions, or actions needed before go-live.
- [ ] **General comments / flags** — *text · required*
