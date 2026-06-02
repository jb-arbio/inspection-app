# First Visit Survey — Refactor Phase 2

## Kontext
Nach dem Field-Walkthrough (siehe `docs/plans/2026-06-01-field-walkthrough-notes.md`, 25 Punkte) sind drei dominante Pattern identifiziert worden, die zusammen 18 der Punkte abdecken: Multi-Select+Custom-Add, Conditional Follow-up, Block-Repeater. Sie nutzen eine gemeinsame Architektur, sodass ein Refactor sie alle gleichzeitig löst.

## Architektur-Entscheidungen (final)
| # | Bereich | Entscheidung |
|---|---|---|
| 1 | Block-Storage | `step_index INT NULL` als zusätzliche Koordinate auf `data_point_values` + `first_visit_answers`. Server-side Aggregator beim PMS-Push gruppiert pro `(scope_id, group_id, step_index)`. |
| 2 | Initialer Block | Beim Phase-Eintritt **ein leerer Block sichtbar**. |
| 3 | „None" in Multi-Select | Exklusiv: Auswahl deaktiviert andere Optionen und umgekehrt. |
| 4 | Tab-Index | Nur Eingabe-Surrogate (Inputs, Selects, Boolean-Yes/No-Buttons). Alle Action-Buttons `tabIndex=-1`. |

## Schema-Erweiterungen (questions.json)
Neue optionale Properties auf Frage-Ebene:
- `group_id: string` — markiert Block-Sub-Fragen, die einen Block formen.
- `multi_select: true` — Frage rendert als Chip-Liste mit Mehrfach-Auswahl.
- `allow_custom_options: true` — fügt „+ Add custom"-Tag-Input hinzu (gilt nur in Kombi mit `multi_select`).
- `follow_up: { when_value, label, type, required? }` — Folgefeld erscheint, wenn `value === when_value` (Yes/No) oder enthält den Wert (Multi-Select).
- `per_option_follow_up: { label_template, type, required? }` — pro selektierter Option ein Folgefeld (für Extra Services).
- `anchor_to: string` (slug) — File-Frage wird direkt unter Anker-Frage gerendert statt in eigener Phase.

## Workstreams

### WS-A — Storage Foundation
**Files:** `supabase/migrations/*` (Hub-Repo), `src/lib/firstVisit/db.ts` (Dexie schema), `src/lib/firstVisit/outbox.ts` (push handler).
- `ALTER TABLE data_point_values ADD COLUMN step_index INT NULL` (Hub-Repo Migration; manuell in Studio anwenden).
- `ALTER TABLE first_visit_answers ADD COLUMN step_index INT NULL`.
- Dexie `versions(N)` Migration mit step_index auf `media`, `answers`, `outbox`.
- `LocalAnswer` Interface erweitern.
- Outbox-Push schickt step_index mit.
- PMS-Aggregator beim Push (`src/lib/pms/routing.ts` im Hub-Repo, separater PR) — Helper `aggregateStepGroups(values, group_id)`.

### WS-B — Render Engine
**Files:** `src/components/firstVisit/*` (neue Komponenten), `src/app/first-visit/[dealId]/[inspectionId]/UnitSurvey.tsx` (Integration).
- `<StepGroup>` — rendert Block-Repeater (Konstrukt 2). Initial 1 leerer Block. „+ Add" am Ende. Confirm-Modal beim Remove.
- `<MultiSelectChips>` — Chip-Liste mit Multi-Select, None-exklusiv, `allow_custom_options` Slot. Tag-Input.
- `<ConditionalFollowUp>` — rendert Folgefeld unter Frage, wenn Bedingung erfüllt.
- `<PerOptionFollowUp>` — pro selektierter Multi-Select-Option ein Folgefeld unter dem Picker.
- UnitSurvey integration: erkennt `group_id` und rendert StepGroup statt flacher Frage-Liste.

### WS-C — Schema-Marker integrieren (questions.json)
**Files:** `src/data/first-visit-questions.json`.
- `group_id` setzen auf:
  - Check-in steps (Punkt 10): `appliance.*` nicht — das ist eigene Gruppe.
  - Check-out steps (Punkt 20): `fv_checkout_property_specific_steps` zerlegen.
  - Furniture/Equipment/Maintenance issues (Punkt 21): drei separate group_ids.
  - Appliances (Punkt 22): `group_id: "appliance_amenity"`.
  - Consumables (Punkt 23): `group_id: "consumable"`.
  - Utility providers + Maintenance procedures (Punkte 24/25): je `group_id`.
