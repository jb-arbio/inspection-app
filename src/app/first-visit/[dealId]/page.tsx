import UnitPicker from './UnitPicker';

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
      <UnitPicker dealId={dealId} snapshot={snap} />
    </main>
  );
}
