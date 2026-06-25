// Generates the editor content JSON + structural overlay from the authoritative
// redesign spec (scripts/redesign/rows.mjs).
//   content → src/data/first-visit-content.json   (editor-safe fields)
//   overlay → src/lib/firstVisit/questionStructure.ts  (wiring fields)
// Run: node scripts/redesign/gen.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PHASES, VERSION } from './rows.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

const contentPhases = [];
const overlay = {};
const seen = new Set();

for (const phase of PHASES) {
  const questions = [];
  for (const q of phase.questions) {
    if (seen.has(q.slug)) throw new Error(`duplicate slug: ${q.slug}`);
    seen.add(q.slug);

    // --- content (editor-safe) ---
    const c = {
      slug: q.slug,
      label: q.label,
      description: q.description ?? null,
      scope: phase.scope,
      type: q.type,
      options: q.options ?? [],
      required: !!q.required,
    };
    if (q.multi_select) c.multi_select = true;
    if (q.allow_custom_options) c.allow_custom_options = true;
    c.phase_id = phase.id;
    c.phase_label = phase.label;
    questions.push(c);

    // --- overlay (wiring) ---
    const entry = {};
    if (q.mode && q.mode !== 'data') entry.mode = q.mode;
    if (q.pms_target != null) entry.pms_target = q.pms_target;
    if (q.status && q.status !== 'existing') entry.status = q.status;
    if (q.group_id) entry.group_id = q.group_id;
    if (q.follow_up) entry.follow_up = q.follow_up;
    if (q.per_option_follow_up) entry.per_option_follow_up = q.per_option_follow_up;
    if (q.anchor_to) entry.anchor_to = q.anchor_to;
    if (q.visible_when) entry.visible_when = q.visible_when;
    if (Object.keys(entry).length > 0) overlay[q.slug] = entry;
  }
  contentPhases.push({ id: phase.id, label: phase.label, questions });
}

const content = {
  version: VERSION,
  generated_at: process.env.GEN_AT ?? null,
  phases: contentPhases,
};

writeFileSync(
  join(root, 'src/data/first-visit-content.json'),
  JSON.stringify(content, null, 2) + '\n',
);

const overlayJson = JSON.stringify(overlay, null, 2);
const overlayFile =
  `// AUTO-GENERATED from scripts/redesign/rows.mjs (First-Visit V1 Redesign).\n` +
  `// Structural overlay: per-slug wiring fields (gates, repeaters, media, PMS)\n` +
  `// composed onto editor content by buildSurveyConfig(). Re-run the generator\n` +
  `// after editing rows.mjs; PMS targets are a separate hub follow-up.\n` +
  `import type { StructureOverlay } from './surveyConfig';\n\n` +
  `export const QUESTION_STRUCTURE: StructureOverlay = ${overlayJson};\n`;
writeFileSync(join(root, 'src/lib/firstVisit/questionStructure.ts'), overlayFile);

const total = contentPhases.reduce((n, p) => n + p.questions.length, 0);
console.log(`content phases: ${contentPhases.length}`);
console.log(`content questions: ${total}`);
console.log(`overlay slugs: ${Object.keys(overlay).length}`);
