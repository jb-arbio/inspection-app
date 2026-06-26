// Auto-generates the seed content JSON + structure overlay from the CURRENT
// transform-based PHASES build. Partitions every question into:
//   - content  → src/data/first-visit-content.json  (editor-safe fields)
//   - overlay  → src/lib/firstVisit/questionStructure.ts  (wiring fields)
//
// Run: npx tsx scripts/gen-survey-content.mjs
// This is a one-time seed; questionStructure.ts is hand-maintained afterwards.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PHASES, CONFIG_META } from '../src/lib/firstVisit/questions.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Content keys: only the editor-safe fields, emitted only when not undefined.
const CONTENT_KEYS = [
  'slug', 'label', 'description', 'scope', 'type', 'options', 'required',
  'multi_select', 'allow_custom_options', 'phase_id', 'phase_label',
];

// Structural defaults — overlay omits a key when its value equals the default.
const STRUCTURAL_DEFAULTS = {
  mode: 'data',
  repeater: false,
  pms_target: null,
  status: 'existing',
  verdict: null,
  notes: null,
};
const DEFAULT_KEYS = Object.keys(STRUCTURAL_DEFAULTS);
// Overlay keys NOT in the defaults set — included whenever not undefined
// (so an explicit group_id:null survives).
const EXTRA_OVERLAY_KEYS = [
  'group_id', 'follow_up', 'per_option_follow_up', 'anchor_to',
];

const contentPhases = [];
const overlay = {};

for (const phase of PHASES) {
  const questions = [];
  for (const q of phase.questions) {
    // --- content ---
    const c = {};
    for (const k of CONTENT_KEYS) {
      if (q[k] !== undefined) c[k] = q[k];
    }
    questions.push(c);

    // --- overlay ---
    const entry = {};
    for (const k of DEFAULT_KEYS) {
      if (q[k] !== undefined && q[k] !== STRUCTURAL_DEFAULTS[k]) entry[k] = q[k];
    }
    for (const k of EXTRA_OVERLAY_KEYS) {
      if (q[k] !== undefined) entry[k] = q[k];
    }
    if (Object.keys(entry).length > 0) overlay[q.slug] = entry;
  }
  contentPhases.push({ id: phase.id, label: phase.label, questions });
}

// version/generated_at live on the content file (the source of truth) — carry
// them forward so regenerating the seed never drops CONFIG_META metadata.
const content = {
  version: CONFIG_META.version,
  generated_at: CONFIG_META.generated_at,
  phases: contentPhases,
};

const contentPath = join(root, 'src/data/first-visit-content.json');
writeFileSync(contentPath, JSON.stringify(content, null, 2) + '\n');

const overlayJson = JSON.stringify(overlay, null, 2);
const overlayFile =
  `// AUTO-GENERATED SEED (scripts/gen-survey-content.mjs) — then hand-maintained.\n` +
  `// The structural overlay: per-slug wiring fields composed onto the editable\n` +
  `// content by buildSurveyConfig(). Edit by hand after the initial seed.\n` +
  `import type { StructureOverlay } from './surveyConfig';\n\n` +
  `export const QUESTION_STRUCTURE: StructureOverlay = ${overlayJson};\n`;
const overlayPath = join(root, 'src/lib/firstVisit/questionStructure.ts');
writeFileSync(overlayPath, overlayFile);

console.log(`content phases: ${contentPhases.length}`);
console.log(`content questions: ${contentPhases.reduce((n, p) => n + p.questions.length, 0)}`);
console.log(`overlay slugs: ${Object.keys(overlay).length}`);
