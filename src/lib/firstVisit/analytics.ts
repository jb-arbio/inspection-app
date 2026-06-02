type Props = Record<string, unknown>;

const ENABLED = !!process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;

export function track(event: string, props: Props = {}) {
  if (!ENABLED) {
    if (process.env.NODE_ENV !== 'production') console.debug('[track]', event, props);
    return;
  }
  fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, props, ts: Date.now() }),
    keepalive: true,
  }).catch(() => {});
}
