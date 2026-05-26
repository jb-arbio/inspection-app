# First Visit — Storage Bucket Setup (manual)

Run in the Onboarding_tool Supabase project, Studio → Storage → New bucket.

| Bucket | Public | Max file size |
|---|---|---|
| `first-visit-photos` | No | 25 MB |
| `first-visit-videos` | No | 200 MB |
| `first-visit-audio` | No | 25 MB |

For each bucket:
- Storage → bucket → Policies → New policy → `INSERT` allowed for authenticated where `onboarding.is_staff()`.
- Same for `SELECT` and `UPDATE`.

Path conventions:
- photos: `{inspection_id}/{answer_id|area_key}/{media_id}.jpg`
- videos: `{inspection_id}/{answer_id|area_key}/{media_id}.{mp4|webm}`
- audio:  `{inspection_id}/{answer_id|area_key}/{media_id}.webm`
