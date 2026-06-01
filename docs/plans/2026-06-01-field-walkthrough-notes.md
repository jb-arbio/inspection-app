# First Visit Survey — Field Walkthrough Notes (2026-06-01)

Live-Sammlung von Beobachtungen aus Joshuas Durchlauf. Pro Punkt:
- **Was** Joshua gesehen / erwartet hat
- **Code-Stelle** (Datei + Zeile, falls schon geprüft)
- **Vermutete Ursache**
- **Offene Fragen** an Joshua

Daraus wird im nächsten Schritt ein Implementierungsplan abgeleitet — hier wird noch **nichts** verändert.

---

## Punkte

<!-- Eintragsschema:

### [N] Kurztitel
- **Beobachtung:**
- **Code:**
- **Ursache (Hypothese):**
- **Offene Fragen:**
- **Status:** offen / geklärt / im Plan

-->

### [1] „Deal name"-Feld bleibt leer, obwohl Deal aus Hub gewählt
- **Beobachtung:** Joshua wählt einen existierenden Deal im DealPicker; das Feld „Deal name" in der Survey ist leer. Wunsch: vorausfüllen oder gar nicht zeigen, außer wenn ein neuer Deal angelegt wird.
- **Code:**
  - Frage definiert als `fv_visit_deal_name` in `src/data/first-visit-questions.json:18` (Phase „Visit basics", scope = `deal`).
  - Wird im UnitSurvey über `lookupHubValue(snapshot, scopeId, q.slug)` gefüllt: `src/app/first-visit/[dealId]/[inspectionId]/UnitSurvey.tsx:417-424`.
  - `lookupHubValue` in `src/lib/firstVisit/snapshot.ts:21-47` sucht in `snapshot.points` nach einem **data_point** mit slug `fv_visit_deal_name` und liest dann `snapshot.values`.
  - Aber: Im Hub ist `deals.name` eine **Spalte auf `deals`**, kein `data_point` — also gibt es keinen Treffer in `snapshot.points`, und `hubValue` ist `undefined`. → Feld bleibt leer.
  - Der Deal-Name liegt aber bereits in `snapshot.deal.name` (wird in VisitNavigator schon für den Header genutzt: `VisitNavigator.tsx:375`).
- **Ursache (Hypothese):** `fv_visit_deal_name` ist eine „Frage", die XLSX-Generator-seitig wie ein normaler `data_point` behandelt wird. Tatsächlich ist es ein Stammdatum aus der `deals`-Tabelle. Lösungs-Optionen:
  - **(A)** Sonderbehandlung in `lookupHubValue` (oder daneben): Für Slugs vom Typ „deal-Stammdaten" (`fv_visit_deal_name`, ggf. weitere) direkt aus `snapshot.deal.*` lesen.
  - **(B)** Frage aus dem JSON entfernen / im UI ausblenden, weil der Name schon prominent im Header steht (V1 hat noch keinen „neuer Deal"-Modus — Deals kommen ausschließlich aus dem Hub).
  - **(C)** Erst zeigen, wenn ein „neuer Deal"-Flow existiert (Feature für später).
- **Offene Fragen:**
  - Annahme: V1 erlaubt keine neuen Deals aus der App heraus → Punkt (B) wäre pragmatisch. Korrekt?
  - Gibt es weitere „Pseudo-Daten-Punkte" der gleichen Klasse (Owner-Name, HubSpot-Stage, Adresse als Frage), die das gleiche Problem haben? → in Phase „Visit basics" prüfen.
- **Status:** offen

### [3] „Recommended go-live date" — Optionen ergeben keinen Sinn
- **Beobachtung:** Frage „Recommended go-live date" zeigt aktuell 3 Optionen: `Hold to planned`, `Delay N weeks`, `Cannot recommend yet`. Vor allem „Delay N weeks" ist als reine Option sinnlos (man kann die Wochenzahl nicht angeben). Joshuas Vorschlag: entweder eine **Anzahl Wochen** auswählen können, oder eine „Major blockers" / „Cannot recommend yet"-Auswahl, weil es zum Zeitpunkt der First Visit oft noch gar kein festes Go-Live-Datum gibt.
- **Code:** `src/data/first-visit-questions.json:3213-3231` — Slug `fv_readiness_go_live_date`, type `select`, scope `deal`, `pms_target = dealProfile.goLiveDate (existing — should route here)`. Direkt darunter (`:3234`): `fv_readiness_blocking_issues` mit konkreten Blocker-Kategorien.
- **Ursache (Hypothese):** Generator-seitig wurde aus dem XLSX eine select-Liste übernommen, die ursprünglich vermutlich Status-Tags waren, nicht Antworten zur „wann go-live"-Frage. Konflikt zwischen „Status der Empfehlung" und „konkretes Datum".
- **Vorschlag (offener Entwurf):**
  - Frage aufsplitten in **zwei Felder**:
    1. `fv_readiness_go_live_recommendation` — select: `Go on planned date` / `Delay` / `Cannot recommend yet (major blockers)`.
    2. `fv_readiness_go_live_delay_weeks` — number (nur erforderlich, wenn `Delay` gewählt) — „How many weeks?".
  - Alternativ: ein einziges Feld mit dynamischer Folgefrage (würde Conditional-Logik im Form-Engine voraussetzen — gibt's noch nicht).
  - PMS-Routing: `dealProfile.goLiveDate` ist ein konkretes Datum, nicht eine Recommendation — eventuell mappen wir das eher auf ein **neues Feld** (z. B. `dealProfile.goLiveRecommendation` + `dealProfile.goLiveDelayWeeks`) und lassen das Datum-Feld nur vom Hub gesetzt sein. Erfordert PMS-Gap-Eintrag in `docs/PMS_SCHEMA_GAPS.md` im Onboarding_tool-Repo.
- **Offene Fragen:**
  - Joshua: ist Splitten in 2 Felder OK, oder lieber 1 Feld mit Conditional?
  - Sollte „Major blockers" als dritte Option direkt hier hin (statt nur in `fv_readiness_blocking_issues`)? Aktuell ist Blockers eine getrennte Frage — der State „cannot recommend" wäre redundant zu „Blocking issues != none".
  - Werte-Quelle: XLSX-Generator (Onboarding_tool, branch `feat/fv-survey-pipeline`) oder lokaler Override? Konsens-Frage für Daten-Ownership.
- **Status:** offen

### [4] Freitext-Felder sollen mit Inhalt mitwachsen (auto-grow textarea) — IMPLEMENTIERT
- **Beobachtung:** Lange Freitext-Felder bleiben bei `rows={3}` fix und scrollen intern. Joshua möchte, dass die „Karte" mitwächst, ohne dass das Layout kaputt geht.
- **Code:** `src/components/firstVisit/PrefilledField.tsx:165-176` — `<textarea rows={3}>` für `type === 'text' && mode === 'observe'`.
- **Lösung (umgesetzt):** Subkomponente `AutoGrowTextarea`, die nach jeder Wertänderung via Layout-Effekt die Höhe an `scrollHeight` anpasst. `resize-none` (kein manuelles Resize-Handle), `min-height` aus `rows={3}`. Outer Flex-Layout absorbiert die Höhenänderung automatisch (Frage-Card wächst mit).
- **Status:** im Code umgesetzt — siehe Commit unten

### [5] Letzte Phase: „Next" ist ausgegraut, soll stattdessen zur Übersicht zurück
- **Beobachtung:** Auf der letzten Phase (z. B. Seite 2 von 2 in „Visit basics") ist der Next-Button disabled. Erwartetes Verhalten: nach Beantworten der letzten Frage zurück zum Navigator („Properties / Units"-Übersicht).
- **Code:** `src/app/first-visit/[dealId]/[inspectionId]/UnitSurvey.tsx:471-478` — Next disabled wenn `isLast`.
- **Lösung-Skizze:** Wenn `isLast`, Button bleibt aktiv, Label wird zu „Done — back to overview ↩", onClick ruft `onBack()` statt nächste Phase.
- **Status:** an Subagent B vergeben

### [6] „Verify"-Labels — verwirrend, wenn keine Vorausfüllung vorhanden
- **Beobachtung:** Mehrere Fragen heißen „Verify X" oder enthalten „verify" im Label / Phasen-Namen. Wenn aber nichts vorausgefüllt ist, gibt's nichts zu verifizieren — das Wort wirkt falsch.
- **Code (Beispiele):**
  - `src/data/first-visit-questions.json:594-595` — slug `fv_building_amenities_verify`, label „Building amenities verify".
  - Phase-Label „Unit identity & verify" (mehrfach ab `:2107`).
  - Beschreibungen wie „Only if parking verify = Different" (`:462`).
- **Ursache (Hypothese):** XLSX-Generator hat das Wort „verify" als Marker übernommen, das ursprünglich für die Spezifikation gedacht war (data points, die gegen Hub-Daten verifiziert werden), nicht für UI-Labels.
- **Vorschlag:**
  - Im UI-Render-Layer (questions.ts) das Wort „verify" pauschal aus `label` und `phase_label` strippen — Trim & Cleanup nach demselben Muster wie `stripOperationalDescriptions`.
  - Optional: nur wenn `hubValue !== undefined` ist, dynamisch ein „Confirm: " Präfix einblenden. **Aber:** dies ist Render-Zeit-Logik, kein Label-Rewrite — komplexer. Erstmal Variante A (pauschal entfernen).
- **Status:** an Subagent C vergeben (wenn parallelisierbar) — oder als Folge-Task

### [7] Multi-Select mit „Other" hat kein Freitext-Feld; „Explain if yes" hat kein Textfeld
- **Beobachtung 1:** Z. B. „Building amenities verify" (Multi-Select mit Option „Other") — wer „Other" wählt, hat keine Möglichkeit, das näher zu beschreiben.
- **Beobachtung 2:** Z. B. „Construction site/disruption nearby?" hat description „Explain if yes" — aber kein zugehöriges Textfeld erscheint, wenn man „Yes" wählt.
- **Code:**
  - 16 Fragen mit „Other"-Option (grep auf `"Other"` in `src/data/first-visit-questions.json`).
  - 2 Fragen mit description `"Explain if yes"` (`:686`, `:1387`).
  - Render-Logik in `src/components/firstVisit/PrefilledField.tsx`: `type === 'select'` rendert `<select>` ohne Follow-up; `type === 'boolean'` ohne Follow-up.
- **Vorschlag-Skizze:**
  - Convention: Wenn description enthält `Explain if yes` → automatisch ein konditionales Textfeld unter dem Boolean.
  - Wenn `type === 'select'` und gewählte Option(en) enthalten `"Other"` → automatisch ein konditionales Textfeld.
  - Schema-Erweiterung: Antwortwert wird zu `{ choice: string|string[], other_text?: string, explanation?: string }`, kompatibel zur bestehenden `value`-JSONB.
  - Backwards-compat: alte Antworten (nur string) bleiben gültig — Render-Layer interpretiert beide Shapes.
- **Auch betroffen:** Möglicherweise ist `fv_building_amenities_verify` semantisch ein **Multi-Select**, nicht Single. Aktuell `type: "select"` (Single). UI sollte für Multi-Select `type: "multi_select"` (neuer Typ) oder per Convention behandeln.
- **Status:** offen — komplexer (UI + Schema + Migration), nicht im ersten Agent-Batch

### [8] Dimensions → strukturierte Felder statt Freitext
- **Beobachtung:** „Elevator dimensions (W × D × door width)" ist ein einzelnes Textfeld. Joshua möchte separate Felder für `width / depth / door width` (allgemein: alle Dimensions-Fragen sollten dasselbe Schema erzwingen).
- **Code:** `src/data/first-visit-questions.json:725-740` — slug `fv_accessibility_elevator_dimensions`, `type: "text"`. Auch potenziell betroffen: `fv_accessibility_unit_door_widths` (`:2249`), `fv_ceiling_height_m` (`:2312`, schon `type: number`).
- **Vorschlag-Skizze:**
  - Neuen `type: "dimensions"` einführen mit konfigurierbaren Sub-Feldern (z. B. via `options` als Liste von Sub-Labels: `["Width (cm)", "Depth (cm)", "Door clear width (cm)"]`).
  - Render: nebeneinander oder gestapelt drei `<input type="number">`-Felder, plus Einheit.
  - Storage: `value = { width_cm: 120, depth_cm: 140, door_clear_width_cm: 90 }`.
  - Konsequenz: PMS-Mapping muss strukturiert auf `accessibilityInfo.*` sub-fields zeigen.
- **Status:** offen — Schema-Entscheidung, nicht im ersten Agent-Batch

---

### [10] Check-in-Phase: Step-by-Step Block-Editor statt Counter + Repeat-Fragen
- **Beobachtung:** Aktuell fragt die Phase „Building access & check-in" zuerst `Number of check-in steps` (1-5) und rendert dann 11 Fragen wie `Step name`, `Access point`, `Lock type`, etc. einmalig. Es gibt keinen UI-Mechanismus, der dieselben Fragen pro Step wiederholt — die Description sagt zwar „Repeats per check-in step", aber `repeater: false` in JSON, also wird NICHTS wiederholt. Joshua will: Steps werden als wiederholbare **Blöcke** angelegt, „Add step"-Button am Ende, Anzahl wird automatisch aus der Anzahl der Blöcke abgeleitet → der separate Counter fällt weg.
- **Code:** `src/data/first-visit-questions.json:782-1056` (Phase 4 "Building access & check-in"):
  - `fv_checkin_steps_count` (`:782-803`) — Counter, soll weg.
  - `fv_step_name`, `fv_step_access_point`, `fv_step_lock_type`, `fv_step_smart_lock_provider`, `fv_step_smart_lock_device_id`, `fv_step_lock_brand`, `fv_step_lock_classification`, `fv_step_key_storage_method`, `fv_step_storage_brand`, `fv_step_default_access_code`, `fv_step_lock_notes` (`:845-1056`) — 11 Step-Felder, sollen zu einem wiederholbaren Block werden.
  - Außerhalb der Step-Gruppe bleiben: `fv_checkin_complexity`, `fv_checkin_guide_2_needed`, `fv_checkin_notes_overall`.
  - PMS-Target ist bereits Array-shaped: `accessInfo.checkInSteps[].name`, `.accessPoint`, `.lock.type`, `.lock.provider`, etc. → schreibt das Backend pro Step-Index in ein Array von Step-Objekten.
- **Ursache (Hypothese):** Das XLSX-Schema hat „repeats per step" nur als Description-Hinweis, aber kein technisches Repeater-Konstrukt. Form-Engine hat aktuell keinen UI-Typ für „Gruppe von Fragen, n-mal wiederholbar".
- **Lösung-Skizze (offen):**
  - **Schema-Erweiterung:** Konzept einer **„step group"** im Question-Config:
    - Entweder eine neue Top-Level-Struktur (Gruppe mit Sub-Fragen), oder ein Marker pro Frage (`group_id: "checkin_step"`), der ihre Zusammengehörigkeit signalisiert.
    - Empfehlung: Marker (`group_id`) — minimalinvasiv für den XLSX-Generator.
  - **UI-Render:** Eine `StepGroup`-Komponente, die alle Fragen mit gleichem `group_id` als ein wiederholbares Block-Set rendert. Pro Instanz ein Card-Block mit „Step 1", „Step 2" Überschrift, am Ende „+ Add step" Button und pro Step ein „× Remove"-Button.
  - **Storage:** Antwortwert pro Frage bekommt eine Step-Index-Koordinate. Zwei Optionen:
    - **(A) Antwort-Shape als Array:** `value = [{ name: "Front gate", access_point: "Main Gate", lock_type: "Keypad", ... }, ...]` — eine Antwort pro Step-Group statt eine pro Frage. Schöner für PMS-Sync (1:1 mit `accessInfo.checkInSteps[]`), aber bricht die polymorphe Answer-Shape (1 Frage = 1 Antwort).
    - **(B) Step-Index als zusätzliche Koordinate:** Jede Frage bleibt eine eigene Antwort, aber bekommt ein extra Feld `step_index` (0, 1, 2, …) zusätzlich zu `scope_id`. Das passt zur bestehenden polymorphen `data_point_values`-Struktur. Backend aggregiert beim PMS-Push die Antworten gleichen step_index zu einem `checkInSteps[i]`-Objekt.
    - Empfehlung: **(B)** — robuster gegenüber Schema-Änderungen und konsistent mit der bestehenden Answer-Architektur. Erfordert Migration: Spalte `step_index INT NULL` an `first_visit_answers` (lokales Dexie) UND an `data_point_values` (Hub-Push).
  - **Counter-Frage `fv_checkin_steps_count`:** ersatzlos streichen (wie Deal-Name). Anzahl ergibt sich aus `value`-Array-Länge bzw. höchstem `step_index + 1`.
  - **Reihenfolge im Phase-Render:**
    1. `Check-in complexity overall`
    2. `New Check-in Guide 2.0 needed?`
    3. **Step group** (Step 1: name, access_point, lock_type, … [+ Add step])
    4. `Overall check-in notes`
  - **Conditional-Felder innerhalb eines Step-Blocks:** z. B. `Smart lock provider` nur wenn `Lock type === Smart Lock`, `Key storage method` nur wenn `Lock type === Physical Key`. Aktuell nur Description-Hint („Only if Smart Lock") — die UI sollte das tatsächlich respektieren. Verwandt mit Punkt [7] (Conditional-Fields).
- **Offene Fragen:**
  - Joshua: OK mit Lösung B (step_index als Koordinate)? Oder lieber Array-Shape A?
  - Soll die UI initial mit **einem** leeren Step starten (n=1) oder mit **keinem** (n=0, Inspektor muss „+ Add step" klicken)?
  - Drag-to-reorder Steps gewünscht? (Schöne UX, aber Komplexität.)
  - Bestätigung gewünscht beim Löschen eines Steps (Confirm-Dialog), oder direkt × Klick → weg?
- **Status:** offen — Schema- und UI-Entscheidung erforderlich. Eigener Plan-File, sobald die anderen Fixes durch sind. **Nicht** im aktuellen Agent-Batch.

### [18] Fotos/Videos sollen an die thematisch passende Frage gepinnt werden, nicht in separater Phase
- **Beobachtung:** Es gibt aktuell zwei separate Phasen mit Foto/Video-Fragen:
  - Phase 8 „Property documentation" (location-scope): `fv_video_trash_location` (`:1978`), `fv_photo_storage_room` (`:1995`), `fv_video_parking_access` (`:2012`), `fv_photo_fusebox` (`:2029`), `fv_photo_fire_safety` (`:2046`).
  - Phase „Unit photos & videos" (unit_category-scope): `fv_photo_bathroom`, `fv_photo_kitchen`, `fv_photo_window_ceiling`, `fv_photo_general_apartment` (`:2973`–`:3041`).
  - Joshua: Inspektor ist beim Müll vor Ort → Foto-Frage muss direkt **dort** sein, nicht 3 Phasen später. Gleiches gilt für Fuse Box, Fire Safety, Parking, Bathroom, Kitchen.
- **Code-Pointer (Anchor-Kandidaten):**
  - `fv_video_trash_location` ↔ `fv_trash_container_location` (`:1176`) / `fv_trash_handler` (`:1200`) — Phase 5 (Garbage Disposal Block).
  - `fv_photo_fusebox` ↔ `fv_fusebox_location` (`:1263` oder `:1469`) — Phase 5.
  - `fv_photo_fire_safety` ↔ `fv_fire_exit_primary` (`:1368`) / `fv_fire_safety_concerns` (`:1405`) — Phase 5 (Fire Safety Block).
  - `fv_video_parking_access` ↔ `fv_parking_access_instructions` (`:522`) — Phase 3.
  - `fv_photo_storage_room` ↔ `fv_storage_location` (`:1102`) — Phase 5.
  - `fv_photo_bathroom` ↔ `fv_bathroom_condition` (`:2412`) — Unit-Scope.
  - `fv_photo_kitchen` ↔ Kitchen-Frage (Slug noch zu prüfen).
  - `fv_photo_window_ceiling` ↔ Curtain/Window-Frage in Unit-Scope.
- **Vorschlag-Skizze (Option C, Schema-Anchor — minimal-invasiv):**
  - Schema-Erweiterung: optionales `anchor_to: "fv_trash_container_location"` Feld auf File-Fragen.
  - Render-Layer (in `phasesForScope` oder neu in `UnitSurvey.tsx`): vor dem Rendern jeder Phase werden alle File-Fragen mit `anchor_to` aus ihrer eigenen Phase entfernt und unter der jeweiligen Anchor-Frage als zusätzliches Card-Element eingefügt.
  - Resultat: Inspektor sieht beim Beantworten von „Trash container location" direkt darunter den „Trash location photo/video"-Aufnehmer.
  - Die separaten Phasen „Property documentation" + „Unit photos & videos" werden dadurch leer → automatisch ausgeblendet (schon vorhandenes Verhalten in `phasesForScope`: `filter((p) => p.questions.length > 0)`).
  - Photos/Videos, die KEINEN sinnvollen Anker haben (`fv_photo_storage_room`, `fv_photo_general_apartment`), bleiben in einer kompakten Sammel-Phase „Additional photos" — oder werden ebenfalls an Mehr-Wert-Anker geschoben (z. B. `general_apartment` an die erste Unit-Frage).
  - **Alternative (Option B, AttachAffordance erweitern):** Statt einer eigenen File-Frage könnten Fotos einfach an die Datenfrage angeheftet werden (das `AttachAffordance` ist da schon vorhanden). Vorteil: kein zusätzliches Render-Construct. Nachteil: Anforderungen wie „Fire safety photos pflichtig" gehen verloren, weil AttachAffordance optional ist. **Option C bewahrt die required-Semantik.**
- **Status:** offen — Schema-Migration. Anchor-Map kann im Code definiert werden (kein JSON-Patch nötig) — siehe Option C.
- **Bestätigung 2026-06-01 (Unit-Scope-Variante):** Joshua hat explizit bestätigt, dass auch die Unit-Scope-Phase „Unit photos & videos" unter diesen Anchor-Mechanismus fällt. Bathroom-Photos → an `fv_bathroom_condition`; Kitchen-Photos → an Kitchen-Frage; Window/Curtain-Photos → an Curtain-Frage; General Apartment Photos → Sammel-Phase oder erste Unit-Identity-Frage. Beide Photo/Video-Phasen (location- und unit-scope) werden dadurch entleert und automatisch ausgeblendet.

### [23] Consumables → Multi-Select mit Custom-Add + „meets Arbio standard?" als Per-Block-Frage
- **Beobachtung:** Aktuell ist `fv_consumables_provided` ein Single-Select aus 13 Standard-Optionen (Coffee, Tea, Sugar, S&P, Oil, Shower gel, Shampoo, Dish soap, Tabs, TP, Kitchen towel, Sponge, None). Daneben gibt es ein **flaches** `fv_consumables_meet_standard` (Yes / No-needs additions) für **alle** Consumables zusammen. Joshua möchte:
  - Multi-Select aus den Standard-Optionen + „Add custom"-Tag-Input (analog [14]/[17]).
  - „Meets Arbio standard?" wird **pro Consumable-Block** gefragt, nicht pauschal.
- **Code:** `src/data/first-visit-questions.json:2897-2947` — beides scope `unit_category`, phase 9g „Unit amenities & details".
- **Vorschlag-Skizze:**
  - `fv_consumables_provided` → `type: "multi_select"` mit `allow_custom_options: true`.
  - Pro ausgewähltem Consumable wird ein **Block** angelegt (Step-Group-Konstrukt aus [10]). Block-Felder:
    - `consumable.name` (auto-gesetzt aus Auswahl, editierbar bei Custom)
    - `consumable.meets_standard` (Y / „Needs additions" / N/A) ← **statt** flachem `fv_consumables_meet_standard`
    - optional: `consumable.notes` (text — was fehlt, falls „Needs additions")
    - optional: `consumable.photo` (file)
  - Das pauschale `fv_consumables_meet_standard` entfällt; die Hub-Aggregation berechnet einen „rolled-up"-Status aus den Block-Werten (alle Y → Y; mind. einer „Needs additions" → No).
  - PMS-Mapping: pro Block ein Row in `equipmentAndAmenities[]` mit `kind: "Consumable"` + `meetsStandard` Sub-Field (GAP — `propertyAssessment.consumablesMeetStandard` heute pauschal, müsste pro Item gemappt werden).
- **Konsistenz:** Fünfter Konsument des Step-Group-Konstrukts (Check-in [10], Check-out [20], Issues [21], Appliances [22], Consumables [23]). Vierter Konsument des `allow_custom_options`-Flags (Common Areas [14], House Rules [17], Appliances [22], Consumables [23]).
- **Generelles Prinzip aus [23] ableitbar:** „Meets standard? Y/N" als pauschale Frage wird **immer** zu „pro Item" verschoben, sobald die Items als Repeater existieren. Single-Statusangaben sind nur sinnvoll, wenn es nichts zum Aufschlüsseln gibt.
- **Status:** offen — bündelt sich mit Punkten [10]/[14]/[17]/[22]

### [22] Appliances & amenities — Block-Repeater nutzbar machen + „Video needed?" durch Video-Upload-Feld ersetzen + Foto pro Block
- **Beobachtung:**
  - Phase 9e „Unit appliances & amenities (repeater)" hat **konzeptionell** schon einen Repeater-Aufbau: 10 Sub-Fragen pro Item (name, kind, brand, location, instructions, availabilityType, status, statusNote, videoNeeded, plus header). Aber `repeater: false` auf allen Fragen → wird wie eine flache Liste gerendert. Joshua: pro ausgewählter Amenity ein eigener Block mit allen relevanten Feldern + **Foto**.
  - `appliance.videoNeeded` ist aktuell Yes/No-Flag (`:2706-2724`, „does ops need to record a how-to-use video?"). Joshua: macht keinen Sinn — wenn ein Video gebraucht wird, soll der Inspektor **direkt dort** ein Video aufnehmen können. Die Existenz des Videos ist die Antwort.
  - Aktuelle Block-Felder enthalten **kein Foto-Feld**. Joshua möchte Foto pro Block.
- **Code:** `src/data/first-visit-questions.json:2533-2725` — Phase 9e mit 10 Block-Sub-Fragen (`appliance.*` Slugs).
- **Vorschlag-Skizze:**
  - Konsumiert dasselbe Step-Group-Konstrukt aus Punkt [10]. `group_id: "appliance_amenity"` auf allen `appliance.*` Slugs + Header.
  - **Item-Auswahl-UX:** Starter-Liste der 13 vorbefüllten Items (aus dem Description-Text in den `options` des Headers, analog Punkt [17]/House-Rules-Fix). Inspektor tappt einen Starter → wird zu aktivem Block. „+ Add custom item" für freie Einträge (analog Punkt [14]/[17] — `allow_custom_options: true`).
  - **Foto pro Block (neu):** Neues Feld `appliance.photo` (type `file`) als zweites Block-Feld nach `appliance.name`. PMS-Target: `equipmentAndAmenities.photoUrl [GAPS-extension]` (vermutlich neuer Pfad nötig).
  - **`appliance.videoNeeded` → durch `appliance.video` ersetzen:** type wechselt von `boolean` zu `file` (Video). Label: „Operation video (if needed)". Required: false. Falls Video vorhanden = Hub-Workflow weiß, dass eines existiert; kein separater Flag mehr. PMS-Target: `equipmentAndAmenities.videoUrl [proposed]`.
- **Migration:** Alte Antworten für `appliance.videoNeeded` (Yes/No) sind nicht direkt verwertbar — kein Video angehängt. Können verworfen werden (Frage wurde nie in Produktion eingesetzt, falls true) oder in eine `videoOpsTodo`-Flag-Tabelle umkopiert.
- **Konsistenz:** Dies ist der **vierte Konsument** des Step-Group-Konstrukts (Check-in [10], Check-out [20], Issue-Repeater [21], Appliances [22]). Alle vier rechtfertigen den Refactor.
- **Generelles Prinzip aus [22] ableitbar:** „Video needed? Yes/No"-Flags überall im Schema durch direkten Video-Upload-Slot ersetzen. Inspektor entscheidet on-site, ob ein Video sinnvoll ist, und nimmt es direkt auf. Konsistent mit Punkt [18] (Media direkt an der Frage).
- **Status:** offen — Sub-Task vom Step-Group-Refactor in Punkt [10] + Multi-Select-Custom-Add aus [17]

### [21] Furniture / Equipment / Maintenance → Issue-Block-Repeater statt nur Kostenschätzung
- **Beobachtung:** Aktuell hat jeder der drei Bereiche genau **eine pauschale Kostenfrage** (Furniture, Equipment, Maintenance), die einen einzelnen EUR-Wert speichert. Joshua: das macht keinen Sinn — Inspektor sollte **pro problematisches Item** einen Block anlegen mit Foto, Type, Issue, Kostenschätzung. Aus der Summe der Blöcke ergibt sich die Gesamtschätzung automatisch.
- **Code (Phase 9d „Unit walkthrough (condition)"):**
  - Furniture: `fv_furniture_status` (`:2335`, „Yes fully / Mostly / No significant / No overhaul") + `fv_furniture_cost_estimate_eur` (`:2357`, einzelner Number-Wert).
  - Equipment: `fv_equipment_status` (`:2374`) + `fv_equipment_cost_estimate_eur` (`:2395`).
  - Maintenance: `fv_maintenance_level` (`:2476`) + `fv_maintenance_cost_estimate_eur` (`:2498`) + `fv_maintenance_details` (`:2515`, einzelnes Textfeld).
  - PMS-Targets: alle Cost-Felder zeigen auf `propertyFinancials.costs.oneOff [GAPS §1.2]` (bereits als GAP markiert).
- **Verwandt:** Phase 9e „Unit appliances & amenities — repeater section" (`:2533`) hat schon einen Repeater-Mechanismus für **vorhandene** Geräte. Das **Issue**-Tracking ist eine andere Domäne, nutzt aber das gleiche Block-Pattern.
- **Vorschlag-Skizze (drei Block-Repeater nach Step-Group-Pattern, vgl. Punkt [10]):**
  - **Furniture-Issue-Repeater** (zeigt sich, wenn `fv_furniture_status !== "Yes fully"`):
    - `furniture_issue_photo` (file)
    - `furniture_issue_type` (text — z. B. „Couch", „Bed", „Dining table") oder select aus Standard-Liste mit „Other"
    - `furniture_issue_description` (text — was ist nicht standardkonform)
    - `furniture_issue_cost_eur` (number)
  - **Equipment-Issue-Repeater** (zeigt sich, wenn `fv_equipment_status !== "Meets standard"`):
    - Selbe vier Felder, andere Slugs (`equipment_issue_*`).
  - **Maintenance-Issue-Repeater** (zeigt sich, wenn `fv_maintenance_level !== "None"`):
    - Selbe vier Felder (`maintenance_issue_*`).
    - Bathroom-Issues (`fv_bathroom_issues`, `fv_bathroom_improvement_cost_eur`) sind faktisch ein Spezialfall davon — können entweder integriert oder als eigenes Maintenance-Tag bleiben.
  - **Status-Frage bleibt** (`fv_furniture_status` etc.) als Vorab-Filter, damit der Repeater nur erscheint, wenn nötig.
  - **Cost-Aggregation:** Die alten Felder `fv_*_cost_estimate_eur` (Summe) werden **automatisch berechnet** aus der Summe der Block-Costs. Können als read-only Anzeige bleiben oder ganz entfallen. PMS-Push: pro Block ein Eintrag in `propertyFinancials.costs.oneOff[]` mit Kategorie-Tag + Foto-Referenz.
- **Schema-Konsequenz:** Drei Step-Group-Definitionen (oder eine generische, parametrisierbar über `group_id`). Wenn das Step-Group-Konstrukt aus [10] sauber gebaut ist, sind das hier 4-Felder-Templates × 3 Gruppen = wenig Aufwand.
- **Konsistenz mit Multi-Select:** Wenn der Inspektor pro Status-Frage Multi-Select-Tags wie „Bathroom issues" wählt (Multi-Select aus [11]/[7]), könnten diese Tags **automatisch** als initiale Blöcke vorgeschlagen werden. Optional, später.
- **Status:** offen — derselbe Step-Group-Mechanismus wie Punkte [10] und [20]. Drei Konsumenten desselben Refactors.

### [20] „Property-specific check-out steps" — gleiche Step-Group-Mechanik wie Check-in
- **Beobachtung:** Aktuell ist `fv_checkout_property_specific_steps` ein einzelnes Textfeld mit Description „Skip if none". Joshua: soll wie Check-in (Punkt [10]) funktionieren — Inspektor fügt Steps als Blöcke hinzu, Anzahl ergibt sich aus der Anzahl der Blöcke.
- **Code:** `src/data/first-visit-questions.json:3151-3167` — slug `fv_checkout_property_specific_steps`, type `text`, scope `location`, phase 10 „Check-out arrangements", PMS-Target `houseRules.checkOutInstructions.description`.
- **Vorschlag-Skizze:**
  - Wiederverwendet die **gleiche `step-group`-Komponente** und das **gleiche `group_id`-Schema-Markierungs-Prinzip** aus Punkt [10].
  - Felder pro Check-out-Step (minimal): `step_name` (text), evtl. `media` (file).
  - PMS-Target wechselt zu `houseRules.checkOutInstructions.steps[].name` (proposed — GAP-Eintrag fällig, weil aktuell nur `.description` als freier Text existiert).
  - Storage analog Punkt [10]: `step_index` als zusätzliche Antwort-Koordinate.
- **Status:** offen — Sub-Task vom Step-Group-Refactor in Punkt [10]. Wenn Check-in step-group sauber implementiert ist, ist das hier ein zweiter Konsument.

### [19] „Trash disposal at check-out" ist Freitext, sollte Yes/No sein
- **Beobachtung:** `fv_checkout_trash_disposal` ist aktuell offenes Textfeld. Joshua: sollte einfach Yes/No sein.
- **Code:** `src/data/first-visit-questions.json:3135-3149` — type `text`, required `true`, scope `location`, phase 10 „Check-out arrangements", PMS-Target `houseRules.garbageDisposal.trashLocationInstructions.description`.
- **Achtung:** Das PMS-Target zeigt auf dasselbe `.description`-Feld wie `fv_trash_container_location` (`:1168`)! Wenn das Feld zu Boolean wird, passt das PMS-Target nicht mehr. Möglich:
  - Frage umdeuten zu „Are explicit check-out trash instructions required?" (Y/N) → PMS-Target wechselt z. B. zu `houseRules.checkOutInstructions.includeTrashInstructions [proposed]` (GAP-Eintrag fällig).
  - Oder Frage ganz streichen, weil die Trash-Instruktionen schon in Phase 5 erfasst werden — der Check-out-Bezug ist redundant.
- **Vorschlag:** Klarstellen mit Joshua, was die Y/N-Frage eigentlich aussagen soll (Hinweis im Check-out-Guide nötig? Oder Owner wünscht es?). Bis dahin: Type zu `boolean` setzen, Label leicht umformulieren („Include trash instructions in check-out guide?"), PMS-Target als GAP markieren.
- **Status:** offen — klein, aber braucht Klärung wegen PMS-Konflikt

### [17] House rules section ist komplett kaputt — Multi-Select + Custom-Add (wie Extra Services, plus „add own")
- **Beobachtung:** „House rules" Frage ist im aktuellen JSON gleich **mehrfach** defekt:
  - Slug enthält `(repeater)`: `fv_house_rule (repeater)` — gleiche Slug-Bug-Klasse wie Common Areas (Punkt [14]).
  - Label enthält `— repeater`: „House rules — repeater" — gleiches Strip-Pattern wie [6]/[14].
  - **Options sind kompletter Müll**: `["locale: en", "de"]` — XLSX-Übernahme-Fehler. Die Description erklärt, dass es eigentlich 8 vorausgefüllte Standard-Arbio-Regeln sein sollen (noise curfew, no unregistered guests, no pets, no parties, no smoking, respect check-in/out, dispose garbage, close windows). Davon ist nichts in `options`.
  - Type ist `select` (Single), `repeater: false` — sollte Multi-Select sein.
- **Code:** `src/data/first-visit-questions.json:1857-1876` — slug `fv_house_rule (repeater)`, pms_target `houseRules.additionalRules[]` (bereits array-shaped).
- **Joshua's Wunsch:** Gleiche Struktur wie Extra Services (Punkt [16]) — Multi-Select mit Pre-Population, **plus** zusätzlich: „Add new custom rule" (Tag-Input wie in Punkt [14]). Custom-Add ist **separat** von der Multi-Select-Liste.
- **Vorschlag-Skizze:**
  - Type → `multi_select` (gleicher Renderer wie [16]).
  - `options` korrekt befüllen mit den 8 Standard-Arbio-Regeln (aus der Description in den Optionen-Slot moven):
    - „Noise curfew (22:00–07:00)", „No unregistered guests", „No pets", „No parties", „No smoking", „Respect check-in/out times", „Dispose garbage in cans", „Close windows + turn off appliances before leaving"
  - **Custom-Add-UX** zusätzlich zur Auswahl: Tag-Input unterhalb der Liste mit „+ Add custom rule" — angelegte Rules erscheinen als zusätzliche Tags im `value`-Array und werden beim PMS-Push als freie Einträge in `houseRules.additionalRules[]` angehängt.
  - Schema-Erweiterung: optionales `allow_custom_options: true` Flag pro Frage. Render-Layer zeigt den Tag-Input nur dann.
  - Storage: `value = string[]` — gewählte Standard-Optionen UND custom-eingegebene Strings stehen gleichberechtigt im Array. Kein Sub-Field-Unterschied.
  - Per-option follow-up wie bei [16] hier vermutlich **nicht** nötig — eine Rule ist self-contained (kein „booking method"). Aber: Custom-eingegebene Rules haben sowieso schon den freien Text als ihre Beschreibung.
- **Bezug:** Punkt [14] (Common Areas) hat denselben Custom-Add-Bedarf. Beide nutzen dann das gleiche `allow_custom_options`-Flag.
- **Status:** offen — Inhalt der `options` muss aus der Description ins Schema gezogen werden (Daten-Migration, kein nur-UI-Fix). Gehört in den Multi-Select-Refactor-Plan.

### [16] „Extra services offered" → Multi-Select + automatisches Folgefeld pro Service
- **Beobachtung:** Aktuell zwei separate Fragen: `fv_extra_services_offered` (Single-Select aus 9 Optionen) und `fv_extra_services_booking_method` (einzelnes Freitext-Feld für ALLE gebuchten Services zusammen). Joshua möchte:
  - „Extra services offered" als **Multi-Select** (eine Property bietet üblich mehrere Services parallel).
  - Pro ausgewähltem Service automatisch ein eigenes **„Booking method"-Feld**, das angezeigt wird, sobald der Service aktiv ist.
- **Code:** `src/data/first-visit-questions.json:1789-1814` (offered, type `select`, Optionen `[Early check-in, Late check-out, Express cleaning, Baby bed, High chair, Parking, Breakfast, Airport transfer, None]`) und `:1816-1831` (booking method, type `text`, description „Per service" — Hinweis wurde nie umgesetzt).
- **Bezug:** Verwandt mit Punkten [7], [11], [13], [14] (Multi-Select + Conditional). Dies ist der **fortgeschrittenste** Fall: nicht ein Follow-up für die ganze Frage, sondern **ein Follow-up pro selektierter Option**.
- **Vorschlag-Skizze:**
  - `fv_extra_services_offered` → `type: "multi_select"`, Storage `value = string[]`.
  - `fv_extra_services_booking_method` deprecaten als Standalone-Frage; stattdessen Schema-Erweiterung am Multi-Select selbst:
    ```json
    "per_option_follow_up": {
      "label_template": "How can guests book ‚{option}'?",
      "type": "text",
      "required": false
    }
    ```
  - Render-Layer: Für jeden String in `value` wird unter der Multi-Select-Liste eine Textfeld-Zeile mit Label „How can guests book ‚Late check-out'?" gezeigt. Inspector füllt nur die aktiv ausgewählten Services aus.
  - Storage: erweiterte Antwort-Shape `{ value: string[], per_option: { "Late check-out": "via mobile app", "Parking": "phone +49 …" } }`. Backwards-compat: alte Antworten mit nur `value` bleiben gültig.
  - PMS-Mapping: aus `value`+`per_option` werden N Rows in `ExtraService[]` mit `{ name, bookingMethod }` aggregiert.
  - Option „None" sollte exklusiv sein: wenn ausgewählt, andere Auswahlen deaktivieren und keine Follow-ups rendern.
- **Status:** offen — das ist der **referenz-implementierende** Spezialfall des Multi-Select-mit-Conditional-Follow-up-Patterns. Sobald wir diesen sauber bauen, lösen wir [7], [11], [13], [14] mit dem gleichen Mechanismus.

### [15] Service-Provider-Symmetrie: Cleaning ✓, Laundry ✗, Hausmeister ✗ — Takeover- und Kontaktfeld vereinheitlichen
- **Beobachtung:** Es gibt drei Service-Provider-Bereiche, aber sie haben **nicht** die gleichen Fragen. Joshua möchte einheitliche Blöcke. Spezifisch:
  - **Cleaning:** Setup → Provider Name → **Takeover possible?** ✓ (`fv_cleaning_takeover_possible:1695`)
  - **Laundry:** Setup → Provider Name → Frequency → Laundromat — **kein** Takeover-Feld ✗
  - **Hausmeister:** Aktuell **nur eine Frage** (`fv_facility_manager_contact:1351`) mit Description „Opportunistic — only if encountered" und einzigem Textfeld für „contact". **Kein** Block mit Existenz/Name/Kontakt/Takeover ✗
  - Generell: keinem der drei Blöcke hat ein **separates Kontaktfeld** (Telefon/E-Mail). Provider-Name ist da, Kontakt fehlt.
- **Code:**
  - `src/data/first-visit-questions.json:1655-1714` — Cleaning-Trio.
  - `:1715-1769` — Laundry-Quartet (kein Takeover).
  - `:1350-1366` — Facility Manager als einzelnes Textfeld.
  - Description bei `:1607` bestätigt, dass „Hausmeister/property manager" als Domain-Quelle gilt — Block existiert konzeptionell, aber nicht im Schema.
- **Vorschlag-Skizze (symmetrisches Service-Provider-Pattern):**
  Jeder der drei Service-Provider-Blöcke bekommt dieselbe Frage-Skelett:
  1. `*_setup` (Select: External / In-house / Owner self-managed / Not yet set up / Doesn't apply)
  2. `*_provider_name` (Text — nur wenn external)
  3. `*_provider_contact` (Text — Telefon / E-Mail / Ansprechpartner; nur wenn external) ← **NEU für alle drei**
  4. `*_takeover_possible` (Yes / No / N/A) ← **NEU für Laundry + Hausmeister**

  Konkrete fehlende Fragen, die hinzugefügt werden müssen:
  - `fv_laundry_takeover_possible` — „Can Arbio take over existing laundry?" (Select Y/N/N-A; PMS-Target `operationalModel.laundryTakeoverPossible [proposed]`)
  - `fv_cleaning_provider_contact` — „Cleaning provider contact (phone / email)" (Text)
  - `fv_laundry_provider_contact` — „Laundry provider contact (phone / email)" (Text)
  - Hausmeister-Block (neu, 4 Fragen):
    - `fv_hausmeister_present` — „Building Hausmeister / facility manager present?" (Yes/No)
    - `fv_hausmeister_name` — „Hausmeister name" (Text, nur wenn present=Yes)
    - `fv_hausmeister_contact` — „Hausmeister contact (phone / email)" (Text, nur wenn present=Yes)
    - `fv_hausmeister_takeover_possible` — „Can Arbio take over existing Hausmeister relationship?" (Y/N/N-A)
    - Der bisherige `fv_facility_manager_contact:1351` würde durch diesen Block ersetzt (Schemaänderung). Migration: alte Werte ins neue `fv_hausmeister_contact` umkopieren.
- **PMS-Mapping:** muss in `src/lib/pms/data-point-mapping.json` (Onboarding_tool-Repo) gegen die Live-API-Schema-Felder geprüft werden. `propertyManagement.facilityManager` existiert bereits; `propertyManagement.laundryProvider.contact` / `cleaningProvider.contact` müssen ggf. als GAP eingetragen werden.
- **Bezug:** Punkt [12] (Facility Manager wichtig — wird durch diesen Block obsolet, weil Hausmeister jetzt explizit ausgefragt wird).
- **Status:** offen — Schema-Erweiterung. Drei Subtasks: (a) JSON neue Felder ergänzen, (b) `fv_facility_manager_contact` deprecaten + migrieren, (c) PMS-Mapping updaten. Eigener Plan-File, nicht im aktuellen Quick-Fix-Batch.

### [14] „Common areas / building facilities — repeater" — drei Probleme in einer Frage
- **Beobachtung:** Frage `Common areas / building facilities — repeater` ist nicht nur falsch benannt (Wort „repeater" im Label sichtbar), sondern auch:
  - Single-Select statt Multi-Select (Gebäude haben üblicherweise mehrere Common Areas).
  - Erste Option „type: Lobby" hat ein verirrtes `type:`-Präfix (XLSX-Bug).
  - Es fehlt eine UX für „eigene Kategorie anlegen" — z. B. wenn ein Gebäude einen ungewöhnlichen Common-Space hat, der nicht in der Liste steht.
- **Code:** `src/data/first-visit-questions.json:1444-1467` — slug `fv_common_area (repeater)` (das `(repeater)` ist sogar im Slug!), label `"Common areas / building facilities — repeater"`, type `select`, Optionen `["type: Lobby", "Rooftop", "Courtyard", "SmokingArea", "Other"]`, `repeater: false`.
- **Vorschlag-Skizze:**
  - Label säubern: „Common areas / building facilities" (—- repeater weg). Erweitert Punkt [6] um diesen Spec-Marker („— repeater" ebenfalls strippen).
  - „type: " aus erster Option entfernen.
  - Slug enthält `(repeater)` — als DB-Key wahrscheinlich schon in Verwendung, daher **nicht** ändern. Nur Anzeige säubern.
  - Type → Multi-Select (siehe Punkt [7]/[11]).
  - „Add own category" UX: Tag-Input — beim Tippen erscheint „+ Add ‚X' as new option". Neu erstellte Kategorien werden als Plain-Strings in `value` mitgegeben und beim PMS-Push als freie Tags an `commonAreas[]` angehängt.
- **Bezug:** Wahrscheinlich auch betroffen: weitere `select`-Fragen, die im Label „— repeater" tragen (grep auf das Wort gibt noch mehr). Untersuchen wenn Refactor läuft.
- **Status:** offen — Teil der Conditional-/Multi-Select-Refactor-Iteration (Punkte 7, 11, 14)

### [13] „Yes/No"-Fragen brauchen Conditional-Follow-up (generelles Prinzip)
- **Beobachtung:** Beispiel `Secondary fire exit available?` (boolean Yes/No, description: „Explain if yes") — wenn der Inspektor „Yes" wählt, muss er den Sekundär-Exit beschreiben können (wo, wie erreichbar). Aktuell gibt's kein Folge-Textfeld → die Antwort allein hat fast keinen Wert. Joshua: gilt generell für alle Yes/No-Fragen, bei denen mehr Kontext nötig ist, damit die Antwort verwertbar wird.
- **Code:** `src/data/first-visit-questions.json:1385-1402` — slug `fv_fire_exit_secondary`, type `boolean`, description „Explain if yes". Pattern wiederholt sich bei `fv_building_construction_nearby` (`:684`) und potenziell weiteren.
- **Bezug:** Verfeinerung / Generalisierung von Punkt [7]. Wir behandeln „Yes/No mit erklärtem Yes" und „Multi-Select mit Other" als zwei Spezialfälle desselben Conditional-Mechanismus.
- **Vorschlag-Skizze:**
  - Schema-Erweiterung: optionales `follow_up` Feld pro Frage, z. B.
    ```json
    "follow_up": {
      "when_value": true,            // oder ["Other"] für Multi-Select
      "label": "Where / how is it accessible?",
      "type": "text",
      "required": true               // optional
    }
    ```
  - Render-Layer: Wenn `value === follow_up.when_value` (oder das Multi-Select-Array enthält den Wert), erscheint unterhalb ein zweites Eingabefeld.
  - Storage: Antwort-Shape wird zu `{ value: true|false|string|string[], follow_up_text?: string }`.
  - Backwards-compat: alte Antworten (skalar) bleiben gültig.
  - Heuristik-Fallback ohne Schema-Edit: Wenn `description` mit „Explain if yes" / „If yes, …" / „Please describe" matcht, automatisch Follow-up rendern. So lange das XLSX-Schema nicht erweitert ist, ist das die schnellste Lösung.
- **Status:** offen — gebündelt mit Punkt [7] zu einer Conditional-Follow-up-Refactor-Iteration

### [11] „Waste separation streams" — Single-Select, sollte Multi-Select sein
- **Beobachtung:** `Waste separation streams` rendert aktuell als Single-Select-Dropdown. Eine Adresse hat aber typischerweise mehrere Streams gleichzeitig (Residual + Paper + Bio …) — Single-Select erzwingt nur eine Wahl. Joshua: muss Multi-Select sein.
- **Code:** `src/data/first-visit-questions.json:1222-1244` — slug `fv_waste_separation_streams`, `type: "select"`, Optionen `[Residual, Paper, Plastic-yellow, Glass, Bio, None required]`, scope `location`.
- **Verwandt:** Punkt [7]. Vermutlich sind weitere „Multi-Select-By-Intent"-Fragen aktuell Single-Select. Eine systematische Liste fehlt — kann beim Refactor pro Frage entschieden werden (z. B. `fv_building_amenities_verify`, „Building amenities").
- **Vorschlag:** Neuer `type: "multi_select"` (oder Convention: Liste in `value` statt Skalar). Render-Layer in `PrefilledField.tsx` muss diesen Typ als Checkbox-Liste ausgeben. Storage: `value = string[]`. PMS-Target `houseRules.garbageDisposal.wasteSeparationInfo` ist bereits ein Array-fähiges Feld.
- **Status:** offen — gebündelt mit Punkt [7] (Multi-Select-Refactor)

### [12] „Facility manager contact" ist als „opportunistic" markiert — sollte wichtig sein
- **Beobachtung:** Description sagt „Opportunistic — only if encountered", required: false. Joshua: „this is quite important", nicht opportunistisch.
- **Code:** `src/data/first-visit-questions.json:1350-1366` — slug `fv_facility_manager_contact`, `required: false`, description `"Opportunistic — only if encountered"`.
- **Vorschlag:**
  - Description umformulieren zu etwas wie „Try to obtain — important for ops handover" (oder lass Joshua den genauen Text setzen).
  - `required: true`? Joshua hat nicht explizit gesagt „verpflichtend ausfüllen" — eher: ernsthaft versuchen zu erfassen. Vermutlich besser **required: false + visuell hervorgehoben + Skip-Affordance verfügbar**, damit der Inspektor bewusst skippen kann statt es als „nicht wichtig" zu verstehen.
- **Offene Fragen:**
  - Joshua: required machen, oder nur Description aufwerten?
  - Exakter Description-Text gewünscht?
- **Status:** offen — kleiner Edit, Trivialer Quick-Fix möglich (entweder als JSON-Patch oder als questions.ts-Override-Map)

### [9] Phase-Wechsel scrollt nicht zum Section-Anfang
- **Beobachtung:** Nach Klick auf „Next →" oder „Skip to next incomplete" startet die neue Section dort, wo der Scroll-Position vorher war (oft mittendrin). Joshua möchte: jeder Phase-Wechsel = Section beginnt sichtbar am Anfang.
- **Code:** `UnitSurvey.tsx:72-74` — bestehender `useEffect` scrollt nur den **Section-Strip-Chip** ins Bild, nicht den Page-Content.
- **Lösung-Skizze:** Im selben Effekt zusätzlich `window.scrollTo({ top: 0, behavior: 'smooth' })` ODER besser einen Ref auf den `<section>`-Header setzen und `scrollIntoView({ block: 'start' })` darauf. Header ist sticky — also smooth scroll-to-top des Content-Wrappers.
- **Status:** an Subagent B vergeben (gebündelt mit Punkt 5, gleiches File)

---

## Agent-Status (für laufende parallele Implementierung)

- **Agent A (Punkte 1+6):** ✅ DONE — commit `7113a19`. `src/lib/firstVisit/questions.ts` + neuer Test `questions.transforms.test.ts`. Deal-Name-Frage ausgeblendet, „verify" aus Labels/Phasen/Descriptions gestrippt.
- **Agent B (Punkte 5+9):** ✅ DONE — commit `6758588`. `UnitSurvey.tsx` + neuer Test `UnitSurvey.lastPhase.test.tsx`. „Done — back to overview ↩" auf der letzten Phase, scroll-to-top via `scroll-mt-20`-Anker und `didMountRef`-Guard (kein Snap beim ersten Render).
- **Pending:** Punkt 2 (tab-index, mehrere Files), Punkt 3 (Go-live select), Punkt 7 + 11 (Multi-Select / Other / Explain-if-yes), Punkt 8 (Dimensions), Punkt 10 (Check-in step-group Redesign), Punkt 12 (Facility manager wichtig). Tab-Reihenfolge: springt auch auf Buttons / Info-Elemente
- **Beobachtung:** Beim Durchtabben springt der Fokus zu allen Buttons (Accept-Vorausfüllung, Skip, Add Photo/Video, Notiz-Toggle) und Info-Elementen. Joshua möchte, dass Tab **nur** Eingabefelder ansteuert (Inputs, Textareas, Selects).
- **Code:**
  - Im gesamten `src/` gibt es **keine** expliziten `tabIndex`-Werte (gegrept). Tab folgt dem Browser-Default → alle nativen Buttons / Links sind fokussierbar.
  - Potenziell betroffene Buttons (alle innerhalb des Frage-Containers):
    - `Accept`-Button im Pre-filled-Banner: `PrefilledField.tsx:141-150`
    - Yes/No-Toggles für `boolean`-Fragen: `PrefilledField.tsx:227-257` ← **Achtung**: das sind Eingabe-Surrogate, nicht „Action"-Buttons. Müssen fokussierbar bleiben (alternative: zu `<input type="radio">` umbauen).
    - `Undo`-Button im skipped-State: `PrefilledField.tsx:102-108`
    - Skip-Affordance: `src/components/firstVisit/SkipAffordance.tsx`
    - Add Photo / Add Video Buttons: `src/components/firstVisit/MediaButtons.tsx`
    - „Add note" / „Attach" Toggle: `src/components/firstVisit/AttachAffordance.tsx`
    - Section-Strip Phase-Buttons + „Skip to next incomplete": `UnitSurvey.tsx`
    - Header-Buttons (Sync now, Export, Pick another deal, Home): `VisitNavigator.tsx:438-450`
  - „Informationsfelder" konkret: das könnten die Pre-filled-Banner-Container sein (visuell prominent gelb), die als `<div>` selbst NICHT fokussierbar sind, aber den **Accept-Button** enthalten → der Button wird angesprungen, optisch wirkt es als würde der ganze Banner fokussiert.
- **Ursache (Hypothese):** Standard-Tab-Order zieht alle Buttons mit. Für den Field-Use-Case (schnell durch Eingabefelder eines Formulars wandern) zu viel.
- **Mögliche Maßnahme:**
  - `tabIndex={-1}` auf allen reinen Action-Buttons (Skip, Add Photo/Video, Note-Toggle, Accept, Section-Strip-Buttons, Header-Buttons), aber **nicht** auf Boolean-Yes/No (das sind Eingaben).
  - **a11y-Tradeoff:** Tastatur-Only-Nutzer würden die Buttons dann nur per direkter Maus/Touch / Shift-Tab-Wraparound erreichen. Akzeptabel, weil dies eine Mobile-First-Field-App ist; Desktop-Tastatur-Power-User sind nicht das Primärpublikum.
- **Offene Fragen:**
  - Soll Tab im Pre-filled-Fall stattdessen **direkt durch den Accept-Button laufen** (= bestätigen mit Enter ohne Maus), oder soll er ihn überspringen? Joshuas Aussage „nur Textfelder/Selects" → überspringen. Bestätigen?
  - Soll der Header (Sync now / Export) ebenfalls aus der Tab-Order raus? Vermutlich ja, weil er bei jeder ersten Tab-Aktion zuerst dran wäre.
- **Status:** offen