- `multi_select: true` + `allow_custom_options: true` auf den Picker-Fragen.
- `follow_up` auf `Secondary fire exit available?`, `Construction nearby?`, etc.
- `per_option_follow_up` auf Extra Services + alle Multi-Select-Fragen mit „Other"-Option, die ein Freitext-Feld brauchen.
- **Bug-Fixes in den `options`-Arrays:**
  - `"type: Lobby"` → `"Lobby"` (Common Areas)
  - `"providerType: Electricity"` → `"Electricity"` (Utility providers)
  - `"category: Plumbing"` → `"Plumbing"` (Maintenance procedures)
  - `["locale: en", "de"]` → die 8 Arbio-Standardregeln aus der Description (House Rules)
- **Spec-Marker strippen:** `" — repeater"` aus Labels (analog wie verify-strip in questions.ts), `(repeater)` aus Display.

### WS-D — Content-Fixes (klein)
**Files:** `src/data/first-visit-questions.json`.
- Punkt 12: Facility Manager — Description umformulieren („Try to obtain — important for ops handover"), evtl. required: true.
- Punkt 15: Service-Provider-Symmetrie — neue Slugs `fv_laundry_takeover_possible`, `fv_*_provider_contact`, Hausmeister-4er-Block.
- Punkt 19: Trash disposal at check-out → Boolean.
- Punkt 8: Dimensions → strukturierte Sub-Felder (eigener type `dimensions`).
- Punkt 3: Go-live select — splitten oder Conditional.

### WS-E — Tab-Index
**Files:** `src/components/firstVisit/PrefilledField.tsx`, `SkipAffordance.tsx`, `MediaButtons.tsx`, `AttachAffordance.tsx`, `UnitSurvey.tsx` (Section-Strip + Prev/Next), `VisitNavigator.tsx` (Header-Buttons).
- `tabIndex={-1}` auf alle Action-Buttons.
- Yes/No-Buttons im Boolean-Renderer bleiben tabbar.

### WS-F — Media-Anchoring (Punkt 18)
**Files:** `src/data/first-visit-questions.json`, `UnitSurvey.tsx`.
- `anchor_to` Property auf File-Fragen setzen.
- Renderer entfernt anchor-Fragen aus eigener Phase und fügt sie unter Anker ein.

## Implementierungsreihenfolge

**Welle 1 (parallel, jetzt):**
- WS-A (Storage Foundation — Dexie/outbox-Teil. Hub-DB-Migration separat manuell.)
- WS-D (Content-Fixes)
- WS-E (Tab-Index)

**Welle 2 (nach Welle 1):**
- WS-B (Render Engine)

**Welle 3 (nach Welle 2):**
- WS-C (Schema-Marker integrieren — braucht Renderer, der sie versteht)
- WS-F (Media-Anchoring — kleinere Integration in UnitSurvey)

**Hub-Repo-Migration (separat, manuell):**
- DB-Migrations für step_index im Onboarding_tool-Hub müssen Joshua via Supabase Studio anwenden.
- PMS-Aggregator-Helper in `src/lib/pms/routing.ts` ist ein eigener PR im Onboarding_tool-Repo.

## Verification (pro Welle)
- `npm run test --silent` grün.
- `npx tsc --noEmit` clean.
- Manuell: `npm run dev`, ein Test-Deal durchklicken, repräsentative Phasen prüfen.

## Out of scope für diesen Refactor
- Voice walkthrough (eigener Plan).
- Drag-to-reorder in StepGroup (nicht V1).
- Conditional-Sub-Felder innerhalb eines Blocks (z. B. Smart-Lock-Provider nur bei Lock-Type=Smart) — kann später kommen, falls Heuristik aus Description nicht reicht.
- Welle 4 wiring: multi-select picker auto-creates StepGroup blocks (consumables, appliances). WS-C konvertiert die JSON-Struktur, aber die Picker→Block-Verdrahtung im Renderer bleibt für eine spätere Welle.
