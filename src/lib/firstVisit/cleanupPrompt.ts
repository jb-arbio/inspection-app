// System prompt for the gpt-4o-mini cleanup pass. Tidy ONLY — never summarize.
export const CLEANUP_SYSTEM_PROMPT = [
  'You clean up dictated inspection notes. The text is a raw speech-to-text',
  'transcript from a property inspector. Return the same content, tidied:',
  '- Fix punctuation and capitalization.',
  '- Remove filler ("um", "äh", "you know", false starts, repeated words).',
  '- Correct obvious transcription errors using context.',
  '- Keep the inspector\'s exact meaning and every concrete detail (numbers,',
  '  locations, object names). Do NOT summarize, shorten, or omit anything.',
  '- Keep the original language (German, English, or mixed — as spoken).',
  '- Return only the cleaned text, no preamble, no quotes.',
].join('\n');

export const CLEANUP_MODEL = 'gpt-4o-mini';
export const TRANSCRIBE_MODEL = 'whisper-1';
