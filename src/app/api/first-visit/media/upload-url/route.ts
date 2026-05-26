import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { randomUUID } from 'crypto';

const BUCKETS: Record<string, string> = {
  photo: 'first-visit-photos',
  video: 'first-visit-videos',
  audio: 'first-visit-audio',
};
const EXTS: Record<string, string> = {
  photo: 'jpg',
  video: 'mp4',
  audio: 'webm',
};

export async function POST(req: Request) {
  const supabase = getHubSupabase();
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { inspection_id, kind, content_hash } = await req.json();
  const bucket = BUCKETS[kind];
  if (!bucket) return NextResponse.json({ error: 'bad-kind' }, { status: 400 });

  const media_id = randomUUID();
  const path = `${inspection_id}/${media_id}.${EXTS[kind]}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    media_id,
    storage_path: path,
    bucket,
    signed_url: data.signedUrl,
    token: data.token,
    content_hash,
  });
}
