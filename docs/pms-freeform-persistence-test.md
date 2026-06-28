# PMS freeform-persistence test (5 minutes, for the PMS owner)

**Question this answers:** when we send a *custom* key inside a freeform PMS bucket (`profile` / `houseRules` / `operationalInfo`), does the PMS **persist** it, or silently strip it on save?

This single yes/no decides whether **53 first-visit fields** can be pushed to the PMS (as freeform keys) or must stay hub-only. The PMS OpenAPI declares these buckets as `additionalProperties: {type: object}` (i.e. *should* accept arbitrary object-valued keys), but only the live backend can confirm it keeps them.

> ⚠️ The unit write endpoint is **PUT** (full replace), so **run this against a throwaway/test unit**, not a live one. The round-trip below reads the record first and writes it back unchanged except for one probe key.

```bash
BASE="https://pms.dev.arbio.io"
TOKEN="<PMS bearer token — you supply>"
UID="<resourceId of a TEST unit>"

# 1) read current record
curl -s "$BASE/api/v0/units/$UID" -H "Authorization: Bearer $TOKEN" > unit.json

# 2) inject one probe key into the freeform houseRules bucket (value must be an object)
jq '.property.houseRules.arbioPersistProbe = {value:"persist-check-123"}' unit.json > unit_patched.json

# 3) write it back (PUT = full replace — that's why we send the whole object)
curl -s -X PUT "$BASE/api/v0/units/$UID" \
  -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" \
  --data @unit_patched.json > /dev/null

# 4) read again and check whether the probe survived
curl -s "$BASE/api/v0/units/$UID" -H "Authorization: Bearer $TOKEN" \
  | jq '.property.houseRules.arbioPersistProbe'
```

**Interpreting the result:**
- Returns `{ "value": "persist-check-123" }` → **persisted.** All 53 freeform fields are safe to push as structured keys. ✅
- Returns `null` (or key absent) → **stripped.** Those 53 stay hub-only (no PMS push); still fine for prefill + internal reporting.

**Caveat:** the GET (read) model can differ from the PUT (write) model. If the unit GET doesn't echo `property.houseRules` freeform keys at all, re-check via whichever endpoint returns `houseRules` for that record (e.g. the listing-info read) before concluding it was stripped.
