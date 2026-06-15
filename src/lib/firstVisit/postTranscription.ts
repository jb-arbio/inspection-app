// Upload a recorded clip and return the cleaned transcript. Throws on failure
// so the caller can surface an error toast and leave the field untouched.
export async function postTranscription(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'clip.webm');
  const res = await fetch('/api/first-visit/transcribe', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`transcribe failed: ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return data.text ?? '';
}
