// Client calls for the section-voice flow: accurate transcription of a recorded
// segment, then scoped extraction of structured fields from that transcript.
import type { ValidatedExtraction } from './validateExtraction';

// Authoritative transcript for the fill (gpt-4o-transcribe). Throws on failure.
export async function postTranscribeAccurate(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'clip.webm');
  const res = await fetch('/api/first-visit/transcribe-accurate', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`transcribe-accurate failed: ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return data.text ?? '';
}

// Map a transcript onto a scoped set of field slugs. The route degrades to an
// empty result rather than erroring, so callers can treat any return as usable.
export async function postVoiceExtraction(
  text: string,
  targetSlugs: string[],
): Promise<ValidatedExtraction> {
  const res = await fetch('/api/first-visit/extract', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, targetSlugs }),
  });
  if (!res.ok) throw new Error(`extract failed: ${res.status}`);
  return (await res.json()) as ValidatedExtraction;
}
