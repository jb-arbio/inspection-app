import { localDb } from './db';
import { PHASES, ALL_QUESTIONS } from './questions';
import { QUESTION_STRUCTURE } from './questionStructure';
import {
  buildSurveyConfig,
  type ContentConfig,
  type StructureOverlay,
} from './surveyConfig';
import { validateSurveyContent } from './validateSurveyContent';
import type { SurveyConfig } from './SurveyConfigContext';

const TEMPLATE_KEY = 'first_visit';

// The bundled fallback: the survey config compiled into the app at build time.
// Used whenever we cannot obtain a valid published config (offline + no cache,
// invalid published content, or any unexpected failure). It carries no version
// so callers can tell it apart from a published config.
const SEED: SurveyConfig = { phases: PHASES, allQuestions: ALL_QUESTIONS };

type LoadOpts = {
  online?: boolean;
  version?: number;
  fetchImpl?: typeof fetch;
  db?: typeof localDb;
  // The structural overlay to compose + validate published content against.
  // Defaults to the bundled QUESTION_STRUCTURE; injectable for testing.
  overlay?: StructureOverlay;
};

// Compose a raw ContentConfig into a renderable SurveyConfig, validating first.
// Returns null if the content is structurally invalid — the caller falls back
// to SEED so we never render a broken published config.
function composeIfValid(
  content: ContentConfig,
  version: number,
  overlay: StructureOverlay,
): SurveyConfig | null {
  const { ok } = validateSurveyContent(content, overlay);
  if (!ok) return null;
  const phases = buildSurveyConfig(content, overlay);
  return {
    phases,
    allQuestions: phases.flatMap((p) => p.questions),
    version,
  };
}

// Read the best cached config and compose it. With a pinned `version`, fetch
// that exact row; otherwise pick the highest cached version. Returns null when
// no usable (present + valid) cache row exists.
async function fromCache(
  db: typeof localDb,
  overlay: StructureOverlay,
  version?: number,
): Promise<SurveyConfig | null> {
  let row;
  if (typeof version === 'number') {
    row = await db.surveyConfig.get([TEMPLATE_KEY, version]);
  } else {
    const rows = (await db.surveyConfig.toArray()).filter(
      (r) => r.template_key === TEMPLATE_KEY,
    );
    if (rows.length === 0) return null;
    row = rows.reduce((max, r) => (r.version > max.version ? r : max));
  }
  if (!row) return null;
  return composeIfValid(row.content_json as ContentConfig, row.version, overlay);
}

/**
 * Load the active survey config for the first-visit survey.
 *
 * Strategy (always defensive — any failure degrades to SEED, never throws):
 *  - Online: fetch the published config. If present, cache it, then validate +
 *    compose. Invalid published content → SEED. Fetch failure / null content →
 *    fall through to cache, then SEED.
 *  - Offline: read the cache (pinned version or highest cached). Valid row →
 *    compose; otherwise SEED.
 */
export async function loadActiveSurveyConfig(
  opts: LoadOpts = {},
): Promise<SurveyConfig> {
  const db = opts.db ?? localDb;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const overlay = opts.overlay ?? QUESTION_STRUCTURE;
  const online =
    opts.online ??
    (typeof navigator !== 'undefined' ? navigator.onLine : true);

  try {
    if (online) {
      try {
        const url =
          '/api/first-visit/survey-config' +
          (typeof opts.version === 'number' ? `?version=${opts.version}` : '');
        const res = await fetchImpl(url);
        const data = (await res.json()) as {
          version: number | null;
          content: ContentConfig | null;
        };
        if (data && data.content && typeof data.version === 'number') {
          // Cache the freshly published config for offline use.
          await db.surveyConfig.put({
            template_key: TEMPLATE_KEY,
            version: data.version,
            content_json: data.content,
            cached_at: new Date().toISOString(),
          });
          const composed = composeIfValid(data.content, data.version, overlay);
          // Invalid published content: defensively render SEED rather than a
          // broken config.
          return composed ?? SEED;
        }
        // Null content (no published config yet): fall through to cache/seed.
      } catch {
        // Network/parse failure: fall through to cache/seed.
      }
    }

    const cached = await fromCache(db, overlay, opts.version);
    return cached ?? SEED;
  } catch {
    return SEED;
  }
}
