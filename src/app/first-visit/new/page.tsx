import DealPicker from './DealPicker';

export const dynamic = 'force-dynamic';

async function getDeals() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/first-visit/deals`,
    { cache: 'no-store' },
  );
  if (!res.ok) return [];
  const { deals } = await res.json();
  return deals as { id: string; name: string }[];
}

export default async function NewVisitPage() {
  const deals = await getDeals();
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Pick a deal</h1>
      <DealPicker deals={deals} />
    </main>
  );
}
