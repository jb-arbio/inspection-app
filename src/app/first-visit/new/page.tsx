import Link from 'next/link';
import DealPicker from './DealPicker';
import { listFirstVisitDeals } from '@/lib/firstVisit/deals';

export const dynamic = 'force-dynamic';

export default async function NewVisitPage() {
  // Query the hub directly — never fetch our own API route from a server
  // component (it's behind auth middleware and needs an absolute URL, which
  // crashed prod). listFirstVisitDeals never throws, so this page can't 500.
  const deals = await listFirstVisitDeals();
  return (
    <main className="mx-auto max-w-md p-6">
      <Link
        href="/first-visit"
        className="mb-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
      >
        ← Back to my visits
      </Link>
      <h1 className="text-xl font-semibold">Pick a deal</h1>
      <DealPicker deals={deals} />
    </main>
  );
}
