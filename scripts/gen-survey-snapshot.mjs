// Run: npx tsx scripts/gen-survey-snapshot.mjs
import { writeFileSync } from 'node:fs';
import { ALL_QUESTIONS } from '../src/lib/firstVisit/questions.ts';
const out = new URL('../src/lib/firstVisit/__tests__/__fixtures__/all-questions.snapshot.json', import.meta.url);
writeFileSync(out, JSON.stringify(ALL_QUESTIONS, null, 2) + '\n');
console.log(`wrote ${ALL_QUESTIONS.length} questions`);
