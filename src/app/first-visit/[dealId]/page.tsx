import StartVisit from './StartVisit';

export const dynamic = 'force-dynamic';

async function getSnapshot(dealId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/first-visit/deals/${dealId}/snapshot`,
    { cache: 'no-store' },
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function DealPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const snap = await getSnapshot(dealId);
  if (!snap) return <main className="p-6">Deal not found.</main>;
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">{snap.deal?.name ?? dealId}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Start a visit, then add the properties and units you inspect on-site.
      </p>
      <StartVisit dealId={dealId} />
    </main>
  );
}
