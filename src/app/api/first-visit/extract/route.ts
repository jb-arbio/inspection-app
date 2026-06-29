import OpenAI from 'openai';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';
import { loadOpenAIKey } from '@/lib/openaiKey';
import { EXTRACT_SYSTEM_PROMPT, EXTRACT_MODEL } from '@/lib/firstVisit/extractionPrompt';
import { buildExtractionSchema } from '@/lib/firstVisit/extractionSchema';
import { validateExtraction } from '@/lib/firstVisit/validateExtraction';

// Section-voice extraction: map a cleaned transcript onto a SCOPED set of field
// slugs, constrained to each field's allowed values, validated before return.
export const maxDuration = 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// Degrade gracefully: a model/parse failure returns empty (not 500) so the
// client falls back to manual entry instead of hard-erroring mid-walkthrough.
const empty = (warnings: string[]) => json({ singles: {}, items: [], summary: null, warnings });

export async function POST(req: Request): Promise<Response> {
  const ctx = await getHubRouteContext(getHubSupabase());
  if (!ctx) return json({ error: 'unauth' }, 401);

  let body: { text?: unknown; targetSlugs?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const targetSlugs = Array.isArray(body.targetSlugs)
    ? body.targetSlugs.filter((s): s is string => typeof s === 'string')
    : [];
  if (targetSlugs.length === 0) return json({ error: 'no targetSlugs' }, 400);
  if (!text) return empty(['empty transcript']);

  const { schema, catalogue } = buildExtractionSchema(targetSlugs);

  loadOpenAIKey();
  if (!process.env.OPENAI_API_KEY) return json({ error: 'no key' }, 500);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let parsed: unknown;
  try {
    const completion = await openai.chat.completions.create({
      model: EXTRACT_MODEL,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'section_extraction', strict: true, schema },
      },
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
        { role: 'user', content: `Fields catalogue:\n${catalogue}\n\nTranscript:\n${text}` },
      ],
    });
    const out = completion.choices[0]?.message?.content;
    parsed = out ? JSON.parse(out) : null;
  } catch (err) {
    console.error('Extraction failed:', err);
    const detail = err instanceof Error ? err.message : String(err);
    return empty(['extraction failed', detail]);
  }

  const result = validateExtraction(parsed, targetSlugs);
  return json(result);
}
