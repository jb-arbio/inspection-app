import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { getHubRouteContext } from '@/lib/firstVisit/hubSupabaseAdmin';

export async function POST(req: Request) {
  const auth = await getHubRouteContext(getHubSupabase());
  if (!auth) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  const { supabase } = auth;

  const m = await req.json();
  const BUCKETS: Record<string, string> = {
    photo: 'first-visit-photos',
    video: 'first-visit-videos',
    audio: 'first-visit-audio',
  };

  // Verify upload exists in storage (HEAD via list).
  const folder = m.storage_path.split('/').slice(0, -1).join('/');
  const filename = m.storage_path.split('/').pop();
  const { data: listed, error: listErr } = await supabase.storage
    .from(BUCKETS[m.kind])
    .list(folder, { search: filename });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const match = listed?.find((f) => f.name === filename);
  if (!match) return NextResponse.json({ error: 'not-uploaded' }, { status: 400 });
  // Storage list returns metadata in `metadata.size` for newer SDKs.
  const sizeOk = !m.size_bytes || match.metadata?.size === m.size_bytes;
  if (!sizeOk) return NextResponse.json({ error: 'size-mismatch' }, { status: 400 });

  const { error } = await supabase.from('first_visit_media').insert({
    id: m.id,
    inspection_id: m.inspection_id,
    answer_id: m.answer_id ?? null,
    area_key: m.area_key,
    question_key: m.question_key ?? null,
    kind: m.kind,
    storage_path: m.storage_path,
    content_hash: m.content_hash,
    size_bytes: m.size_bytes,
    captured_at: m.captured_at,
    uploaded_at: new Date().toISOString(),
    verified_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
