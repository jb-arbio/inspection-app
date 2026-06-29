import OpenAI, { toFile } from 'openai';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';
import { loadOpenAIKey } from '@/lib/openaiKey';
import { ACCURATE_TRANSCRIBE_MODEL } from '@/lib/firstVisit/cleanupPrompt';

// Authoritative transcription for the section-voice flow: gpt-4o-transcribe on
// the recorded audio segment. The browser's Web Speech interim captions are a
// disposable preview; THIS transcript is what drives the field fill, so accuracy
// (incl. German/mixed) matters more than for per-field dictation.
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export async function POST(req: Request): Promise<Response> {
  const ctx = await getHubRouteContext(getHubSupabase());
  if (!ctx) return json({ error: 'unauth' }, 401);

  const form = await req.formData();
  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return json({ error: 'no audio' }, 400);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return json({ error: 'audio too large' }, 413);
  }

  loadOpenAIKey();
  if (!process.env.OPENAI_API_KEY) return json({ error: 'no key' }, 500);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const file = await toFile(audio, 'clip.webm', { type: 'audio/webm' });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: ACCURATE_TRANSCRIBE_MODEL,
    });
    return json({ text: (transcription.text ?? '').trim() });
  } catch (err) {
    console.error('Accurate transcription failed:', err);
    // Surface the real cause (e.g. model access, invalid key, audio rejected)
    // so failures are diagnosable instead of a generic "transcription failed".
    const e = err as { message?: string; code?: string; status?: number };
    return json(
      { error: 'transcription failed', detail: e?.message ?? String(err), code: e?.code ?? null },
      500,
    );
  }
}
