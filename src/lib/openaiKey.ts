import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Lazily populate process.env.OPENAI_API_KEY from a local .env.local when the
// platform hasn't injected it (dev / some CI). No-op if already set. Extracted
// verbatim from the legacy recordings route so both transcription paths share it.
export function loadOpenAIKey(): void {
  if (process.env.OPENAI_API_KEY) return;
  const cwd = process.cwd();
  const possiblePaths = [
    resolve(cwd, '.env.local'),
    resolve(cwd, 'inspection-app', '.env.local'),
  ];
  for (const envPath of possiblePaths) {
    if (!existsSync(envPath)) continue;
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
    if (match) {
      process.env.OPENAI_API_KEY = match[1].trim();
      return;
    }
  }
}
